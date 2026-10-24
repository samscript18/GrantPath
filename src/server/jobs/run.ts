import { drainOutbox } from "./outbox";
import {
  handleNotificationEvent,
  notificationTopics,
  scheduleReminders,
} from "@/server/notifications/events";
import { deliverBatch } from "@/server/notifications/delivery";
export async function runApplicationJobs(limit = 20) {
  const reminders = await scheduleReminders();
  const events = await drainOutbox(limit, {
    topics: notificationTopics,
    handler: handleNotificationEvent,
  });
  const deliveries = await deliverBatch(limit);
  return { reminders, events, deliveries };
}
