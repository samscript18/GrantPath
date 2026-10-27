import { describe, it, expect, afterEach } from "vitest";
import { db } from "../../src/lib/db";
import { processControlledReleaseSnapshot } from "../../src/server/discovery/service";
import { controlledFixturesEnabled } from "../../src/server/discovery/controlled";
import { evaluateStudent, studentAssessment } from "../../src/server/eligibility";
import { saveProfile } from "../../src/server/profiles";
import { saveOpportunity } from "../../src/server/applications";
import { savePreferences } from "../../src/server/notifications";
import { handleDomainEvent } from "../../src/server/jobs/outbox";
import { handleNotificationEvent } from "../../src/server/notifications/events";
import { claimDelivery, deliverClaimed } from "../../src/server/notifications/delivery";
import { operatorOverview } from "../../src/server/operator";
const operator = {
  id: "controlled-test-operator",
  name: "[TEST ONLY] Operator",
  email: "operator@example.test",
  role: "operator",
};
describe("isolated controlled sources use the real service and event pipeline", () => {
  afterEach(() => {
    delete process.env.ENABLE_CONTROLLED_FIXTURES;
  });
  it("requires an explicit isolated deployment and operator", async () => {
    expect(controlledFixturesEnabled()).toBe(false);
    await expect(processControlledReleaseSnapshot(operator, "valid")).rejects.toThrow("disabled");
    process.env.ENABLE_CONTROLLED_FIXTURES = "1";
    await expect(
      processControlledReleaseSnapshot({ ...operator, role: "student" }, "valid"),
    ).rejects.toThrow("Operator");
  });
  it("publishes a valid source, holds an ambiguous new candidate, recalculates and sends one alert then suppresses a reversal", async () => {
    process.env.ENABLE_CONTROLLED_FIXTURES = "1";
    const first = await processControlledReleaseSnapshot(operator, "valid");
    expect(["auto_publish", "unchanged"]).toContain(first.decision);
    if (!("scholarshipId" in first) || !first.scholarshipId)
      throw new Error("Missing actual published fixture");
    const scholarshipId = first.scholarshipId;
    const exception = await processControlledReleaseSnapshot(operator, "ambiguous");
    expect(exception.decision).toBe("review_required");
    expect(exception.reasonCodes).toContain("LEVEL_SEMANTICS_UNSUPPORTED");
    expect(
      await db().scholarship.count({
        where: { programme: { slug: "test-release-unresolved-programme" }, published: true },
      }),
    ).toBe(0);
    const id = crypto.randomUUID();
    const student = {
      id,
      name: "[TEST ONLY] Match student",
      email: `${id}@example.test`,
      role: "student",
    };
    await db().user.create({ data: student });
    await saveProfile(student, { targetLevel: "master" }, 0, 3);
    await saveOpportunity(student, scholarshipId);
    await evaluateStudent(id, scholarshipId);
    expect((await studentAssessment(student, scholarshipId)).evaluation?.outcome).toBe("eligible");
    const changed = await processControlledReleaseSnapshot(operator, "changed");
    expect(changed.decision).toBe("auto_publish");
    if (!("resultingVersion" in changed) || !changed.resultingVersion)
      throw new Error("Missing version");
    async function processChange(version: number) {
      const key = `scholarship:${scholarshipId}:${version}`;
      const event = await db().outbox.update({
        where: { key },
        data: {
          state: "processing",
          leaseToken: crypto.randomUUID(),
          lockedUntil: new Date(Date.now() + 120000),
        },
      });
      await handleDomainEvent(event);
      const alert = await db().outbox.findUniqueOrThrow({
        where: { key: `change:${scholarshipId}:v${version}:${id}` },
      });
      await handleNotificationEvent(alert);
      await handleNotificationEvent(alert);
      const deliveries = await db().delivery.findMany({
        where: { userId: id, eventId: alert.key },
      });
      for (const delivery of deliveries) {
        const claimed = await claimDelivery(delivery.id);
        if (claimed) await deliverClaimed(claimed);
      }
      return alert;
    }
    const alert = await processChange(changed.resultingVersion);
    const completed = await db().outbox.findUniqueOrThrow({
      where: { key: `scholarship:${scholarshipId}:${changed.resultingVersion}` },
    });
    const overview = await operatorOverview(operator);
    expect(overview.events.some((event) => event.id === completed.id)).toBe(false);
    expect(overview.recentEvents.find((event) => event.id === completed.id)?.state).toBe("done");
    const assessment = await studentAssessment(student, scholarshipId);
    expect(assessment.evaluation?.outcome).toBe("not_eligible");
    expect(
      assessment.evaluation?.assessment.leaves.some((l) => l.code === "VALUE_NOT_ACCEPTED"),
    ).toBe(true);
    expect(await db().notification.count({ where: { userId: id, eventId: alert.key } })).toBe(1);
    const replay = await processControlledReleaseSnapshot(operator, "changed");
    expect(replay.decision).toBe("unchanged");
    expect(await db().notification.count({ where: { userId: id, eventId: alert.key } })).toBe(1);
    await savePreferences(student, {
      newMatch: true,
      change: false,
      deadline: true,
      inApp: true,
      email: false,
    });
    const reversal = await processControlledReleaseSnapshot(operator, "valid");
    if (!("resultingVersion" in reversal) || !reversal.resultingVersion)
      throw new Error("Missing reversal");
    const reversed = await processChange(reversal.resultingVersion);
    expect(await db().notification.count({ where: { userId: id, eventId: reversed.key } })).toBe(0);
    await db().user.delete({ where: { id } });
  });
});
