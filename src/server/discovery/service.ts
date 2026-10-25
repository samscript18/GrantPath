import { controlledFixturesEnabled } from "./controlled";
import { db } from "@/lib/db";
import { requireOperator, type Actor } from "@/server/accounts/auth";
import { scholarshipDataSchema } from "@/server/scholarships/schema";
import { publishScholarshipTx, semanticHash } from "@/server/scholarships/publish";
import type { Prisma } from "@/generated/prisma/client";
import { directoryDefinitions } from "./registry";
import { allowedDiscoveryUrl } from "./urls";
import { extractDirectory, extractDetail } from "./adapters";
import { makerereAnnouncement } from "./makerere";
import { publicationPolicy } from "./policy";
import { ADAPTER_VERSION, POLICY_VERSION, SCHEMA_VERSION } from "./types";
const automatic: Actor = {
  id: "service:official-discovery",
  name: "Validated official discovery",
  email: "discovery@example.test",
  role: "operator",
};
export async function configureDirectory(
  actor: Actor,
  id: string,
  input: { enabled: boolean; autoPublish: boolean; reason: string },
) {
  requireOperator(actor);
  const definition = directoryDefinitions[id];
  if (!definition || input.reason.trim().length < 10)
    throw new Error("Choose a supported directory and explain its policy.");
  return db().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`directory:${id}`}))`;
    const previous = await tx.discoveryDirectory.findUnique({ where: { id } });
    if (
      previous &&
      previous.enabled === input.enabled &&
      previous.autoPublish === input.autoPublish &&
      previous.policyReason === input.reason
    )
      return previous;
    const row = await tx.discoveryDirectory.upsert({
      where: { id },
      create: {
        id,
        url: definition.url,
        adapter: id,
        enabled: input.enabled,
        autoPublish: input.autoPublish,
        policyReason: input.reason,
      },
      update: {
        enabled: input.enabled,
        autoPublish: input.autoPublish,
        policyReason: input.reason,
        policyVersion: { increment: 1 },
        health: input.enabled ? "ready" : "paused",
      },
    });
    await tx.audit.create({
      data: {
        actorId: actor.id,
        action: "discovery.policy",
        recordId: id,
        before: previous
          ? { enabled: previous.enabled, autoPublish: previous.autoPublish }
          : undefined,
        after: input,
        reason: input.reason,
      },
    });
    return row;
  });
}
export async function processDirectoryHtml(
  directoryId: string,
  html: string,
  pageUrl?: string,
  remaining = 100,
) {
  const directory = await db().discoveryDirectory.findUniqueOrThrow({ where: { id: directoryId } });
  if (!directory.enabled) throw new Error("SOURCE_PAUSED");
  const definition = directoryDefinitions[directoryId];
  if (!definition) throw new Error("UNSUPPORTED_DIRECTORY");
  const url = allowedDiscoveryUrl(pageUrl || directory.url, definition, "directory").href;
  const extracted = extractDirectory(definition, html, url);
  const ids: string[] = [];
  for (const canonicalUrl of extracted.links.slice(0, Math.max(0, Math.min(100, remaining)))) {
    const candidate = await db().discoveredCandidate.upsert({
      where: { directoryId_canonicalUrl: { directoryId, canonicalUrl } },
      create: { directoryId, canonicalUrl, discoveredFrom: url },
      update: { lastDiscoveredAt: new Date() },
    });
    ids.push(candidate.id);
  }
  await db().directoryCheck.create({
    data: {
      directoryId,
      url,
      state: "success",
      succeededAt: new Date(),
      httpStatus: 200,
      discoveredCount: ids.length,
      hash: semanticHash(extracted.links),
    },
  });
  return { ids, next: extracted.next };
}
export async function processDetailHtml(
  candidateId: string,
  html: string,
  options: {
    controlled?: boolean;
    now?: Date;
    leaseToken?: string;
    supportPages?: Record<string, string>;
    startedAt?: Date;
  } = {},
) {
  if (options.controlled && process.env.APP_ENV !== "test" && !controlledFixturesEnabled())
    throw new Error("CONTROLLED_SNAPSHOTS_REQUIRE_ISOLATED_TESTS");
  const candidate = await db().discoveredCandidate.findUniqueOrThrow({
    where: { id: candidateId },
    include: { directory: true },
  });
  const definition = directoryDefinitions[candidate.directoryId];
  if (!definition) throw new Error("UNSUPPORTED_DIRECTORY");
  allowedDiscoveryUrl(candidate.canonicalUrl, definition, "detail");
  const mapping =
    definition.mappings.find((m) => m.url === candidate.canonicalUrl) ||
    makerereAnnouncement(definition, candidate.canonicalUrl, html);
  const now = options.now || new Date();
  const extraction = mapping
    ? extractDetail(mapping, html, now, options.supportPages)
    : {
        data: null,
        validation: {
          codes: ["UNSUPPORTED_DETAIL_MAPPING"],
          structure: false,
          matchedFields: [],
          requirementsComplete: false,
          cycleConfirmed: false,
        },
        excerpt: "Unmapped official detail; operator registration required.",
      };
  return db().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${candidateId}))`;
    const owned = await tx.discoveredCandidate.findUniqueOrThrow({ where: { id: candidateId } });
    if (options.leaseToken && owned.leaseToken !== options.leaseToken)
      return { decision: "stale", reasonCodes: ["LEASE_EXPIRED"] };
    const observation = await tx.discoveryObservation.create({
      data: {
        candidateId,
        retrievedAt: now,
        contentHash: semanticHash(html),
        adapterVersion: ADAPTER_VERSION,
        schemaVersion: SCHEMA_VERSION,
        data: extraction.data ? (extraction.data as Prisma.InputJsonValue) : undefined,
        validation: {
          ...extraction.validation,
          mappingHash: mapping ? semanticHash(mapping) : null,
          directoryUrl: definition.url,
          detailUrl: candidate.canonicalUrl,
          applicationUrl: extraction.data?.applicationUrl || null,
          supportUrls: Object.keys(options.supportPages || {}),
        },
        excerpt: extraction.excerpt,
        controlled: !!options.controlled,
      },
    });
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`directory:${candidate.directoryId}`}))`;
    const policy = await tx.discoveryDirectory.findUniqueOrThrow({
      where: { id: candidate.directoryId },
    });
    if (mapping)
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`discovery:${mapping.key}:${mapping.cycle}`}))`;
    const existingProgramme = mapping
      ? await tx.programme.findUnique({ where: { slug: mapping.key } })
      : null;
    const existing =
      existingProgramme && mapping
        ? await tx.scholarship.findUnique({
            where: {
              programmeId_cycle: { programmeId: existingProgramme.id, cycle: mapping.cycle },
            },
            include: { versions: { orderBy: { number: "desc" }, take: 1 } },
          })
        : null;
    const previous = existing?.versions[0]
      ? scholarshipDataSchema.parse(existing.versions[0].data)
      : null;
    if (existing?.versions[0] && existing.versions[0].createdAt > (options.startedAt || now))
      extraction.validation.codes.push("SOURCE_OBSERVATION_STALE");
    if (existing?.version && !existing.published)
      extraction.validation.codes.push("RECORD_UNPUBLISHED");
    const verdict = publicationPolicy({
      enabled: policy.enabled,
      autoPublish: policy.autoPublish,
      validation: extraction.validation,
      candidate: extraction.data,
      previous,
    });
    let scholarshipId = existing?.id;
    let resultingVersion = existing?.version;
    let eventIds: string[] = [];
    if (verdict.decision === "auto_publish" && mapping && extraction.data) {
      const provider = await tx.provider.upsert({
        where: { slug: mapping.provider.key },
        create: {
          slug: mapping.provider.key,
          name: mapping.provider.name,
          url: mapping.provider.url,
          countryCode: mapping.provider.countryCode,
        },
        update: {},
      });
      const programme = await tx.programme.upsert({
        where: { slug: mapping.key },
        create: { slug: mapping.key, name: mapping.programme, providerId: provider.id },
        update: {},
      });
      if (programme.providerId !== provider.id) throw new Error("PROGRAMME_PROVIDER_CONFLICT");
      const scholarship = await tx.scholarship.upsert({
        where: { programmeId_cycle: { programmeId: programme.id, cycle: mapping.cycle } },
        create: {
          slug: `${mapping.key}-${semanticHash(mapping.cycle).slice(0, 10)}`,
          programmeId: programme.id,
          cycle: mapping.cycle,
          title: extraction.data.title,
          destination: extraction.data.destination,
          level: "",
          field: "",
          fundingType: "unknown",
        },
        update: {},
      });
      scholarshipId = scholarship.id;
      const result = await publishScholarshipTx(
        tx,
        automatic,
        scholarship.id,
        extraction.data,
        existing?.version || 0,
        `${POLICY_VERSION}: ${verdict.codes.join(", ")}`,
      );
      resultingVersion = result.version;
      eventIds = result.eventIds;
    }
    const decision = await tx.publicationDecision.create({
      data: {
        observationId: observation.id,
        decision: verdict.decision,
        reasonCodes: verdict.codes,
        policyVersion: `${POLICY_VERSION}/directory-${policy.policyVersion}`,
        actorId: automatic.id,
        scholarshipId,
        baseVersion: existing?.version || 0,
        resultingVersion,
        eventIds,
        before: previous ? (previous as Prisma.InputJsonValue) : undefined,
        after: extraction.data ? (extraction.data as Prisma.InputJsonValue) : undefined,
      },
    });
    await tx.discoveredCandidate.update({
      where: { id: candidateId },
      data: {
        state:
          verdict.decision === "review_required"
            ? "review"
            : verdict.decision === "reject"
              ? "rejected"
              : "published",
        scholarshipId,
        lockedUntil: null,
        leaseToken: null,
        error: null,
        nextAttemptAt: new Date(now.getTime() + policy.cadenceHours * 3600000),
      },
    });
    return decision;
  });
}
export async function discoveryOverview(actor: Actor) {
  requireOperator(actor);
  const [directories, candidates, decisions] = await Promise.all([
    db().discoveryDirectory.findMany({
      include: {
        checks: { orderBy: { attemptedAt: "desc" }, take: 3 },
        _count: { select: { candidates: true } },
      },
      orderBy: { id: "asc" },
    }),
    db().discoveredCandidate.findMany({
      where: { state: { in: ["review", "failed", "pending", "fetching"] } },
      include: {
        observations: { orderBy: { retrievedAt: "desc" }, take: 1, include: { decisions: true } },
      },
      orderBy: { firstDiscoveredAt: "desc" },
      take: 100,
    }),
    db().publicationDecision.findMany({
      where: { decision: "auto_publish" },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  return { directories, candidates, decisions };
}

export async function registerMappedDetails(actor: Actor, directoryId: string) {
  requireOperator(actor);
  const definition = directoryDefinitions[directoryId];
  if (!definition) throw new Error("UNSUPPORTED_DIRECTORY");
  await db().discoveryDirectory.findUniqueOrThrow({ where: { id: directoryId } });
  const ids: string[] = [];
  for (const mapping of definition.mappings) {
    const canonicalUrl = allowedDiscoveryUrl(mapping.url, definition, "detail").href;
    const row = await db().discoveredCandidate.upsert({
      where: { directoryId_canonicalUrl: { directoryId, canonicalUrl } },
      create: {
        directoryId,
        canonicalUrl,
        discoveredFrom: "manual:approved-programme-registration",
      },
      update: {},
    });
    ids.push(row.id);
  }
  await db().audit.create({
    data: {
      actorId: actor.id,
      action: "discovery.register-details",
      recordId: directoryId,
      reason:
        "Explicit registration of reviewed official paths; not claimed as automatic discovery.",
    },
  });
  return ids;
}
export async function retryCandidate(actor: Actor, id: string, reason: string) {
  requireOperator(actor);
  if (reason.trim().length < 10) throw new Error("Explain why retry is safe.");
  return db().$transaction(async (tx) => {
    const candidate = await tx.discoveredCandidate.findUniqueOrThrow({ where: { id } });
    if (candidate.lockedUntil && candidate.lockedUntil > new Date())
      throw new Error("An active worker still owns this candidate.");
    const result = await tx.discoveredCandidate.update({
      where: { id },
      data: { attempts: 0, state: "pending", nextAttemptAt: new Date(), error: null },
    });
    await tx.audit.create({
      data: { actorId: actor.id, action: "discovery.retry", recordId: id, reason },
    });
    return result;
  });
}
export async function decideDiscovery(
  actor: Actor,
  observationId: string,
  input: { decision: "accept" | "reject"; reason: string; data?: unknown },
) {
  requireOperator(actor);
  if (input.reason.trim().length < 10) throw new Error("Explain the exception decision.");
  return db().$transaction(async (tx) => {
    const observation = await tx.discoveryObservation.findUniqueOrThrow({
      where: { id: observationId },
      include: { candidate: true },
    });
    const candidate = observation.candidate;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${candidate.id}))`;
    const latest = await tx.discoveryObservation.findFirstOrThrow({
      where: { candidateId: candidate.id },
      orderBy: { retrievedAt: "desc" },
    });
    if (latest.id !== observationId)
      throw new Error("This exception has newer evidence. Reload before deciding.");
    const state = await tx.discoveredCandidate.findUniqueOrThrow({ where: { id: candidate.id } });
    if (state.state !== "review") throw new Error("This candidate is no longer awaiting review.");
    const originalDecision = await tx.publicationDecision.findUniqueOrThrow({
      where: { observationId },
    });
    const mapping = directoryDefinitions[candidate.directoryId]?.mappings.find(
      (m) => m.url === candidate.canonicalUrl,
    );
    let scholarshipId = candidate.scholarshipId,
      version: number | undefined,
      eventIds: string[] = [];
    const data =
      input.decision === "accept"
        ? scholarshipDataSchema.parse(input.data || observation.data)
        : null;
    if (data) {
      if (!mapping)
        throw new Error(
          "Register a supported programme mapping before accepting this new identity; the manual catalogue editor remains available.",
        );
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`discovery:${mapping.key}:${mapping.cycle}`}))`;
      const provider = await tx.provider.upsert({
        where: { slug: mapping.provider.key },
        create: {
          slug: mapping.provider.key,
          name: mapping.provider.name,
          url: mapping.provider.url,
          countryCode: mapping.provider.countryCode,
        },
        update: {},
      });
      const programme = await tx.programme.upsert({
        where: { slug: mapping.key },
        create: { slug: mapping.key, name: mapping.programme, providerId: provider.id },
        update: {},
      });
      if (programme.providerId !== provider.id) throw new Error("PROGRAMME_PROVIDER_CONFLICT");
      const scholarship = await tx.scholarship.upsert({
        where: { programmeId_cycle: { programmeId: programme.id, cycle: mapping.cycle } },
        create: {
          slug: `${mapping.key}-${semanticHash(mapping.cycle).slice(0, 10)}`,
          programmeId: programme.id,
          cycle: mapping.cycle,
          title: data.title,
          destination: data.destination,
          level: "",
          field: "",
          fundingType: "unknown",
        },
        update: {},
      });
      if (scholarship.version !== originalDecision.baseVersion)
        throw new Error(
          "The accepted version changed after this exception. Reload and recheck its evidence.",
        );
      scholarshipId = scholarship.id;
      const result = await publishScholarshipTx(
        tx,
        actor,
        scholarship.id,
        data,
        scholarship.version,
        input.reason,
      );
      version = result.version;
      eventIds = result.eventIds;
    }
    // Preserve the original automatic exception; append a separate operator decision.
    const reviewed = await tx.discoveryObservation.create({
      data: {
        candidateId: candidate.id,
        retrievedAt: observation.retrievedAt,
        contentHash: observation.contentHash,
        adapterVersion: observation.adapterVersion,
        schemaVersion: observation.schemaVersion,
        validation: { originalObservationId: observation.id, manualReview: true },
        data: data ? (data as Prisma.InputJsonValue) : undefined,
        excerpt: observation.excerpt,
        controlled: observation.controlled,
      },
    });
    const decision = await tx.publicationDecision.create({
      data: {
        observationId: reviewed.id,
        decision: data ? "manual_publish" : "reject",
        reasonCodes: ["OPERATOR_EXCEPTION_DECISION"],
        policyVersion: POLICY_VERSION,
        actorId: actor.id,
        scholarshipId,
        resultingVersion: version,
        eventIds,
        after: data ? (data as Prisma.InputJsonValue) : undefined,
      },
    });
    await tx.discoveredCandidate.update({
      where: { id: candidate.id },
      data: {
        state: data ? "published" : "rejected",
        scholarshipId,
        attempts: 0,
        nextAttemptAt: new Date(Date.now() + 86400000),
      },
    });
    await tx.audit.create({
      data: {
        actorId: actor.id,
        action: "discovery.exception",
        recordId: candidate.id,
        reason: input.reason,
        after: { decisionId: decision.id, decision: decision.decision },
      },
    });
    return decision;
  });
}

export async function processControlledReleaseSnapshot(
  actor: Actor,
  mode: "valid" | "changed" | "ambiguous",
  scenario: "publication" | "change" = "publication",
) {
  requireOperator(actor);
  if (!controlledFixturesEnabled())
    throw new Error(
      "Controlled fixtures are disabled outside explicitly isolated test deployments.",
    );
  const { controlledDirectory, controlledSnapshot } = await import("./controlled");
  directoryDefinitions[controlledDirectory.id] = controlledDirectory;
  await configureDirectory(actor, controlledDirectory.id, {
    enabled: true,
    autoPublish: true,
    reason: "Explicit operator-controlled snapshot in isolated test deployment.",
  });
  const mapping =
    controlledDirectory.mappings[mode === "ambiguous" ? 1 : scenario === "change" ? 2 : 0];
  const found = await processDirectoryHtml(
    controlledDirectory.id,
    `<main><h1>[TEST ONLY] Controlled directory</h1><a href="${mapping.url}">[TEST ONLY] Joint programme</a></main>`,
  );
  return processDetailHtml(
    found.ids[0],
    controlledSnapshot(mode).replaceAll(
      "[TEST ONLY] Controlled joint scholarship",
      mapping.programme,
    ),
    { controlled: true },
  );
}
