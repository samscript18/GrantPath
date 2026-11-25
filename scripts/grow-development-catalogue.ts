import { mkdir, writeFile } from "node:fs/promises";
import { db } from "../src/lib/db";
import { directoryDefinitions } from "../src/server/discovery/registry";
import { configureDirectory } from "../src/server/discovery/service";
import {
  checkCandidate,
  checkDirectory,
  type DiscoveryAccessSession,
} from "../src/server/discovery/worker";
import { catalogue } from "../src/server/scholarships";
import { writeGrowthLedger } from "./growth-ledger";

const actor = {
  id: "service:development-catalogue-growth",
  name: "Isolated development source operator",
  email: "growth@example.test",
  role: "operator",
};
const args = process.argv.slice(2);
const flag = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const ids = (flag("--sources") || "").split(",").filter(Boolean);
const details = Number(flag("--details") || 30);
const phase = flag("--phase") || "all";
const rounds = Number(flag("--rounds") || 1);
if (
  !ids.length ||
  ids.length > 6 ||
  ids.some((id) => !directoryDefinitions[id]) ||
  !Number.isInteger(details) ||
  details < 1 ||
  details > 100 ||
  !Number.isInteger(rounds) ||
  rounds < 1 ||
  rounds > 5 ||
  !["all", "directory", "details"].includes(phase)
)
  throw new Error("--sources approved-id,... --details 1–100 [--phase directory|details|all]");
const raw = process.env.GROWTH_DATABASE_URL;
if (!raw)
  throw new Error("GROWTH_DATABASE_URL must explicitly target the isolated development catalogue.");
const database = new URL(raw);
if (
  !["127.0.0.1", "localhost"].includes(database.hostname) ||
  !/^\/grantpath_growth_test$/.test(database.pathname)
)
  throw new Error("Refusing a non-isolated development catalogue target.");
process.env.DATABASE_URL = raw;
process.env.DIRECT_URL = raw;
process.env.DATABASE_TRANSPORT = "tcp";
process.env.APP_ENV = "test";
process.env.EMAIL_MODE = "sink";
await mkdir(".local/growth/runs", { recursive: true });
const startedAt = new Date().toISOString();
const runId = startedAt.replace(/[:.]/g, "-");
const path = `.local/growth/runs/${runId}.json`;
const sourceResults: Record<
  string,
  { directory?: unknown; results: Record<string, unknown>[]; replays: unknown[] }
> = {};
const activated: string[] = [];
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
async function totals() {
  const rows = await db().scholarship.findMany({
    where: { published: true, NOT: { title: { startsWith: "[TEST ONLY]" } } },
    select: {
      programmeId: true,
      id: true,
      title: true,
      cycle: true,
      version: true,
      availability: true,
    },
    orderBy: { title: "asc" },
  });
  return {
    records: rows.length,
    uniqueProgrammes: new Set(rows.map((row) => row.programmeId)).size,
    review: await db().discoveredCandidate.count({ where: { state: "review" } }),
    readback: (await catalogue({ availability: "all" })).total,
    rows,
  };
}
let before: Awaited<ReturnType<typeof totals>> | undefined;
async function save() {
  await writeFile(
    path,
    JSON.stringify(
      {
        startedAt,
        updatedAt: new Date().toISOString(),
        database: "isolated loopback grantpath_growth_test",
        before,
        sources: sourceResults,
      },
      null,
      2,
    ) + "\n",
  );
}
async function runSource(id: string, firstRound = true) {
  const result = (sourceResults[id] ||= {
    results: [],
    replays: [],
  } as (typeof sourceResults)[string]);
  const access: DiscoveryAccessSession = new Map();
  await configureDirectory(actor, id, {
    enabled: true,
    autoPublish: true,
    reason:
      "Owner-authorised bounded official-source growth in an isolated loopback development catalogue; pause after batch.",
  });
  if (!activated.includes(id)) activated.push(id);
  if (phase !== "details") {
    result.directory = await checkDirectory(id, access);
    console.log(JSON.stringify({ phase: "directory", ...(result.directory as object) }));
    await save();
  }
  if (phase === "directory") return;
  const candidates = await db().discoveredCandidate.findMany({
    where: {
      directoryId: id,
      state: {
        in: args.includes("--review-only")
          ? args.includes("--include-rejected")
            ? ["review", "rejected"]
            : ["review"]
          : args.includes("--include-review") && firstRound
            ? ["pending", "review"]
            : args.includes("--retry-failed")
              ? ["pending", "failed"]
              : ["pending"],
      },
      ...(args.includes("--review-only") ? { error: null } : {}),
      ...(args.includes("--include-review") && firstRound
        ? { OR: [{ state: "pending" }, { state: "review", error: null }] }
        : {}),
      attempts: { lt: 5 },
    },
    orderBy: { firstDiscoveredAt: "asc" },
    take: details,
  });
  for (const candidate of candidates) {
    if (stopping) break;
    const decision = await checkCandidate(candidate.id, access);
    result.results.push({ ...decision, url: candidate.canonicalUrl });
    console.log(JSON.stringify({ source: id, ...result.results.at(-1) }));
    await save();
  }
  const replayId = result.results.find((row) => row.state === "auto_publish")?.id;
  if (typeof replayId === "string") {
    const row = await db().discoveredCandidate.findUniqueOrThrow({ where: { id: replayId } });
    if (row.scholarshipId) {
      const count = () =>
        db().scholarshipVersion.count({ where: { scholarshipId: row.scholarshipId! } });
      const eventCount = () =>
        db().outbox.count({ where: { key: { startsWith: `scholarship:${row.scholarshipId}:` } } });
      const versionsBefore = await count(),
        eventsBefore = await eventCount();
      const replay = await checkCandidate(replayId, access);
      result.replays.push({
        ...replay,
        versionsBefore,
        versionsAfter: await count(),
        eventsBefore,
        eventsAfter: await eventCount(),
      });
      await save();
    }
  }
}
try {
  before = await totals();
  await save();
  // Hosts are distinct in reviewed batches; shared database reservations still
  // serialize requests if an operator chooses two policies for the same host.
  for (let round = 1; round <= rounds; round++) {
    if (stopping) break;
    console.log(JSON.stringify({ phase: "round", round, rounds }));
    for (let offset = 0; offset < ids.length; offset += 5) {
      const outcomes = await Promise.allSettled(
        ids.slice(offset, offset + 5).map((id) => runSource(id, round === 1)),
      );
      const failures = outcomes.filter((outcome) => outcome.status === "rejected");
      if (failures.length)
        throw new AggregateError(
          failures.map((outcome) => outcome.reason),
          "Development source batch failed; completed workers are preserved.",
        );
    }
  }
} finally {
  for (const id of activated)
    await configureDirectory(actor, id, {
      enabled: false,
      autoPublish: false,
      reason:
        "Development growth batch finished or interrupted; retrieval and automatic publication paused.",
    });
  const ledger = await writeGrowthLedger();
  await save();
  console.log(
    JSON.stringify({
      phase: "batch_complete",
      ...ledger.totals,
      ledger: "docs/evidence/catalogue-growth-ledger.json",
    }),
  );
  await db().$disconnect();
}
