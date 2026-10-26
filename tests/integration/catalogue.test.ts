import { describe, expect, it } from "vitest";
import { db } from "../../src/lib/db";
import { createOpportunity } from "../../src/server/operator";
import { publishScholarship } from "../../src/server/scholarships/publish";
import { catalogue, scholarshipBySlug } from "../../src/server/scholarships";
import { testScholarship } from "../fixtures/scholarship";
const operator = {
  id: "test-operator",
  name: "Test operator",
  email: "operator@example.test",
  role: "operator",
};
describe("catalogue persistence and roles", () => {
  it("publishes once, searches persistently, isolates cycles and denies student writes", async () => {
    const tag = crypto.randomUUID();
    const d = testScholarship();
    const input = {
      slug: `test-${tag}`,
      cycle: "TEST-2027",
      programmeSlug: `test-programme-${tag}`,
      providerSlug: `test-provider-${tag}`,
      providerName: "[TEST ONLY] Provider",
      providerUrl: "https://www.ucl.ac.uk",
      data: d,
      reason: "Controlled isolated test publication.",
    };
    await expect(createOpportunity({ ...operator, role: "student" }, input)).rejects.toThrow(
      "Operator",
    );
    const record = await createOpportunity(operator, input);
    const replay = await publishScholarship(
      operator,
      record.id,
      d,
      1,
      "Replay of the same accepted facts.",
    );
    expect(replay.changed).toBe(false);
    expect(await db().scholarshipVersion.count({ where: { scholarshipId: record.id } })).toBe(1);
    expect(await db().outbox.count({ where: { key: `scholarship:${record.id}:1` } })).toBe(1);
    const found = await catalogue({ q: "Controlled scholarship", provider: input.providerSlug });
    expect(found.total).toBe(1);
    expect((await scholarshipBySlug(record.slug))?.data.fundingType).toBe("tuition");
    await expect(createOpportunity(operator, input)).rejects.toThrow("already exists");
    const next = await createOpportunity(operator, {
      ...input,
      slug: `${input.slug}-next`,
      cycle: "TEST-2028",
    });
    expect(next.id).not.toBe(record.id);
    expect(
      await db().scholarship.count({ where: { programme: { slug: input.programmeSlug } } }),
    ).toBe(2);
  });
});

it("persists canonical GLOCAL links and treats equivalent URL replays as unchanged", async () => {
  const tag = crypto.randomUUID();
  const officialUrl = "https://globallocal-erasmusmundus.eu/about-glocal/programme-overview/";
  const applicationUrl = "https://globallocal-erasmusmundus.eu/how-to-apply/";
  const data = {
    ...testScholarship(),
    title: `[TEST ONLY] Canonical GLOCAL ${tag}`,
    officialUrl:
      "https://www.globallocal-erasmusmundus.eu/about-glocal/%70rogramme-overview?utm_source=spain#section",
    applicationUrl: applicationUrl + "?utm_source=uk",
    studyLocations: { scope: "multiple" as const, countries: ["GB", "DE"], institutions: [] },
  };
  const record = await createOpportunity(operator, {
    slug: `test-canonical-glocal-${tag}`,
    cycle: `TEST-${tag}`,
    programmeSlug: "erasmus-glocal",
    providerSlug: "canonical-glocal-test",
    providerName: "[TEST ONLY] GLOCAL provider",
    providerUrl: "https://globallocal-erasmusmundus.eu",
    data,
    reason: "Isolated canonical URL publication verification.",
  });
  const accepted = await db().scholarshipVersion.findUniqueOrThrow({
    where: { scholarshipId_number: { scholarshipId: record.id, number: 1 } },
  });
  expect(accepted.data).toMatchObject({ officialUrl, applicationUrl });
  const replay = await publishScholarship(
    operator,
    record.id,
    { ...data, officialUrl, applicationUrl },
    1,
    "Replay equivalent canonical links without changing accepted facts.",
  );
  expect(replay.changed).toBe(false);
  for (const destination of ["GB", "DE"]) {
    const result = await catalogue({ q: tag, destination, availability: "all" });
    expect(result.total).toBe(1);
    expect(result.rows[0].id).toBe(record.id);
    expect(result.rows[0].data.officialUrl).toBe(officialUrl);
  }
  expect(await db().outbox.count({ where: { key: `scholarship:${record.id}:1` } })).toBe(1);
});
