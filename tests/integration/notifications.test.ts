import { describe, expect, it } from "vitest";
import { db } from "../../src/lib/db";
import { createOpportunity } from "../../src/server/operator";
import { saveOpportunity, unsaveOpportunity } from "../../src/server/applications";
import { queueAlert, savePreferences, markRead } from "../../src/server/notifications";
import {
  claimDelivery,
  deliverClaimed,
  deliveryDecision,
} from "../../src/server/notifications/delivery";
import {
  handleNotificationEvent,
  reminderEventKey,
  scheduleReminders,
} from "../../src/server/notifications/events";
import { testScholarship } from "../fixtures/scholarship";
import type { ScholarshipData } from "../../src/server/scholarships/schema";
const operator = {
  id: "test-operator",
  name: "Test operator",
  email: "operator@example.test",
  role: "operator",
};
async function fixture(data: ScholarshipData = testScholarship()) {
  const tag = crypto.randomUUID();
  const actor = {
    id: tag,
    name: "Test alert owner",
    email: `${tag}@example.test`,
    role: "student",
  };
  await db().user.create({ data: actor });
  const s = await createOpportunity(operator, {
    slug: `notify-${tag}`,
    cycle: "TEST 2027",
    programmeSlug: `notify-prog-${tag}`,
    providerSlug: `notify-provider-${tag}`,
    providerName: "[TEST ONLY] Provider",
    providerUrl: "https://www.ucl.ac.uk",
    data,
    reason: "Isolated notification test fixture.",
  });
  await saveOpportunity(actor, s.id);
  return { actor, s };
}
const all = { newMatch: true, change: true, deadline: true, inApp: true, email: true };
async function deliver(id: string, now = new Date()) {
  const claimed = await claimDelivery(id, now);
  if (!claimed) throw new Error("Delivery was not claimable");
  return deliverClaimed(claimed, now);
}
describe("durable preference-aware notifications", () => {
  it("advances a bounded reminder scan past already queued rows, including millisecond identities", async () => {
    const data = testScholarship();
    data.deadline = "2041-01-15T12:00:00.123Z";
    const a = await fixture(data);
    const b = await fixture(data);
    const now = new Date("2041-01-08T12:00:00.123Z");
    // Prior isolated runs are durable too. Fully scan this window first, then
    // create a fresh pair so a limit of one must progress across both records.
    for (let count = 0; count < 100; count++)
      if ((await scheduleReminders(now, 100)).queued === 0) break;
    const c = await fixture(data);
    const d = await fixture(data);
    expect((await scheduleReminders(now, 1)).queued).toBe(1);
    expect((await scheduleReminders(now, 1)).queued).toBe(1);
    expect((await scheduleReminders(now, 1)).queued).toBe(0);
    for (const entry of [c, d])
      expect(
        await db().outbox.count({
          where: { key: reminderEventKey(entry.s.id, data.deadline!, 7) },
        }),
      ).toBe(1);
    await db().user.deleteMany({
      where: { id: { in: [a.actor.id, b.actor.id, c.actor.id, d.actor.id] } },
    });
  });
  it("creates one inbox item and one isolated email across replay and concurrent queueing, with private read states", async () => {
    const { actor, s } = await fixture();
    await savePreferences(actor, all);
    const alert = {
      userId: actor.id,
      scholarshipId: s.id,
      eventId: `test-event:${crypto.randomUUID()}`,
      topic: "change" as const,
      title: "[TEST ONLY] Changed condition",
      body: "Controlled accepted change, isolated from public data.",
      href: `/scholarships/${s.slug}?version=1#history`,
    };
    await Promise.all([queueAlert(alert), queueAlert(alert)]);
    const deliveries = await db().delivery.findMany({ where: { userId: actor.id } });
    expect(deliveries).toHaveLength(2);
    for (const delivery of deliveries) await deliver(delivery.id);
    expect(await db().notification.count({ where: { userId: actor.id } })).toBe(1);
    expect(await db().emailSink.count({ where: { recipient: actor.email } })).toBe(1);
    expect(
      (await db().delivery.findMany({ where: { userId: actor.id } })).map((d) => d.state).sort(),
    ).toEqual(["captured", "published"]);
    await queueAlert(alert);
    expect(await db().delivery.count({ where: { userId: actor.id } })).toBe(2);
    for (const delivery of deliveries) expect(await claimDelivery(delivery.id)).toBeNull();
    const notification = await db().notification.findFirstOrThrow({ where: { userId: actor.id } });
    expect((await markRead({ ...actor, id: "another-student" }, notification.id)).count).toBe(0);
    expect((await markRead(actor, notification.id)).count).toBe(1);
    expect((await markRead(actor, notification.id)).count).toBe(0);
    await db().emailSink.deleteMany({ where: { recipient: actor.email } });
    await db().user.delete({ where: { id: actor.id } });
  });
  it("checks disabled topics and unsaved subscriptions at delivery, including already queued messages", async () => {
    const { actor, s } = await fixture();
    await savePreferences(actor, all);
    const alert = {
      userId: actor.id,
      scholarshipId: s.id,
      eventId: `queued:${crypto.randomUUID()}`,
      topic: "change" as const,
      title: "[TEST ONLY] Queued alert",
      body: "Controlled queued alert.",
      href: `/scholarships/${s.slug}`,
    };
    await queueAlert(alert);
    await savePreferences(actor, { ...all, change: false });
    for (const d of await db().delivery.findMany({ where: { userId: actor.id } }))
      expect((await deliver(d.id)).state).toBe("suppressed");
    expect(await db().notification.count({ where: { userId: actor.id } })).toBe(0);
    expect(await db().emailSink.count({ where: { recipient: actor.email } })).toBe(0);
    await savePreferences(actor, all);
    await queueAlert({ ...alert, eventId: `unsaved:${crypto.randomUUID()}` });
    await unsaveOpportunity(actor, s.id);
    for (const d of await db().delivery.findMany({ where: { userId: actor.id, state: "pending" } }))
      expect((await deliver(d.id)).state).toBe("suppressed");
    await db().user.delete({ where: { id: actor.id } });
  });
  it("recovers a captured-email interruption without duplication and refuses blind retry outside the idempotency window", async () => {
    const { actor, s } = await fixture();
    await savePreferences(actor, all);
    await queueAlert({
      userId: actor.id,
      scholarshipId: s.id,
      eventId: `crash:${crypto.randomUUID()}`,
      topic: "change",
      title: "[TEST ONLY] Recovery",
      body: "Simulated interruption after provider request.",
      href: `/scholarships/${s.slug}`,
    });
    const delivery = await db().delivery.findFirstOrThrow({
      where: { userId: actor.id, channel: "email" },
    });
    const at = new Date();
    await db().emailSink.create({
      data: {
        key: `grantpath-delivery:${delivery.id}`,
        recipient: actor.email,
        subject: delivery.subject,
        body: "Simulated prior isolated capture.",
      },
    });
    await db().delivery.update({
      where: { id: delivery.id },
      data: {
        state: "processing",
        attempts: 1,
        lockedUntil: new Date(at.getTime() - 1),
        leaseToken: "interrupted-owner",
      },
    });
    await db().deliveryAttempt.create({
      data: { deliveryId: delivery.id, number: 1, state: "started", createdAt: at },
    });
    expect((await deliver(delivery.id, new Date(at.getTime() + 1000))).state).toBe("captured");
    expect(await db().emailSink.count({ where: { recipient: actor.email } })).toBe(1);
    await db().delivery.update({
      where: { id: delivery.id },
      data: {
        state: "processing",
        lockedUntil: new Date(at.getTime() + 1000),
        leaseToken: "another-interruption",
      },
    });
    expect((await deliver(delivery.id, new Date(at.getTime() + 24 * 3600000))).state).toBe(
      "uncertain",
    );
    expect(await db().emailSink.count({ where: { recipient: actor.email } })).toBe(1);
    await db().emailSink.deleteMany({ where: { recipient: actor.email } });
    await db().user.delete({ where: { id: actor.id } });
  });
  it("schedules only confirmed open deadlines at seven and one day, with replay deduplication", async () => {
    const known = await fixture();
    const unknownData = testScholarship();
    unknownData.deadline = null;
    unknownData.deadlineState = "unknown";
    const unknown = await fixture(unknownData);
    const closedData = testScholarship();
    closedData.availability = "closed";
    const closed = await fixture(closedData);
    const day7 = new Date("2027-01-08T12:00:00Z");
    await scheduleReminders(day7);
    await scheduleReminders(day7);
    const key7 = reminderEventKey(known.s.id, "2027-01-15T12:00:00Z", 7);
    const event = await db().outbox.findUniqueOrThrow({ where: { key: key7 } });
    expect(await db().outbox.count({ where: { key: key7 } })).toBe(1);
    await handleNotificationEvent(event);
    await handleNotificationEvent(event);
    expect(await db().delivery.count({ where: { userId: known.actor.id, eventId: key7 } })).toBe(2);
    const delayed = await db().delivery.findFirstOrThrow({
      where: { userId: known.actor.id, eventId: key7, channel: "inApp" },
    });
    expect((await deliveryDecision(delayed, db(), day7)).allowed).toBe(true);
    expect((await deliver(delayed.id, new Date("2027-01-14T12:00:00Z"))).state).toBe("suppressed");
    expect(
      await db().notification.count({ where: { userId: known.actor.id, eventId: key7 } }),
    ).toBe(0);
    expect(
      await db().outbox.count({
        where: {
          topic: "deadline.ready",
          payload: { path: ["scholarshipId"], equals: unknown.s.id },
        },
      }),
    ).toBe(0);
    expect(
      await db().outbox.count({
        where: {
          topic: "deadline.ready",
          payload: { path: ["scholarshipId"], equals: closed.s.id },
        },
      }),
    ).toBe(0);
    await scheduleReminders(new Date("2027-01-14T12:00:00Z"));
    expect(
      await db().outbox.count({
        where: { key: reminderEventKey(known.s.id, "2027-01-15T12:00:00Z", 1) },
      }),
    ).toBe(1);
    await db().user.deleteMany({
      where: { id: { in: [known.actor.id, unknown.actor.id, closed.actor.id] } },
    });
  });
});
