import { z } from "zod";
import { controlledFixturesEnabled } from "./controlled";
import { db } from "@/lib/db";
import { requireOperator, type Actor } from "@/server/accounts/auth";
import { scholarshipDataSchema } from "@/server/scholarships/schema";
import { publishScholarshipTx, semanticHash } from "@/server/scholarships/publish";
import type { Prisma } from "@/generated/prisma/client";
import { directoryDefinitions } from "./registry";
import { allowedDiscoveryUrl } from "./urls";
import { extractDetail } from "./adapters";
import { directoryAdapters, extractRegisteredDirectory } from "./directory-adapters";
import { resolveDetailMapping, opportunityAdapters, type SourceDocument } from "./adapter-registry";
import { pdfEvidenceHtml } from "./pdf";
import { publicationPolicy } from "./policy";
import { ADAPTER_VERSION, POLICY_VERSION, SCHEMA_VERSION } from "./types";
import type { DetailMapping } from "./types";
import * as cheerio from "cheerio";
import { jassoProgrammeName, fundingProfiles, fundingLayoutReasons } from "./university-funding";
const automatic: Actor = {
  id: "service:official-discovery",
  name: "Validated official discovery",
  email: "discovery@example.test",
  role: "operator",
};
export async function configureDirectory(
  actor: Actor,
  id: string,
  input: { enabled: boolean; autoPublish: boolean; reason: string; startAfter?: Date },
) {
  requireOperator(actor);
  const definition = directoryDefinitions[id];
  if (
    input.startAfter &&
    (!Number.isFinite(input.startAfter.getTime()) ||
      input.startAfter.getTime() < Date.now() ||
      input.startAfter.getTime() > Date.now() + 48 * 3600000)
  )
    throw new Error("Deferred activation must be within the next 48 hours.");
  if (!definition || input.reason.trim().length < 10)
    throw new Error("Choose a supported directory and explain its policy.");
  if (
    input.enabled &&
    (!directoryAdapters.has(definition.directoryAdapter || "official-html-1") ||
      (definition.dynamicDetail && !opportunityAdapters.get(definition.dynamicDetail)))
  )
    throw new Error("UNSUPPORTED_ADAPTER: keep this source paused until its adapter is reviewed.");
  return db().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`directory:${id}`}))`;
    const previous = await tx.discoveryDirectory.findUnique({ where: { id } });
    if (
      previous &&
      previous.enabled === input.enabled &&
      previous.autoPublish === input.autoPublish &&
      previous.policyReason === input.reason &&
      !input.startAfter
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
        ...(input.startAfter ? { nextCheckAt: input.startAfter } : {}),
      },
      update: {
        enabled: input.enabled,
        autoPublish: input.autoPublish,
        policyReason: input.reason,
        policyVersion: { increment: 1 },
        health: input.enabled ? "ready" : "paused",
        ...(input.startAfter ? { nextCheckAt: input.startAfter } : {}),
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
        after: {
          enabled: input.enabled,
          autoPublish: input.autoPublish,
          reason: input.reason,
          ...(input.startAfter ? { startAfter: input.startAfter.toISOString() } : {}),
        },
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
  const extracted = extractRegisteredDirectory(definition, html, url);
  const ids: string[] = [];
  let created = 0;
  // Large single-page catalogues must not starve unknown awards behind the
  // same first 100 accepted URLs forever. Inspect a bounded window, then queue
  // at most the unchanged per-check quota, preferring genuinely unseen URLs.
  const links = [...new Set(extracted.links)].slice(0, 500);
  const known = new Set(
    (
      await db().discoveredCandidate.findMany({
        where: { directoryId, canonicalUrl: { in: links } },
        select: { canonicalUrl: true },
      })
    ).map((candidate) => candidate.canonicalUrl),
  );
  const prioritised = [
    ...links.filter((url) => !known.has(url)),
    ...links.filter((url) => known.has(url)),
  ];
  for (const canonicalUrl of prioritised.slice(0, Math.max(0, Math.min(100, remaining)))) {
    const inserted = await db().discoveredCandidate.createMany({
      data: [
        {
          directoryId,
          canonicalUrl,
          discoveredFrom: url,
          // A manually checked future activation must not hand its new links to
          // an older scheduled worker before the reviewed adapter is deployed.
          nextAttemptAt: directory.nextCheckAt > new Date() ? directory.nextCheckAt : new Date(),
        },
      ],
      skipDuplicates: true,
    });
    created += inserted.count;
    const candidate = await db().discoveredCandidate.update({
      where: { directoryId_canonicalUrl: { directoryId, canonicalUrl } },
      data: { lastDiscoveredAt: new Date() },
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
  return {
    ids,
    next: extracted.next,
    created,
    existing: ids.length - created,
    excluded: extracted.excluded,
    leads: extracted.leads || [],
    truncated:
      links.filter((url) => !known.has(url)).length > Math.max(0, Math.min(100, remaining)),
  };
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
    document?: SourceDocument;
    extractionError?: string;
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
  if (Buffer.byteLength(html) > 2_000_000) throw new Error("RESPONSE_TOO_LARGE");
  let mapping: DetailMapping | undefined;
  let extractionError = options.extractionError;
  try {
    if (!extractionError)
      mapping = resolveDetailMapping(
        definition,
        candidate.canonicalUrl,
        options.document || { kind: "html", text: html },
      );
  } catch (error) {
    extractionError =
      error instanceof Error && /^STRUCTURED_[A-Z_]+$/.test(error.message)
        ? error.message
        : "DETAIL_EXTRACTION_INVALID";
  }
  const now = options.now || new Date();
  const extraction = mapping
    ? extractDetail(mapping, html, now, options.supportPages, options.document?.kind === "pdf-text")
    : {
        data: null,
        validation: {
          codes: [
            extractionError || "UNSUPPORTED_DETAIL_MAPPING",
            ...(!extractionError ? fundingLayoutReasons(definition, html) : []),
          ],
          structure: false,
          matchedFields: [],
          requirementsComplete: false,
          cycleConfirmed: false,
        },
        excerpt: (() => {
          const $ = cheerio.load(html);
          $("script,style,nav,header,footer").remove();
          const selector = fundingProfiles.find(
            (profile) => profile.id === definition.dynamicDetail,
          )?.root;
          const root =
            selector && $(selector).length ? $(selector) : $("main").length ? $("main") : $("body");
          return root.text().replace(/\s+/g, " ").trim().slice(0, 8000);
        })(),
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
          identity: mapping
            ? {
                key: mapping.key,
                programme: mapping.programme,
                provider: mapping.provider,
                cycle: mapping.cycle,
              }
            : null,
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
    if (mapping?.data.cycleBasis === "application_round")
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`application-rounds:${mapping.key}`}))`;
    if (mapping)
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`discovery:${mapping.key}:${mapping.cycle}`}))`;
    if (mapping) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`source-url:${candidate.canonicalUrl}`}))`;
      const acceptedUrl = await tx.scholarshipVersion.findFirst({
        where: { data: { path: ["officialUrl"], equals: candidate.canonicalUrl } },
        include: { scholarship: { include: { programme: true } } },
        orderBy: { createdAt: "desc" },
      });
      if (acceptedUrl && acceptedUrl.scholarship.programme.slug !== mapping.key)
        extraction.validation.codes.push("URL_PROGRAMME_IDENTITY_CONFLICT");
    }
    if (mapping && definition.dynamicDetail === "jasso-scholarship-cms-1") {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`programme-identity:${mapping.provider.key}:${jassoProgrammeName(mapping.data.title)}:${mapping.cycle}`}))`;
      const others = await tx.scholarship.findMany({
        where: {
          published: true,
          programme: { provider: { slug: mapping.provider.key }, slug: { not: mapping.key } },
        },
        select: { title: true, cycle: true },
        take: 501,
      });
      if (others.length > 500)
        extraction.validation.codes.push("PROGRAMME_IDENTITY_CHECK_BOUND_EXCEEDED");
      if (
        others.some(
          (row) =>
            row.cycle === mapping.cycle &&
            jassoProgrammeName(row.title) === jassoProgrammeName(mapping.data.title),
        )
      )
        extraction.validation.codes.push("PROGRAMME_VARIANT_IDENTITY_REQUIRES_REVIEW");
    }
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
    // A changed closing date is not proof of a new application round. Keep
    // overlapping periods in review instead of duplicating an accepted call.
    if (!existing && existingProgramme && mapping?.data.cycleBasis === "application_round") {
      const window = extraction.data?.applicationWindow;
      if (window?.opensOn && window.closesOn) {
        const overlap = await tx.scholarship.findFirst({
          where: {
            programmeId: existingProgramme.id,
            version: { gt: 0 },
            windowOpensOn: { lte: window.closesOn },
            windowClosesOn: { gte: window.opensOn },
          },
          select: { id: true },
        });
        if (overlap) extraction.validation.codes.push("APPLICATION_ROUND_IDENTITY_REQUIRES_REVIEW");
      }
    }
    if (
      existing?.versions[0] &&
      existing.versions[0].createdAt > (options.startedAt || now) &&
      semanticHash(previous) !== semanticHash(extraction.data)
    )
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
export async function processDetailDocument(
  candidateId: string,
  document: SourceDocument,
  options: Parameters<typeof processDetailHtml>[2] = {},
) {
  return processDetailHtml(
    candidateId,
    document.kind === "html" ? document.text : pdfEvidenceHtml(document.text),
    { ...options, document },
  );
}
export async function discoveryOverview(actor: Actor, scholarshipId?: string) {
  requireOperator(actor);
  const selectedId = z.string().min(1).max(128).optional().parse(scholarshipId);
  const [directories, candidates, decisions, recentChecks] = await Promise.all([
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
      where: {
        decision: "auto_publish",
        ...(selectedId ? { scholarshipId: selectedId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db().publicationDecision.findMany({
      where: { decision: "unchanged", ...(selectedId ? { scholarshipId: selectedId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  const titleOf = (data: Prisma.JsonValue | null) =>
    data && typeof data === "object" && !Array.isArray(data) && typeof data.title === "string"
      ? data.title
      : null;
  return {
    adapters: opportunityAdapters.list(),
    availableDirectories: Object.values(directoryDefinitions).map((definition) => ({
      id: definition.id,
      url: definition.url,
      registered: directories.some((directory) => directory.id === definition.id),
      directoryAdapter: definition.directoryAdapter || "official-html-1",
      detailAdapter: definition.dynamicDetail || "reviewed-exact-mapping",
      supported:
        directoryAdapters.has(definition.directoryAdapter || "official-html-1") &&
        (!definition.dynamicDetail || !!opportunityAdapters.get(definition.dynamicDetail)),
      review: definition.review || null,
    })),
    directories,
    candidates: candidates.map((candidate) => ({
      ...candidate,
      title: titleOf(candidate.observations[0]?.data ?? null),
    })),
    decisions: decisions.map((decision) => ({ ...decision, title: titleOf(decision.after) })),
    recentChecks: recentChecks.map((decision) => ({ ...decision, title: titleOf(decision.after) })),
  };
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
    const definition = directoryDefinitions[candidate.directoryId];
    const identity = z
      .object({
        key: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .max(180),
        programme: z.string().min(3).max(180),
        provider: z.object({
          key: z.string().regex(/^[a-z0-9-]+$/),
          name: z.string().min(2).max(180),
          url: z.url({ protocol: /^https$/ }),
          countryCode: z.string().length(2).optional(),
        }),
        cycle: z.string().min(1).max(180),
      })
      .safeParse(
        observation.validation &&
          typeof observation.validation === "object" &&
          !Array.isArray(observation.validation)
          ? observation.validation.identity
          : null,
      );
    // Only server-persisted identities from supported templates can resolve a
    // dynamic exception. Client data cannot register a new provider/programme.
    const mapping =
      definition?.mappings.find((m) => m.url === candidate.canonicalUrl) ||
      (definition?.dynamicDetail &&
      identity.success &&
      observation.adapterVersion === ADAPTER_VERSION
        ? identity.data
        : undefined);
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
