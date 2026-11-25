import { db } from "../src/lib/db";
import { jassoProgrammeName } from "../src/server/discovery/university-funding";

const raw = process.env.GROWTH_DATABASE_URL;
if (
  !raw ||
  !["127.0.0.1", "localhost"].includes(new URL(raw).hostname) ||
  new URL(raw).pathname !== "/grantpath_growth_test"
)
  throw new Error("Use the explicit isolated development catalogue.");
process.env.DATABASE_URL = raw;
process.env.DATABASE_TRANSPORT = "tcp";
const apply = process.argv.includes("--apply");
try {
  if (apply && (await db().user.count()))
    throw new Error("Refusing correction in a catalogue with user accounts.");
  const candidates = await db().discoveredCandidate.findMany({
    where: { directoryId: "jasso-scholarship-search", scholarshipId: { not: null } },
  });
  const rows = await db().scholarship.findMany({
    where: { id: { in: candidates.map((c) => c.scholarshipId!) }, published: true },
    include: { programme: true },
    orderBy: { createdAt: "asc" },
  });
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = `${row.programme.providerId}:${jassoProgrammeName(row.title)}:${row.cycle}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  const report = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const [retained, ...held] = group;
    report.push({ retained: retained.id, title: retained.title, held: held.map((row) => row.id) });
    if (!apply) continue;
    for (const row of held)
      await db().$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`directory:jasso-scholarship-search`}))`;
        const claimed = await tx.scholarship.updateMany({
          where: { id: row.id, version: row.version, published: true },
          data: { published: false },
        });
        if (!claimed.count)
          throw Error("Variant changed during review; retry from a fresh snapshot.");
        await tx.discoveredCandidate.updateMany({
          where: { directoryId: "jasso-scholarship-search", scholarshipId: row.id },
          data: {
            state: "review",
            error: "PROGRAMME_VARIANT_IDENTITY_REQUIRES_REVIEW",
            lockedUntil: null,
            leaseToken: null,
          },
        });
        await tx.audit.create({
          data: {
            actorId: "service:development-catalogue-growth",
            action: "discovery.programme_variant_hold",
            recordId: row.id,
            reason:
              "Hold additional same-provider programme variants for identity review; preserve accepted history and avoid inflating the development catalogue.",
            before: { published: true, version: row.version },
            after: {
              published: false,
              version: row.version,
              retainedScholarshipId: retained.id,
              reason:
                "Same provider and named programme indexed by funding component, degree band or entry route. Hold additional listings for identity review; retain all records, immutable versions, observations and publication events. No facts are merged.",
            },
          },
        });
      });
  }
  console.log(
    JSON.stringify({
      applied: apply,
      groups: report,
      held: report.reduce((n, group) => n + group.held.length, 0),
    }),
  );
} finally {
  await db().$disconnect();
}
