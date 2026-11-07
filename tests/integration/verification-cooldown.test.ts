import { describe, it, expect, vi } from "vitest";
import {
  claimVerification,
  verificationCooldown,
  verificationKey,
} from "../../src/server/accounts/verification-cooldown";
import { db } from "../../src/lib/db";
import { getAuth } from "../../src/server/accounts/auth";

describe("durable two-minute verification cooldown", () => {
  it("claims once concurrently, normalizes identity and accepts the exact expiry boundary", async () => {
    const email = `cooldown-${crypto.randomUUID()}@example.test`;
    const now = new Date("2026-01-01T00:00:00Z");
    try {
      const results = await Promise.all([
        claimVerification(email, now),
        claimVerification(email.toUpperCase(), now),
      ]);
      expect(results.filter((r) => r.allowed)).toHaveLength(1);
      expect(results.every((r) => r.retryAfter === 120)).toBe(true);
      expect((await claimVerification(email, new Date(now.getTime() + 119999))).allowed).toBe(
        false,
      );
      expect((await verificationCooldown(email, new Date(now.getTime() + 119999))).retryAfter).toBe(
        1,
      );
      expect((await claimVerification(email, new Date(now.getTime() + 120000))).allowed).toBe(true);
    } finally {
      await db().verificationCooldown.deleteMany({ where: { key: verificationKey(email) } });
    }
  });
  it("enforces the same wait after signup, across resend clients and direct API requests", async () => {
    const email = `resend-${crypto.randomUUID()}@example.test`;
    let client = 200;
    const post = (path: string, body: unknown) =>
      getAuth().handler(
        new Request(`http://127.0.0.1:3000/api/auth/${path}`, {
          method: "POST",
          headers: {
            Origin: "http://127.0.0.1:3000",
            "Content-Type": "application/json",
            "x-forwarded-for": `192.0.2.${client++}`,
          },
          body: JSON.stringify(body),
        }),
      );
    try {
      expect(
        (
          await post("sign-up/email", {
            name: "[TEST ONLY] Resend",
            email,
            password: "Isolated-test-passphrase-42",
          })
        ).status,
      ).toBe(200);
      const first = await db().emailSink.count({ where: { recipient: email } });
      expect(first).toBe(1);
      const blocked = await post("send-verification-email", { email });
      expect(blocked.status).toBe(429);
      expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(110);
      expect(await db().emailSink.count({ where: { recipient: email } })).toBe(1);
      const later = Date.now() + 120001;
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(later);
      expect((await post("send-verification-email", { email })).status).toBe(200);
      expect(await db().emailSink.count({ where: { recipient: email } })).toBe(2);
      expect((await post("send-verification-email", { email })).status).toBe(429);
    } finally {
      vi.useRealTimers();
      await db().emailSink.deleteMany({ where: { recipient: email } });
      await db().user.deleteMany({ where: { email } });
      await db().verificationCooldown.deleteMany({ where: { key: verificationKey(email) } });
    }
  });
});
