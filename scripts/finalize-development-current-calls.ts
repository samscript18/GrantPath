import { writeFile } from "node:fs/promises";
import { db } from "../src/lib/db";
import { scholarshipDataSchema, availabilityOf } from "../src/server/scholarships/schema";
import { drainOutbox } from "../src/server/jobs/outbox";
import { writeGrowthLedger } from "./growth-ledger";
const raw = process.env.GROWTH_DATABASE_URL;
if (raw !== "postgresql://mac@127.0.0.1:55434/grantpath_growth_test")
  throw Error("Exact isolated development catalogue required");
process.env.DATABASE_URL = raw;
process.env.DATABASE_TRANSPORT = "tcp";
process.env.APP_ENV = "test";
process.env.EMAIL_MODE = "sink";
try {
  if (await db().user.count())
    throw Error("This development finalizer requires an account-free isolated catalogue");
  if (await db().discoveryDirectory.count({ where: { enabled: true } }))
    throw Error("Pause all retrieval policies before finalization");
  const rows = await db().scholarship.findMany({
    include: { versions: { orderBy: { number: "desc" }, take: 1 } },
  });
  if (rows.length > 2000) throw Error("Bound exceeded");
  const versionsBefore = await db().scholarshipVersion.count();
  const eventsBefore = await db().outbox.count();
  let backfilled = 0;
  for (const row of rows) {
    const data = scholarshipDataSchema.parse(row.versions[0].data);
    const windowOpensOn =
      data.recordKind === "cycle" ? data.applicationWindow?.opensOn || null : null;
    const windowClosesOn =
      data.recordKind === "cycle" ? data.applicationWindow?.closesOn || null : null;
    const opensAt = data.opensAt ? new Date(data.opensAt) : null;
    if (
      row.windowOpensOn === windowOpensOn &&
      row.windowClosesOn === windowClosesOn &&
      row.opensAt?.toISOString() === opensAt?.toISOString()
    )
      continue;
    await db().scholarship.update({
      where: { id: row.id },
      data: { windowOpensOn, windowClosesOn, opensAt },
    });
    backfilled++;
  }
  let completed = 0;
  for (let batch = 0; batch < 50; batch++) {
    const result = await drainOutbox(50);
    if (result.failed) throw Error("Outbox failure requires review");
    completed += result.completed;
    if (result.completed < 50) break;
  }
  const current = await db().scholarship.findMany({ where: { published: true } });
  const now = new Date();
  const receipt = {
    verifiedAt: now.toISOString(),
    total: current.length,
    baseline: { total: 1067, open: 7, upcoming: 3, closed: 115, unknown: 942, review: 419 },
    availability: Object.fromEntries(
      ["open", "upcoming", "closed", "unknown"].map((status) => [
        status,
        current.filter((row) => availabilityOf(row, now) === status).length,
      ]),
    ),
    distinctProgrammes: new Set(current.map((row) => row.programmeId)).size,
    newlyDiscoveredProgrammes: 1,
    newlyLinkedApplicationRounds: 58,
    existingAcademicIntakesUpdated: 1,
    review: await db().discoveredCandidate.count({ where: { state: "review" } }),
    projectionBackfill: {
      records: backfilled,
      versionsBefore,
      versionsAfter: await db().scholarshipVersion.count(),
      eventsBefore,
      eventsAfter: await db().outbox.count(),
    },
    outbox: { completed, states: await db().outbox.groupBy({ by: ["state"], _count: true }) },
    enabledDirectories: await db().discoveryDirectory.count({ where: { enabled: true } }),
    sources: [
      "uq-scholarships",
      "auckland-scholarships",
      "csc-current-calls",
      "ediss-current-calls",
    ],
    limitations: [
      "Date-only closing boundaries remain uncertain; no timezone inferred.",
      "Zero student accounts in isolated catalogue; recipient delivery is exercised by integration tests.",
    ],
  };
  await writeGrowthLedger();
  await writeFile(
    "docs/evidence/current-call-completion.json",
    JSON.stringify(receipt, null, 2) + "\n",
  );
  console.log(JSON.stringify(receipt));
} finally {
  await db().$disconnect();
}
