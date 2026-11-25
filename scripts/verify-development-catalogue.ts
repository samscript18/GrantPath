// Read-only verification of actual isolated records, not synthetic catalogue growth.
import { writeFile } from "node:fs/promises";
import { db } from "../src/lib/db";
import { catalogue } from "../src/server/scholarships";
import { scholarshipDataSchema } from "../src/server/scholarships/schema";
import { evaluate } from "../src/server/eligibility/engine";
import { emptyProfile } from "../src/server/profiles/schema";
const raw = process.env.GROWTH_DATABASE_URL;
if (
  !raw ||
  new URL(raw).hostname !== "127.0.0.1" ||
  new URL(raw).pathname !== "/grantpath_growth_test"
)
  throw Error("Explicit isolated development catalogue required.");
process.env.DATABASE_URL = raw;
process.env.DATABASE_TRANSPORT = "tcp";
try {
  const rows = await db().scholarship.findMany({
    where: { published: true },
    take: 2001,
    include: {
      versions: { orderBy: { number: "desc" }, take: 1 },
      programme: { include: { provider: true } },
    },
  });
  if (rows.length > 2000) throw Error("Verification exceeds the 2,000-record bound.");
  const failures: string[] = [];
  const profiles = ["Nigeria", "Canada", "India", "South Africa"].flatMap((citizenship) =>
    (["bachelor", "master", "doctorate"] as const).map((targetLevel) => ({
      ...emptyProfile(),
      citizenships: [citizenship],
      targetLevel,
    })),
  );
  let unknownConditionAssessments = 0;
  const seen = new Set<string>();
  for (const row of rows) {
    const data = scholarshipDataSchema.parse(row.versions[0]?.data);
    if (row.title.startsWith("[TEST ONLY]")) failures.push("TEST_RECORD:" + row.id);
    if (row.versions[0].number !== row.version) failures.push("VERSION_READBACK:" + row.id);
    if (new URL(data.officialUrl).protocol !== "https:") failures.push("OFFICIAL_URL:" + row.id);
    const key =
      row.programme.providerId +
      ":" +
      row.title.normalize("NFKC").trim().toLowerCase() +
      ":" +
      row.cycle;
    if (seen.has(key)) failures.push("DUPLICATE_NAMED_AWARD:" + row.id);
    seen.add(key);
    if (data.evidence.some((e) => e.field === "requirements" && e.state === "missing"))
      for (const profile of profiles) {
        unknownConditionAssessments++;
        if (evaluate(data.requirements, profile).outcome === "eligible")
          failures.push("UNKNOWN_BECAME_ELIGIBLE:" + row.id);
      }
  }
  const filterResults = [];
  for (const availability of ["open", "upcoming", "closed", "unknown"] as const) {
    const response = await catalogue({ availability });
    if (response.rows.some((row) => row.currentAvailability !== availability))
      failures.push("AVAILABILITY_FILTER:" + availability);
    filterResults.push({ availability, total: response.total });
  }
  if (filterResults.reduce((n, row) => n + row.total, 0) !== rows.length)
    failures.push("AVAILABILITY_TOTAL");
  for (const level of ["bachelor", "master", "doctorate"] as const) {
    const response = await catalogue({ availability: "all", level });
    const expected = rows.filter((row) =>
      scholarshipDataSchema.parse(row.versions[0].data).levels.includes(level),
    ).length;
    if (
      response.total !== expected ||
      response.rows.some((row) => !row.data.levels.includes(level))
    )
      failures.push("LEVEL_FILTER:" + level);
  }
  for (const destination of ["AU", "NZ", "JP", "CA", "GB", "NL"]) {
    const response = await catalogue({ availability: "all", destination });
    if (response.total !== rows.filter((row) => row.destinationCodes.includes(destination)).length)
      failures.push("DESTINATION_FILTER:" + destination);
  }
  const integrity = await db().$queryRaw<{ missingEvents: number; missingVersions: number }[]>`
    SELECT
      count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "Outbox" o WHERE o.key = 'scholarship:' || s.id || ':' || s.version))::int AS "missingEvents",
      count(*) FILTER (WHERE (SELECT count(*) FROM "ScholarshipVersion" v WHERE v."scholarshipId" = s.id) <> s.version)::int AS "missingVersions"
    FROM "Scholarship" s WHERE s.published = true`;
  if (integrity[0].missingEvents || integrity[0].missingVersions)
    failures.push("PUBLICATION_INTEGRITY");
  const report = {
    checkedAt: new Date().toISOString(),
    scope: "Read-only isolated development catalogue",
    records: rows.length,
    uniqueProgrammes: new Set(rows.map((row) => row.programmeId)).size,
    availability: filterResults,
    profilesChecked: profiles.length,
    unknownConditionAssessments,
    filtersChecked: { levels: 3, destinations: 6 },
    integrity: integrity[0],
    failures,
  };
  await writeFile(
    "docs/evidence/catalogue-growth-validation.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
  if (failures.length) process.exitCode = 1;
} finally {
  await db().$disconnect();
}
