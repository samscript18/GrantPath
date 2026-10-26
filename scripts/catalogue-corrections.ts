import "dotenv/config";
import { db } from "../src/lib/db";
import { reviewedCatalogue } from "../src/data/catalogue";
import { scholarshipDataSchema } from "../src/server/scholarships/schema";
import { publishScholarship, semanticHash } from "../src/server/scholarships/publish";
const actor = {
  id: "official-source-interpretation-review:2026-10-24",
  name: "Catalogue review",
  email: "catalogue@example.test",
  role: "operator",
};
async function main() {
  if (process.env.APP_ENV === "production")
    throw new Error(
      "Use the protected operator review for production corrections; this helper is for local/isolated setup.",
    );
  const apply = process.argv.includes("--apply");
  let changed = 0;
  for (const entry of reviewedCatalogue) {
    const s = await db().scholarship.findUnique({
      where: { slug: entry.slug },
      include: { versions: { orderBy: { number: "desc" }, take: 1 } },
    });
    if (!s?.versions[0]) continue;
    const data = scholarshipDataSchema.parse(s.versions[0].data);
    // Only correct the specific source interpretations reviewed here, preserving
    // any other accepted/operator edits and the original retrieval timestamps.
    if (
      entry.slug === "australia-awards-cycle-unconfirmed" &&
      s.cycle === entry.cycle &&
      entry.data.recordKind === "overview" &&
      !data.recordKind &&
      !data.cycleStatus &&
      data.availability === "unknown" &&
      data.deadline === null
    ) {
      data.recordKind = "overview";
      data.cycleStatus = "unconfirmed";
    }
    if (entry.slug === "eth-esop-2027") {
      const fix = (rule: typeof data.requirements): typeof data.requirements =>
        rule.kind === "requirement"
          ? rule.id === "no-existing-master" && rule.values?.includes("doctorate")
            ? { ...rule, values: ["master"] }
            : rule
          : { ...rule, rules: rule.rules.map(fix) };
      data.requirements = fix(data.requirements);
    }
    if (
      ["ucl-global-masters-2026", "twente-uts-2027", "nl-scholarship-2026"].includes(entry.slug) &&
      data.fundingType === "partial"
    )
      data.funding = data.funding.map((f) =>
        f.component === "tuition" ? { ...f, component: "other" as const } : f,
      );
    if (entry.slug === "ucl-global-undergraduate-2026")
      data.funding = data.funding.map((f) =>
        f.component === "tuition" ? { ...f, coverage: "full" as const } : f,
      );
    if (
      data.fundingType === "unknown" &&
      ["chevening-2027", "commonwealth-masters-2027"].includes(entry.slug)
    ) {
      data.funding = [];
      data.evidence = data.evidence.map((e) =>
        e.field === "funding"
          ? {
              ...e,
              state: "missing",
              passage:
                "Funding components need further official-source confirmation; no complete package has been accepted.",
            }
          : e,
      );
    }
    for (const field of ["funding", "levels"]) {
      const revised = entry.data.evidence.find((e) => e.field === field);
      if (
        revised &&
        [
          "ertegun-2027",
          "academic-futures-2027",
          "jardine-oxford-2027",
          "eth-esop-2027",
          ...reviewedCatalogue.filter((e) => e.providerSlug === "warwick").map((e) => e.slug),
        ].includes(entry.slug)
      )
        data.evidence = data.evidence.map((e) =>
          e.field === field ? { ...e, passage: revised.passage } : e,
        );
    }
    if (semanticHash(data) === s.versions[0].semanticHash) continue;
    changed++;
    if (apply)
      await publishScholarship(
        actor,
        s.id,
        data,
        s.version,
        "Source interpretation correction: preserve actual funding components, degree exclusion and unconfirmed scheme classification; retain original supporting passages and retrieval times.",
      );
  }
  console.log(
    `${apply ? "Published" : "Proposed"} ${changed} scoped corrections. Original source retrieval times and historical versions are preserved.`,
  );
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(async () => db().$disconnect());
