import { describe, expect, it } from "vitest";
import { db } from "../../src/lib/db";
import { saveProfile } from "../../src/server/profiles";
import { processOperatorJobs } from "../../src/server/operator/jobs";
import { applicationQueueHealth } from "../../src/server/jobs/run";
const operator = {
  id: "queue-test-operator",
  name: "Test operator",
  email: "operator@example.test",
  role: "operator",
};
describe("bounded application queue health", () => {
  it("reports the actual remaining backlog after a bounded batch and enforces operator permission", async () => {
    const id = crypto.randomUUID();
    const actor = {
      id,
      name: "[TEST ONLY] Queue student",
      email: `${id}@example.test`,
      role: "student",
    };
    await db().user.create({ data: actor });
    try {
      // Real profile saves create durable events. A ten-event batch cannot consume twelve.
      for (let version = 0; version < 12; version++)
        await saveProfile(
          actor,
          { targetLevel: "master", targetField: `Field ${version}` },
          version,
          3,
        );
      expect((await applicationQueueHealth()).ready).toBeGreaterThanOrEqual(12);
      await expect(processOperatorJobs(actor, 10)).rejects.toThrow("Operator");
      const result = await processOperatorJobs(operator, 10);
      expect(result.events.completed).toBeLessThanOrEqual(10);
      expect(result.queue.events).toBeGreaterThan(0);
      expect(result.queue.ready).toBeGreaterThan(0);
      const persisted = await applicationQueueHealth();
      expect(result.queue).toMatchObject({
        events: persisted.events,
        deliveries: persisted.deliveries,
        ready: persisted.ready,
        needsReview: persisted.needsReview,
      });
      expect(Number.isFinite(Date.parse(result.queue.checkedAt))).toBe(true);
    } finally {
      // Only this test's synthetic account events are cleaned up; unrelated history remains.
      await db().outbox.deleteMany({ where: { payload: { path: ["userId"], equals: id } } });
      await db().user.delete({ where: { id } });
    }
  });
});
