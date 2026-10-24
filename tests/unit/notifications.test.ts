import { describe, expect, it } from "vitest";
import { alertKey, preferencesSchema } from "../../src/server/notifications";
import { reminderEventKey } from "../../src/server/notifications/events";
describe("notification identity and defaults", () => {
  it("deduplicates the same tuple and separates topics, channels, users, cycles and events", () => {
    const base = {
      userId: "a",
      scholarshipId: "cycle-1",
      eventId: "v2",
      topic: "change" as const,
      channel: "inApp",
    };
    const key = alertKey(base);
    expect(alertKey({ ...base })).toBe(key);
    for (const changed of [
      { userId: "b" },
      { scholarshipId: "cycle-2" },
      { eventId: "v3" },
      { channel: "email" },
      { topic: "deadline" as const },
    ])
      expect(alertKey({ ...base, ...changed })).not.toBe(key);
  });
  it("starts email opted out and distinguishes reminder windows", () => {
    expect(preferencesSchema.parse({}).email).toBe(false);
    expect(reminderEventKey("a", "2027-01-15T12:00:00Z", 7)).not.toBe(
      reminderEventKey("a", "2027-01-15T12:00:00Z", 1),
    );
  });
});
