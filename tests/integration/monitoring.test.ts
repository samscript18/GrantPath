import { describe, it, expect } from "vitest";
import { db } from "../../src/lib/db";
import { createOpportunity } from "../../src/server/operator";
import { saveProfile } from "../../src/server/profiles";
import { processSourceHtml, decideReview, recordSourceFailure } from "../../src/server/monitoring";
import { evaluateStudent, studentAssessment } from "../../src/server/eligibility";
import { handleDomainEvent } from "../../src/server/jobs/outbox";
import { saveOpportunity } from "../../src/server/applications";
import { ENGINE_VERSION } from "../../src/server/eligibility/engine";
import { testScholarship } from "../fixtures/scholarship";
import { uclSnapshot } from "../fixtures/source";
const operator = {
  id: "test-operator",
  name: "Test operator",
  email: "operator@example.test",
  role: "operator",
};
async function processEvent(key: string) {
  const event = await db().outbox.update({
    where: { key },
    data: {
      state: "processing",
      leaseToken: crypto.randomUUID(),
      lockedUntil: new Date(Date.now() + 120000),
      attempts: { increment: 1 },
    },
  });
  await handleDomainEvent(event);
}
describe("controlled snapshots use the production processing path", () => {
  it("reviews a requirement change, updates exact matching, ignores unchanged replay and retains facts on outage", async () => {
    const tag = crypto.randomUUID();
    const actor = { id: tag, name: "Test student", email: `${tag}@example.test`, role: "student" };
    await db().user.create({ data: actor });
    await saveProfile(actor, { targetLevel: "master" }, 0, 3);
    const s = await createOpportunity(operator, {
      slug: `monitor-${tag}`,
      cycle: "TEST 2027",
      programmeSlug: `monitor-prog-${tag}`,
      providerSlug: `monitor-provider-${tag}`,
      providerName: "[TEST ONLY] Provider",
      providerUrl: "https://www.ucl.ac.uk",
      data: testScholarship(),
      reason: "Isolated monitoring test fixture.",
    });
    await saveOpportunity(actor, s.id);
    const source = await db().source.create({
      data: {
        scholarshipId: s.id,
        url: `https://www.ucl.ac.uk/scholarships/ucl-global-masters-scholarship?isolated=${tag}`,
        adapter: "ucl-scholarship",
        enabled: false,
      },
    });
    const first = await processSourceHtml(source.id, uclSnapshot(), {
      controlled: true,
      now: new Date("2026-10-24T12:00:00Z"),
    });
    expect(first.state).toBe("review");
    if (!("reviewId" in first)) throw new Error("Missing review");
    await decideReview(operator, first.reviewId!, {
      decision: "accept",
      reason: "Checked the controlled source baseline against the isolated fixture.",
      confirmedFields: [
        "source.levels",
        "source.funding",
        "source.requirements",
        "source.deadline",
        "source.status",
        "deadline",
      ],
    });
    await evaluateStudent(actor.id, s.id);
    expect((await studentAssessment(actor, s.id)).evaluation?.outcome).toBe("eligible");
    const changed = await processSourceHtml(source.id, uclSnapshot("All Undergraduate degrees"), {
      controlled: true,
      now: new Date("2026-10-25T12:00:00Z"),
    });
    expect(changed.state).toBe("review");
    const before = await db().scholarship.findUniqueOrThrow({ where: { id: s.id } });
    expect(before.level).toBe("master");
    if (!("reviewId" in changed)) throw new Error("Missing change review");
    await expect(
      decideReview(actor, changed.reviewId!, {
        decision: "accept",
        reason: "Students cannot approve source changes.",
        confirmedFields: ["levels"],
      }),
    ).rejects.toThrow("Operator");
    await decideReview(operator, changed.reviewId!, {
      decision: "accept",
      reason: "Checked the changed target level in the controlled source snapshot.",
      confirmedFields: [
        "levels",
        "source.levels",
        "source.funding",
        "source.requirements",
        "source.deadline",
        "source.status",
      ],
    });
    await processEvent(`scholarship:${s.id}:${before.version + 1}`);
    await processEvent(`evaluate:${actor.id}:p1:${s.id}:v${before.version + 1}:e${ENGINE_VERSION}`);
    const latest = await studentAssessment(actor, s.id);
    expect(latest.evaluation?.outcome).toBe("not_eligible");
    expect(latest.evaluation?.assessment.leaves.some((r) => r.code === "VALUE_NOT_ACCEPTED")).toBe(
      true,
    );
    const count = await db().outbox.count({
      where: { topic: "scholarship.changed", payload: { path: ["scholarshipId"], equals: s.id } },
    });
    const replay = await processSourceHtml(
      source.id,
      uclSnapshot("All Undergraduate degrees", "Unrelated nav change"),
      { controlled: true, now: new Date("2026-10-26T12:00:00Z") },
    );
    expect(replay.state).toBe("unchanged");
    expect(
      await db().outbox.count({
        where: { topic: "scholarship.changed", payload: { path: ["scholarshipId"], equals: s.id } },
      }),
    ).toBe(count);
    const fresh = await db().source.findUniqueOrThrow({ where: { id: source.id } });
    await recordSourceFailure(
      source.id,
      "Controlled source outage",
      503,
      undefined,
      new Date("2026-10-27T12:00:00Z"),
    );
    const failed = await db().source.findUniqueOrThrow({ where: { id: source.id } });
    expect(failed.lastSuccessAt).toEqual(fresh.lastSuccessAt);
    expect(failed.lastAttemptAt!.getTime()).toBeGreaterThan(fresh.lastSuccessAt!.getTime());
    expect((await db().scholarship.findUniqueOrThrow({ where: { id: s.id } })).version).toBe(
      before.version + 1,
    );
    const versions = await db().scholarshipVersion.findMany({
      where: { scholarshipId: s.id },
      orderBy: { number: "asc" },
    });
    expect(versions).toHaveLength(3);
    expect((versions[0].data as { levels: string[] }).levels).toEqual(["master"]);
    await db().user.delete({ where: { id: actor.id } });
  });
});
