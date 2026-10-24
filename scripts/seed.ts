import "dotenv/config";
import { db } from "../src/lib/db";
import { reviewedCatalogue } from "../src/data/catalogue";
import { publishScholarship } from "../src/server/scholarships/publish";
const actor = {
  id: "official-source-research:2026-10-24",
  name: "Catalogue source review",
  email: "catalogue@example.test",
  role: "operator",
};
async function main() {
  let changed = 0;
  for (const entry of reviewedCatalogue) {
    const provider = await db().provider.upsert({
      where: { slug: entry.providerSlug },
      create: { slug: entry.providerSlug, name: entry.provider, url: entry.providerUrl },
      update: {},
    });
    const programmeSlug = entry.slug.replace(/-(2026|2027)(-.*)?$/, "");
    const programme = await db().programme.upsert({
      where: { slug: programmeSlug },
      create: { slug: programmeSlug, name: entry.data.title, providerId: provider.id },
      update: {},
    });
    const scholarship = await db().scholarship.upsert({
      where: { programmeId_cycle: { programmeId: programme.id, cycle: entry.cycle } },
      create: {
        slug: entry.slug,
        programmeId: programme.id,
        cycle: entry.cycle,
        title: entry.data.title,
        destination: entry.data.destination,
        level: entry.data.levels.join(","),
        field: entry.data.fields.join(","),
        fundingType: entry.data.fundingType,
      },
      update: {},
    });
    // Re-running seed never overwrites an operator's later accepted changes.
    if (!scholarship.version) {
      const result = await publishScholarship(
        actor,
        scholarship.id,
        entry.data,
        0,
        "Initial official-page research; scope and unresolved conditions preserved in evidence.",
      );
      if (result.changed) changed++;
    }
    if (entry.adapter)
      await db().source.upsert({
        where: { url: entry.data.officialUrl },
        create: {
          scholarshipId: scholarship.id,
          url: entry.data.officialUrl,
          adapter: entry.adapter,
          enabled: false,
          health: "policy_review",
          cadenceHours: 24,
        },
        update: {},
      });
  }
  console.log(
    `Catalogue persisted: ${reviewedCatalogue.length} source-backed records; ${changed} initial versions published. Supported sources remain disabled until access-policy review.`,
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db().$disconnect();
  });
