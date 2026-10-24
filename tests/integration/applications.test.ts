import { describe, expect, it } from "vitest";
import { db } from "../../src/lib/db";
import { createOpportunity } from "../../src/server/operator";
import { saveOpportunity, updateApplication, applicationForScholarship, unsaveOpportunity, applications, removeApplication } from "../../src/server/applications";
import { testScholarship } from "../fixtures/scholarship";
const operator = { id: "test-operator", name: "Test operator", email: "operator@example.test", role: "operator" };
describe("private idempotent application journey", () => {
  it("saves concurrently once, persists private plans, detects conflicts and separates provider status", async () => {
    const tag = crypto.randomUUID(); const a = { id: `a-${tag}`, name: "A test", email: `a-${tag}@example.test`, role: "student" }; const b = { ...a, id: `b-${tag}`, email: `b-${tag}@example.test` };
    await db().user.createMany({ data: [a,b] });
    const s = await createOpportunity(operator, { slug: `app-${tag}`, cycle: "TEST 2027", programmeSlug: `app-prog-${tag}`, providerSlug: `app-provider-${tag}`, providerName: "[TEST ONLY] Provider", providerUrl: "https://www.ucl.ac.uk", data: testScholarship(), reason: "Isolated application test fixture." });
    await Promise.all(Array.from({ length: 5 }, () => saveOpportunity(a, s.id)));
    const app = (await applicationForScholarship(a, s.id))!; expect(await db().application.count({ where: { scholarshipId: s.id, userId: a.id } })).toBe(1); expect(app.history).toHaveLength(1);
    const update = { revision: app.revision, status: "Applied", notes: "Private test note", saved: true, checklist: [{ id: "own", label: "Personal test step", done: true }] };
    await updateApplication(a, app.id, update);
    expect((await applicationForScholarship(a, s.id))?.notes).toBe("Private test note"); expect((await db().scholarship.findUniqueOrThrow({ where: { id: s.id } })).availability).toBe("open");
    await expect(updateApplication(a, app.id, update)).rejects.toThrow("another tab");
    expect(await applicationForScholarship(b, s.id)).toBeNull(); expect(await applications(b)).toHaveLength(0);
    await expect(updateApplication(b, app.id, { ...update, revision: 2 })).rejects.toThrow();
    expect((await unsaveOpportunity(b, s.id)).count).toBe(0); expect((await removeApplication(b, app.id, "REMOVE")).count).toBe(0);
    await unsaveOpportunity(a, s.id); const kept = (await applicationForScholarship(a, s.id))!; expect(kept.saved).toBe(false); expect(kept.notes).toBe("Private test note"); expect(kept.status).toBe("Applied"); expect(kept.history).toHaveLength(2);
    expect((await applications(a, true))).toHaveLength(0);
    await db().user.deleteMany({ where: { id: { in: [a.id,b.id] } } });
  });
});
