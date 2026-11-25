// Explicit, bounded live verification against an isolated loopback database.
// No production env loading, credentials, cron activation or manual URL seeding.
import { readFile, writeFile } from "node:fs/promises";
import { db } from "../src/lib/db";
import { configureDirectory } from "../src/server/discovery/service";
import { checkDirectory, checkCandidate } from "../src/server/discovery/worker";
import { discoveryRunSummary } from "../src/server/discovery/report";
let isolatedDatabaseConfigured = false;

async function main() {
  const raw = process.env.TEST_DATABASE_URL;
  if (!raw) throw new Error("TEST_DATABASE_URL is required.");
  const url = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.pathname.includes("test"))
    throw new Error("Refusing live verification outside an isolated loopback test database.");
  process.env.DATABASE_URL = raw;
  process.env.DIRECT_URL = raw;
  process.env.DATABASE_TRANSPORT = "tcp";
  process.env.APP_ENV = "test";
  process.env.EMAIL_MODE = "sink";
  isolatedDatabaseConfigured = true;
  if ((await db().scholarship.count()) || (await db().discoveryDirectory.count()))
    throw new Error(
      "Live verification requires an empty isolated database; create a new one rather than resetting accepted data.",
    );
  const actor = {
    id: "isolated-live-discovery-review",
    name: "Isolated source verification",
    email: "operator@example.test",
    role: "operator",
  };
  const ids = [
    "csc-degree-directory",
    "sheffield-postgraduate-directory",
    "mandela-rhodes-directory",
  ];
  const reportPath = "docs/evidence/production-discovery-expansion-live.json";
  let wroteReport = false;
  const directoryResults: Awaited<ReturnType<typeof checkDirectory>>[] = [];
  const detailResults: (Awaited<ReturnType<typeof checkCandidate>> & { url: string })[] = [];
  const replayResults: (Awaited<ReturnType<typeof checkCandidate>> & {
    url: string;
    versionsBefore: number;
    versionsAfter: number;
    eventsBefore: number;
    eventsAfter: number;
  })[] = [];
  try {
    for (const id of ids) {
      await configureDirectory(actor, id, {
        enabled: true,
        autoPublish: true,
        reason:
          "Isolated bounded live verification of reviewed official source; pause after report.",
      });
      const result = await checkDirectory(id);
      directoryResults.push(result);
      console.log(JSON.stringify(result));
    }
    const candidates = await db().discoveredCandidate.findMany({
      where: { directoryId: { in: ids } },
      orderBy: { canonicalUrl: "asc" },
      take: 100,
    });
    // Five details, selected only from links actually returned by the directories.
    const selected = candidates
      .filter((candidate) =>
        /commonwealth-phd-|commonwealth-shared-|\/ferguson$|\/postgraduate\/2027$|\/scholarship\/apply\/$/.test(
          candidate.canonicalUrl,
        ),
      )
      .slice(0, 5);
    for (const candidate of selected) {
      const result = await checkCandidate(candidate.id);
      detailResults.push({ ...result, url: candidate.canonicalUrl });
      console.log(JSON.stringify(detailResults.at(-1)));
    }
    const accepted = detailResults.filter((result) => result.state === "auto_publish").slice(0, 2);
    for (const candidate of accepted) {
      if (!("scholarshipId" in candidate) || typeof candidate.scholarshipId !== "string")
        throw new Error("Missing publication identity");
      const before = await db().scholarship.findUniqueOrThrow({
        where: { id: candidate.scholarshipId! },
        include: { _count: { select: { versions: true } } },
      });
      const eventsBefore = await db().outbox.count({
        where: { key: { startsWith: `scholarship:${before.id}:` } },
      });
      const result = await checkCandidate(candidate.id);
      const after = await db().scholarship.findUniqueOrThrow({
        where: { id: before.id },
        include: { _count: { select: { versions: true } } },
      });
      const eventsAfter = await db().outbox.count({
        where: { key: { startsWith: `scholarship:${before.id}:` } },
      });
      replayResults.push({
        ...result,
        url: candidate.url,
        versionsBefore: before._count.versions,
        versionsAfter: after._count.versions,
        eventsBefore,
        eventsAfter,
      });
      console.log(JSON.stringify(replayResults.at(-1)));
    }
    const report = {
      checkedAt: new Date().toISOString(),
      scope:
        "isolated loopback test database; real robots-aware paced retrievals; no production changes",
      bounds: { directories: 3, pagesPerDirectory: 3, detailRequests: 5, replays: 2 },
      summary: discoveryRunSummary([...directoryResults, ...detailResults, ...replayResults]),
      directories: directoryResults,
      details: detailResults,
      replay: replayResults,
      publishedRecords: await db().scholarship.findMany({
        where: { published: true },
        select: {
          id: true,
          title: true,
          cycle: true,
          availability: true,
          version: true,
          _count: { select: { versions: true } },
        },
        take: 10,
      }),
      discovered: candidates.map(({ canonicalUrl, state }) => ({
        url: canonicalUrl,
        initialState: state,
      })),
    };
    await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
    wroteReport = true;
    if ([...directoryResults, ...detailResults, ...replayResults].some((r) => r.state === "failed"))
      process.exitCode = 1;
  } finally {
    for (const id of ids)
      await configureDirectory(actor, id, {
        enabled: false,
        autoPublish: false,
        reason: "Isolated live verification complete; source and automatic publication paused.",
      });
    if (wroteReport) {
      const report = JSON.parse(await readFile(reportPath, "utf8"));
      report.finalPolicies = await db().discoveryDirectory.findMany({
        where: { id: { in: ids } },
        select: { id: true, enabled: true, autoPublish: true, lastSuccessAt: true },
      });
      await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
    }
  }
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (isolatedDatabaseConfigured) await db().$disconnect();
  });
