import { accountTopics, handleAccountEvent, maintainAccounts } from "@/server/accounts/jobs";
import { db } from "@/lib/db";
import { drainOutbox, domainTopics } from "./outbox";
import {
  handleNotificationEvent,
  notificationTopics,
  scheduleReminders,
} from "@/server/notifications/events";
import { deliverBatch } from "@/server/notifications/delivery";
export async function applicationQueueHealth(now = new Date()) {
  const topics = [...domainTopics, ...notificationTopics, ...accountTopics];
  const active = { state: { in: ["pending", "processing"] } };
  const runnable = {
    availableAt: { lte: now },
    OR: [{ state: "pending" }, { state: "processing", lockedUntil: { lt: now } }],
  };
  const [events, deliveries, readyEvents, readyDeliveries, failedEvents, failedDeliveries] =
    await Promise.all([
      db().outbox.count({ where: { ...active, topic: { in: topics } } }),
      db().delivery.count({ where: active }),
      db().outbox.count({ where: { ...runnable, topic: { in: topics }, attempts: { lt: 6 } } }),
      db().delivery.count({ where: { ...runnable, attempts: { lt: 5 } } }),
      db().outbox.count({ where: { state: "failed", topic: { in: topics } } }),
      db().delivery.count({ where: { state: { in: ["failed", "uncertain"] } } }),
    ]);
  return {
    checkedAt: now.toISOString(),
    events,
    deliveries,
    ready: readyEvents + readyDeliveries,
    needsReview: failedEvents + failedDeliveries,
  };
}
export async function runApplicationJobs(limit = 20) {
  const accounts = await maintainAccounts(limit);
  const reminders = await scheduleReminders();
  const events = await drainOutbox(limit, {
    topics: [...notificationTopics, ...accountTopics],
    handler: (event) =>
      accountTopics.includes(event.topic)
        ? handleAccountEvent(event)
        : handleNotificationEvent(event),
  });
  const deliveries = await deliverBatch(limit);
  return { accounts, reminders, events, deliveries, queue: await applicationQueueHealth() };
}
