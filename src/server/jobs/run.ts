import { accountTopics, handleAccountEvent, maintainAccounts } from "@/server/accounts/jobs";
import { drainOutbox } from "./outbox";
import {
  handleNotificationEvent,
  notificationTopics,
  scheduleReminders,
} from "@/server/notifications/events";
import { deliverBatch } from "@/server/notifications/delivery";
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
  return { accounts, reminders, events, deliveries };
}
