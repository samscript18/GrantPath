import { describe, expect, it } from "vitest";
import { db } from "../../src/lib/db";
import { saveProfile } from "../../src/server/profiles";
import { createOpportunity } from "../../src/server/operator";
import { publishScholarship } from "../../src/server/scholarships/publish";
import { evaluateStudent, studentAssessment } from "../../src/server/eligibility";
import { testScholarship } from "../fixtures/scholarship";
const operator = {
  id: "test-operator",
  name: "Test operator",
  email: "operator@example.test",
  role: "operator",
};
describe("versioned matching and concurrency", () => {
  it("rejects conflicting profile saves and cannot replace a newer evaluation with stale work", async () => {
    const tag = crypto.randomUUID();
    const actor = { id: tag, name: "Test student", email: `${tag}@example.test`, role: "student" };
    await db().user.create({ data: { ...actor, emailVerified: true } });
    await saveProfile(actor, { targetLevel: "master" }, 0, 3);
    const changes = await Promise.allSettled([
      saveProfile(actor, { targetLevel: "doctorate" }, 1, 3),
      saveProfile(actor, { targetLevel: "bachelor" }, 1, 3),
    ]);
    expect(changes.filter((c) => c.status === "fulfilled")).toHaveLength(1);
    expect(changes.filter((c) => c.status === "rejected")).toHaveLength(1);
    await saveProfile(actor, { targetLevel: "master" }, 2, 3);
    const data = testScholarship();
    const s = await createOpportunity(operator, {
      slug: `match-${tag}`,
      cycle: "TEST 2027",
      programmeSlug: `match-prog-${tag}`,
      providerSlug: `match-provider-${tag}`,
      providerName: "[TEST ONLY] Provider",
      providerUrl: "https://www.ucl.ac.uk",
      data,
      reason: "Isolated matching test fixture.",
    });
    const initial = await evaluateStudent(actor.id, s.id);
    expect(initial.state).toBe("created");
    expect((await studentAssessment(actor, s.id)).evaluation?.outcome).toBe("eligible");
    const changed = structuredClone(data);
    if (changed.requirements.kind === "all")
      changed.requirements.rules[0] = {
        kind: "requirement",
        id: "level",
        label: "Doctorate required in test change",
        field: "targetLevel",
        op: "in",
        values: ["doctorate"],
        verified: true,
        evidenceKey: "levels",
      };
    await publishScholarship(
      operator,
      s.id,
      changed,
      1,
      "Controlled new requirement for the test.",
    );
    expect((await studentAssessment(actor, s.id)).current).toBe(false);
    await evaluateStudent(actor.id, s.id, { profileVersion: 3, scholarshipVersion: 2 });
    expect(
      (await evaluateStudent(actor.id, s.id, { profileVersion: 1, scholarshipVersion: 1 })).state,
    ).toBe("stale");
    const latest = await studentAssessment(actor, s.id);
    expect(latest.current).toBe(true);
    expect(latest.evaluation?.outcome).toBe("not_eligible");
    expect(latest.evaluation?.profileVersion).toBe(3);
    expect(latest.evaluation?.scholarshipVersion).toBe(2);
    expect(await db().evaluation.count({ where: { userId: actor.id, scholarshipId: s.id } })).toBe(
      2,
    );
    await db().user.delete({ where: { id: actor.id } });
  });
});

describe("meaningful profile versioning", () => {
  it("does not create a new profile version or event for JSONB key reordering or an unchanged stage save", async () => {
    const id = crypto.randomUUID();
    const actor = { id, name: "Test profile owner", email: `${id}@example.test`, role: "student" };
    await db().user.create({ data: actor });
    const profile = { targetLevel: "master", citizenships: ["Nigeria"], residence: "Ghana" };
    const first = await saveProfile(actor, profile, 0, 0);
    expect(first.version).toBe(1);
    const second = await saveProfile(
      actor,
      { residence: "Ghana", citizenships: ["Nigeria"], targetLevel: "master" },
      1,
      2,
    );
    expect(second.version).toBe(1);
    expect(second.stage).toBe(2);
    expect(await db().profileVersion.count({ where: { userId: id } })).toBe(1);
    expect(
      await db().outbox.count({
        where: { topic: "profile.changed", payload: { path: ["userId"], equals: id } },
      }),
    ).toBe(1);
    await db().user.delete({ where: { id } });
  });
});
