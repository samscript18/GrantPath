import { readFile, readdir, writeFile } from "node:fs/promises";
import { db } from "../src/lib/db";
import { catalogue } from "../src/server/scholarships";
import { directoryDefinitions } from "../src/server/discovery/registry";
import { allowedDiscoveryUrl } from "../src/server/discovery/urls";
import { availabilityOf, scholarshipDataSchema } from "../src/server/scholarships/schema";

export async function writeGrowthLedger() {
  const directoryRows = await db().discoveryDirectory.findMany({ orderBy: { id: "asc" } });
  const awards = await db().scholarship.findMany({
    where: { published: true, NOT: { title: { startsWith: "[TEST ONLY]" } } },
    orderBy: { title: "asc" },
    include: { versions: { orderBy: { number: "desc" }, take: 1 } },
  });
  const candidates = await db().discoveredCandidate.findMany({
    select: {
      id: true,
      directoryId: true,
      state: true,
      canonicalUrl: true,
      attempts: true,
      scholarshipId: true,
      error: true,
      observations: { orderBy: { retrievedAt: "desc" }, take: 1, select: { validation: true } },
    },
  });
  const reviewCodes = (candidate: (typeof candidates)[number]) => {
    const codes = (candidate.observations[0]?.validation as { codes?: string[] } | undefined)
      ?.codes;
    return codes?.length ? codes : [candidate.error || "UNSUPPORTED_LAYOUT"];
  };
  const decisions = await db().publicationDecision.findMany({
    select: {
      decision: true,
      baseVersion: true,
      scholarshipId: true,
      observation: { select: { candidate: { select: { directoryId: true } } } },
    },
  });
  const runs: Record<string, unknown>[] = [];
  for (const file of (await readdir(".local/growth/runs"))
    .filter((file) => file.endsWith(".json"))
    .sort()
    .slice(-200))
    try {
      runs.push(JSON.parse(await readFile(`.local/growth/runs/${file}`, "utf8")));
    } catch {
      /* An in-flight checkpoint is retried by the next ledger update. */
    }
  const sources = directoryRows.map((directory) => {
    const rows = candidates.filter((row) => row.directoryId === directory.id),
      events = decisions.filter((row) => row.observation.candidate.directoryId === directory.id);
    const publishedIds = new Set(
      events
        .filter((row) => row.decision === "auto_publish" && row.scholarshipId)
        .map((row) => row.scholarshipId!),
    );
    const published = awards.filter((row) => publishedIds.has(row.id));
    const listingRuns = runs.flatMap((run) => {
      const source = (
        run.sources as
          | Record<
              string,
              {
                directory?: { leads?: { url: string }[]; discovered?: number; excluded?: number };
                replays?: unknown[];
              }
            >
          | undefined
      )?.[directory.id];
      return source ? [source] : [];
    });
    const leads = [
      ...new Map(
        listingRuns.flatMap((run) => run.directory?.leads || []).map((lead) => [lead.url, lead]),
      ).values(),
    ].filter((lead) => {
      try {
        allowedDiscoveryUrl(lead.url, directoryDefinitions[directory.id], "detail");
        return false;
      } catch {
        return true;
      }
    });
    const stateCounts = Object.fromEntries(
      [...new Set(rows.map((row) => row.state))].map((state) => [
        state,
        rows.filter((row) => row.state === state).length,
      ]),
    );
    return {
      id: directory.id,
      url: directory.url,
      enabled: directory.enabled,
      autoPublish: directory.autoPublish,
      lastSuccessAt: directory.lastSuccessAt,
      continuationUrl: directory.continuationUrl,
      uniqueCandidateUrls: rows.length,
      validatedUniqueProgrammes: new Set(published.map((row) => row.programmeId)).size,
      publishedRecords: published.length,
      reviewRequired: stateCounts.review || 0,
      possibleProgrammeVariantsHeld: rows.filter(
        (row) =>
          row.state === "review" &&
          row.error?.includes("PROGRAMME_VARIANT_IDENTITY_REQUIRES_REVIEW"),
      ).length,
      failed: stateCounts.failed || 0,
      pending: stateCounts.pending || 0,
      candidateStates: stateCounts,
      newPublications: events.filter(
        (row) => row.decision === "auto_publish" && row.baseVersion === 0,
      ).length,
      updates: events.filter((row) => row.decision === "auto_publish" && row.baseVersion > 0)
        .length,
      unchanged: events.filter((row) => row.decision === "unchanged").length,
      excludedLinksObserved: listingRuns.reduce((n, run) => n + (run.directory?.excluded || 0), 0),
      unapprovedProgrammeLeads: leads.length,
      leads,
      replayEvidence: listingRuns.flatMap((run) => run.replays || []),
      limitations: directoryDefinitions[directory.id]?.review?.limitations || [],
    };
  });
  const probes = [];
  for (const file of (await readdir(".local/growth")).filter((file) =>
    file.endsWith("-probe.json"),
  ))
    probes.push(JSON.parse(await readFile(`.local/growth/${file}`, "utf8")));
  // Exercise the same schema parsing and link normalization as the catalogue
  // API for every record, rather than counting only the first result page.
  const firstPage = await catalogue({ availability: "all" });
  const readbackIds = new Set(firstPage.rows.map((row) => row.id));
  let readbackPages = 1;
  const pageCount = Math.ceil(firstPage.total / 8);
  if (pageCount > 250) throw new Error("Development catalogue readback exceeds 250-page bound.");
  for (let page = 2; page <= pageCount; page++) {
    const result = await catalogue({ availability: "all", page });
    result.rows.forEach((row) => readbackIds.add(row.id));
    readbackPages++;
  }
  const ledger = {
    updatedAt: new Date().toISOString(),
    scope: "Isolated loopback development catalogue; no production writes or scheduled activation",
    baselineOfficialRecords: 32,
    expansionBaselineRecords: 501,
    sourceRegistry: {
      configuredDirectoryDefinitions: Object.keys(directoryDefinitions).length,
      registeredDevelopmentDirectories: directoryRows.length,
      successfullyRetrievedDirectories: directoryRows.filter((row) => !!row.lastSuccessAt).length,
      directoriesWithPublishedRecords: sources.filter((row) => row.publishedRecords > 0).length,
    },
    totals: {
      records: awards.length,
      uniqueProgrammes: new Set(awards.map((row) => row.programmeId)).size,
      newRecordsSinceBaseline: awards.length - 32,
      newRecordsSince501: awards.length - 501,
      availability: Object.fromEntries(
        ["open", "upcoming", "closed", "unknown"].map((state) => [
          state,
          awards.filter((row) => availabilityOf(row) === state).length,
        ]),
      ),
      recordKinds: Object.fromEntries(
        ["overview", "cycle", "unclassified"].map((kind) => [
          kind,
          awards.filter(
            (row) =>
              (scholarshipDataSchema.parse(row.versions[0]?.data).recordKind || "unclassified") ===
              kind,
          ).length,
        ]),
      ),
      catalogueReadback: firstPage.total,
      catalogueReadbackPages: readbackPages,
      catalogueReadbackUniqueRecords: readbackIds.size,
      catalogueReadbackConsistent:
        readbackIds.size === awards.length && awards.every((row) => readbackIds.has(row.id)),
      review: candidates.filter((row) => row.state === "review").length,
      possibleProgrammeVariantsHeld: candidates.filter(
        (row) =>
          row.state === "review" &&
          row.error?.includes("PROGRAMME_VARIANT_IDENTITY_REQUIRES_REVIEW"),
      ).length,
      failed: candidates.filter((row) => row.state === "failed").length,
      pending: candidates.filter((row) => row.state === "pending").length,
    },
    sources,
    reviewReasons: [
      ...new Set(candidates.filter((c) => c.state === "review").flatMap(reviewCodes)),
    ].map((reason) => ({
      reason,
      count: candidates.filter((c) => c.state === "review" && reviewCodes(c).includes(reason))
        .length,
    })),
    accessResearch: probes,
    published: awards.map((row) => {
      const data = row.versions[0]?.data as Record<string, unknown>;
      return {
        id: row.id,
        programmeId: row.programmeId,
        title: row.title,
        cycle: row.cycle,
        availability: row.availability,
        version: row.version,
        officialUrl: data?.officialUrl,
        recordKind: data?.recordKind,
        sourceFactsRetained: !!data?.sourceFacts,
      };
    }),
  };
  await writeFile(
    "docs/evidence/catalogue-growth-ledger.json",
    JSON.stringify(ledger, null, 2) + "\n",
  );
  return ledger;
}

if (process.argv[1]?.endsWith("growth-ledger.ts")) {
  const raw = process.env.GROWTH_DATABASE_URL;
  if (
    !raw ||
    !["127.0.0.1", "localhost"].includes(new URL(raw).hostname) ||
    new URL(raw).pathname !== "/grantpath_growth_test"
  )
    throw Error("Use the explicit isolated GROWTH_DATABASE_URL.");
  process.env.DATABASE_URL = raw;
  process.env.DATABASE_TRANSPORT = "tcp";
  try {
    const ledger = await writeGrowthLedger();
    console.log(JSON.stringify(ledger.totals));
  } finally {
    await db().$disconnect();
  }
}
