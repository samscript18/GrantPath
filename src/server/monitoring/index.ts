import { db } from "@/lib/db";
import { DomainInputError } from "@/lib/errors";
import { requireOperator, type Actor } from "@/server/accounts/auth";
import { scholarshipDataSchema } from "@/server/scholarships/schema";
import { publishScholarship, semanticHash } from "@/server/scholarships/publish";
import { extractSource } from "./adapters";
import { supportedSources, validateSourceUrl } from "./network";
import type { Prisma } from "@/generated/prisma/client";
import type { Rule } from "@/server/eligibility/rules";
export async function registerSource(
  actor: Actor,
  input: {
    scholarshipId: string;
    url: string;
    adapter: string;
    cadenceHours: number;
    reason: string;
  },
) {
  requireOperator(actor);
  validateSourceUrl(input.url, input.adapter);
  if (!Number.isInteger(input.cadenceHours) || input.cadenceHours < 24 || input.cadenceHours > 720)
    throw new Error("Supported cadence is 24–720 hours.");
  if (input.reason.trim().length < 10) throw new Error("Record the policy review reason.");
  await db().scholarship.findUniqueOrThrow({ where: { id: input.scholarshipId } });
  return db().$transaction(async (tx) => {
    const source = await tx.source.create({
      data: {
        scholarshipId: input.scholarshipId,
        url: input.url,
        adapter: input.adapter,
        cadenceHours: input.cadenceHours,
        enabled: false,
        health: "policy_review",
      },
    });
    await tx.audit.create({
      data: {
        actorId: actor.id,
        action: "source.register",
        recordId: source.id,
        reason: input.reason,
      },
    });
    return source;
  });
}
export async function configureSource(
  actor: Actor,
  sourceId: string,
  input: { enabled: boolean; cadenceHours: number; reason: string },
) {
  requireOperator(actor);
  if (
    input.reason.trim().length < 10 ||
    !Number.isInteger(input.cadenceHours) ||
    input.cadenceHours < 24 ||
    input.cadenceHours > 720
  )
    throw new Error("Provide a policy review reason and a 24–720 hour cadence.");
  const source = await db().source.findUniqueOrThrow({ where: { id: sourceId } });
  validateSourceUrl(source.url, source.adapter);
  return db().$transaction(async (tx) => {
    const next = await tx.source.update({
      where: { id: sourceId },
      data: {
        enabled: input.enabled,
        cadenceHours: input.cadenceHours,
        health: input.enabled ? "ready" : "paused",
      },
    });
    await tx.audit.create({
      data: {
        actorId: actor.id,
        action: "source.configure",
        recordId: sourceId,
        before: { enabled: source.enabled, cadenceHours: source.cadenceHours },
        after: input,
        reason: input.reason,
      },
    });
    return next;
  });
}
export async function requestCheck(actor: Actor, sourceId: string) {
  requireOperator(actor);
  const source = await db().source.findUniqueOrThrow({ where: { id: sourceId } });
  validateSourceUrl(source.url, source.adapter);
  return db().$transaction(async (tx) => {
    const updated = await tx.source.update({
      where: { id: sourceId },
      data: { requestedAt: new Date() },
    });
    await tx.audit.create({
      data: {
        actorId: actor.id,
        action: "source.request-check",
        recordId: sourceId,
        reason: "Operator requested a bounded manual check. Fetching runs outside the web request.",
      },
    });
    return updated;
  });
}
export async function recordSourceFailure(
  sourceId: string,
  message: string,
  status?: number,
  leaseToken?: string,
  now = new Date(),
  observationId?: string,
) {
  const [recent, source] = await Promise.all([
    db().observation.findMany({
      where: { sourceId, state: { not: "fetching" } },
      orderBy: { attemptedAt: "desc" },
      take: 2,
      select: { state: true },
    }),
    db().source.findUniqueOrThrow({ where: { id: sourceId } }),
  ]);
  const failures = recent.every((o) => o.state === "failed") ? recent.length + 1 : 1;
  const retryMs = failures >= 3 ? source.cadenceHours * 3600000 : failures === 2 ? 1800000 : 300000;
  return db().$transaction(async (tx) => {
    const owned = await tx.source.updateMany({
      where: { id: sourceId, ...(leaseToken ? { leaseToken } : {}) },
      data: {
        lastAttemptAt: observationId ? source.lastAttemptAt || now : now,
        health: failures >= 3 ? "needs_attention" : "unavailable",
        lockedUntil: null,
        leaseToken: null,
        requestedAt: null,
        nextCheckAt: new Date(now.getTime() + retryMs),
      },
    });
    if (!owned.count) return { state: "stale" as const };
    const data = { state: "failed", error: message.slice(0, 1000), httpStatus: status };
    if (observationId)
      await tx.observation.update({
        where: { id: observationId, sourceId, state: "fetching" },
        data,
      });
    else await tx.observation.create({ data: { ...data, sourceId, attemptedAt: now } });
    return { state: "failed" as const };
  });
}
export async function processSourceHtml(
  sourceId: string,
  html: string,
  options: { now?: Date; leaseToken?: string; controlled?: boolean; observationId?: string } = {},
) {
  if (options.controlled && process.env.APP_ENV !== "test")
    throw new Error("Controlled snapshots are restricted to isolated tests.");
  const now = options.now || new Date();
  const source = await db().source.findUniqueOrThrow({
    where: { id: sourceId },
    include: { scholarship: { include: { versions: { orderBy: { number: "desc" }, take: 1 } } } },
  });
  if (!supportedSources[source.adapter]) throw new Error("Unsupported adapter.");
  const accepted = scholarshipDataSchema.parse(source.scholarship.versions[0].data);
  let extracted;
  try {
    extracted = extractSource(source.adapter, html, accepted, source.url, now);
  } catch (e) {
    return recordSourceFailure(
      sourceId,
      e instanceof Error ? e.message : "Extraction failed",
      undefined,
      options.leaseToken,
      now,
      options.observationId,
    );
  }
  const hash = semanticHash(extracted.facts);
  return db().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${source.scholarshipId}))`;
    const current = await tx.scholarship.findUniqueOrThrow({ where: { id: source.scholarshipId } });
    if (current.version !== source.scholarship.version) return { state: "stale" as const };
    const updated = await tx.source.updateMany({
      where: { id: sourceId, ...(options.leaseToken ? { leaseToken: options.leaseToken } : {}) },
      data: {
        health: "healthy",
        lastAttemptAt: options.observationId ? source.lastAttemptAt || now : now,
        lastSuccessAt: now,
        nextCheckAt: new Date(now.getTime() + source.cadenceHours * 3600000),
        requestedAt: null,
        lockedUntil: null,
        leaseToken: null,
      },
    });
    if (!updated.count) return { state: "stale" as const };
    const unchanged = accepted.sourceFacts && semanticHash(accepted.sourceFacts) === hash;
    const observationData = {
      state: unchanged ? "unchanged" : "review",
      httpStatus: 200,
      hash,
      candidate: {
        facts: extracted.facts,
        warnings: extracted.warnings,
      } as Prisma.InputJsonValue,
      excerpt: extracted.excerpt,
      succeededAt: now,
    };
    const observation = options.observationId
      ? await tx.observation.update({
          where: { id: options.observationId, sourceId, state: "fetching" },
          data: observationData,
        })
      : await tx.observation.create({ data: { ...observationData, sourceId, attemptedAt: now } });
    if (unchanged) return { state: "unchanged" as const, observationId: observation.id };
    const review = await tx.review.upsert({
      where: {
        scholarshipId_baseVersion_fingerprint: {
          scholarshipId: source.scholarshipId,
          baseVersion: current.version,
          fingerprint: hash,
        },
      },
      create: {
        scholarshipId: source.scholarshipId,
        observationId: observation.id,
        baseVersion: current.version,
        candidate: extracted.candidate as Prisma.InputJsonValue,
        fingerprint: hash,
      },
      update: {},
    });
    return { state: "review" as const, reviewId: review.id, observationId: observation.id };
  });
}
export async function decideReview(
  actor: Actor,
  id: string,
  input: {
    decision: "accept" | "reject";
    reason: string;
    confirmedFields: string[];
    candidate?: unknown;
    sameCycleConfirmed?: boolean;
  },
) {
  requireOperator(actor);
  if (input.reason.trim().length < 10)
    throw new Error("Explain the review decision in at least 10 characters.");
  const review = await db().review.findUniqueOrThrow({ where: { id } });
  if (review.state !== "pending") return { state: review.state, changed: false };
  if (input.decision === "reject") {
    return db().$transaction(async (tx) => {
      const updated = await tx.review.updateMany({
        where: { id, state: "pending" },
        data: { state: "rejected", reason: input.reason, actorId: actor.id, decidedAt: new Date() },
      });
      if (updated.count)
        await tx.audit.create({
          data: {
            actorId: actor.id,
            action: "review.reject",
            recordId: review.scholarshipId,
            reason: input.reason,
          },
        });
      return { state: "rejected", changed: false };
    });
  }
  if (input.sameCycleConfirmed !== true)
    throw new DomainInputError(
      "Confirm this source update belongs to the existing application cycle. Create a separate opportunity for a new cycle.",
    );
  const candidate = scholarshipDataSchema.parse(input.candidate || review.candidate);
  candidate.evidence = candidate.evidence.map((e) =>
    input.confirmedFields.includes(e.field) ? { ...e, state: "verified" as const } : e,
  );
  const confirm = (r: Rule): Rule =>
    r.kind === "requirement"
      ? input.confirmedFields.includes(r.evidenceKey) && r.field !== "providerConfirmation"
        ? { ...r, verified: true }
        : r
      : { ...r, rules: r.rules.map(confirm) };
  candidate.requirements = confirm(candidate.requirements);
  const result = await publishScholarship(
    actor,
    review.scholarshipId,
    candidate,
    review.baseVersion,
    input.reason,
    id,
  );
  return { state: "accepted", ...result };
}
