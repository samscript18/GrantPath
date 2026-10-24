import { describe, expect, it } from "vitest";
import { profileSchema } from "../../src/server/profiles/schema";
import { readEnv } from "../../src/lib/env";
describe("profile validation", () => {
  it("keeps incomplete information unknown and citizenship separate from residence", () => { const p = profileSchema.parse({ citizenships: ["Nigeria"], residence: "Ghana" }); expect(p.residence).toBe("Ghana"); expect(p.citizenships).toEqual(["Nigeria"]); expect(p.qualification).toBeUndefined(); expect(p.targetLevel).toBeUndefined(); });
  it("preserves zero and rejects results above original scale", () => { expect(profileSchema.parse({ experienceMonths: 0 }).experienceMonths).toBe(0); expect(profileSchema.safeParse({ gpa: { value: 4.5, scale: 4 } }).success).toBe(false); });
  it("rejects invalid dates, units and time zones", () => { for (const input of [{ birthDate: "2026-02-30" }, { experienceMonths: -2 }, { timeZone: "Mars/Base" }]) expect(profileSchema.safeParse(input).success).toBe(false); });
  it("rejects unsafe production configuration", () => { expect(() => readEnv({ NODE_ENV: "production", APP_ENV: "test", DATABASE_URL: "postgresql://localhost/test", BETTER_AUTH_URL: "http://localhost", BETTER_AUTH_SECRET: "x".repeat(32) })).toThrow("cannot run in production"); });
});
