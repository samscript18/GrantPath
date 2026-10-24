import { Inngest } from "inngest";
import { drainOutbox } from "./outbox";
import {
  handleNotificationEvent,
  notificationTopics,
  scheduleReminders,
} from "@/server/notifications/events";
import { deliverBatch } from "@/server/notifications/delivery";
export const inngest = new Inngest({ id: "grantpath", eventKey: process.env.INNGEST_EVENT_KEY });
export const processApplicationJobs = inngest.createFunction(
  {
    id: "process-application-outbox",
    triggers: [{ cron: "17 * * * *" }, { event: "grantpath/jobs.requested" }],
    retries: 3,
    concurrency: 1,
  },
  async ({ step }) => {
    const reminders = await step.run("schedule-confirmed-reminders", () =>
      scheduleReminders(new Date(), 25),
    );
    const events = await step.run("drain-persisted-outbox", () =>
      drainOutbox(1, { topics: notificationTopics, handler: handleNotificationEvent }),
    );
    const deliveries = await step.run("deliver-with-current-preferences", () => deliverBatch(1));
    return { reminders, events, deliveries };
  },
);
