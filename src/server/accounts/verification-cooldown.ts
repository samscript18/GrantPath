import { createHash } from "node:crypto";
import { db } from "@/lib/db";
export const VERIFICATION_WAIT_MS = 120_000;
export function verificationKey(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}
export async function verificationCooldown(email: string, now = new Date()) {
  const row = await db().verificationCooldown.findUnique({
    where: { key: verificationKey(email) },
  });
  return {
    retryAt: row?.nextAllowedAt.toISOString() || null,
    retryAfter: Math.max(
      0,
      Math.ceil(((row?.nextAllowedAt.getTime() || 0) - now.getTime()) / 1000),
    ),
  };
}
export async function claimVerification(email: string, now = new Date()) {
  const key = verificationKey(email);
  const next = new Date(now.getTime() + VERIFICATION_WAIT_MS);
  const rows = await db().$queryRaw<{ nextAllowedAt: Date }[]>`
    INSERT INTO "VerificationCooldown" (key, "nextAllowedAt", "updatedAt") VALUES (${key}, ${next}, ${now})
    ON CONFLICT (key) DO UPDATE SET "nextAllowedAt" = EXCLUDED."nextAllowedAt", "updatedAt" = EXCLUDED."updatedAt"
    WHERE "VerificationCooldown"."nextAllowedAt" <= ${now} RETURNING "nextAllowedAt"`;
  return { allowed: rows.length === 1, ...(await verificationCooldown(email, now)) };
}
