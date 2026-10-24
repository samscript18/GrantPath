import { describe, expect, it } from "vitest";
import { db } from "../../src/lib/db";
import { createOpportunity } from "../../src/server/operator";
import { publishScholarship } from "../../src/server/scholarships/publish";
import { catalogue, scholarshipBySlug } from "../../src/server/scholarships";
import { testScholarship } from "../fixtures/scholarship";
const operator = { id: "test-operator", name: "Test operator", email: "operator@example.test", role: "operator" };
describe("catalogue persistence and roles", () => {
  it("publishes once, searches persistently, isolates cycles and denies student writes", async () => {
    const tag = crypto.randomUUID(); const d = testScholarship();
    const input = { slug: `test-${tag}`, cycle: "TEST-2027", programmeSlug: `test-programme-${tag}`, providerSlug: `test-provider-${tag}`, providerName: "[TEST ONLY] Provider", providerUrl: "https://www.ucl.ac.uk", data: d, reason: "Controlled isolated test publication." };
    await expect(createOpportunity({ ...operator, role: "student" }, input)).rejects.toThrow("Operator");
    const record = await createOpportunity(operator, input);
    const replay = await publishScholarship(operator, record.id, d, 1, "Replay of the same accepted facts."); expect(replay.changed).toBe(false);
    expect(await db().scholarshipVersion.count({ where: { scholarshipId: record.id } })).toBe(1);
    expect(await db().outbox.count({ where: { key: `scholarship:${record.id}:1` } })).toBe(1);
    const found = await catalogue({ q: "Controlled scholarship", provider: input.providerSlug }); expect(found.total).toBe(1);
    expect((await scholarshipBySlug(record.slug))?.data.fundingType).toBe("tuition");
    await expect(createOpportunity(operator, input)).rejects.toThrow("already exists");
    const next = await createOpportunity(operator, { ...input, slug: `${input.slug}-next`, cycle: "TEST-2028" }); expect(next.id).not.toBe(record.id);
    expect(await db().scholarship.count({ where: { programme: { slug: input.programmeSlug } } })).toBe(2);
  });
});
