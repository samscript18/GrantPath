import { db } from "@/lib/db";
import type { Outbox } from "@/generated/prisma/client";
import { z } from "zod";
import { deliverSecurityEmail } from "./security";
import { prepareExport, eraseAccount } from "./privacy";
import { cleanMedia, queueMediaCleanup } from "./cloudinary";
import { digest } from "./secrets";
import { failEvent } from "@/server/jobs/outbox";
export const accountTopics = [
  "account.security-email",
  "account.export",
  "account.delete",
  "account.media-cleanup",
];
export async function handleAccountEvent(event: Outbox) {
  if (event.topic === "account.security-email")
    return deliverSecurityEmail(
      z.object({ challengeId: z.string() }).parse(event.payload).challengeId,
    );
  if (event.topic === "account.export")
    return prepareExport(z.object({ exportId: z.string() }).parse(event.payload).exportId);
  if (event.topic === "account.delete") {
    const p = z.object({ userId: z.string().optional() }).parse(event.payload);
    if (p.userId) await eraseAccount(p.userId);
    return;
  }
  if (event.topic === "account.media-cleanup")
    return cleanMedia(z.object({ assetId: z.string() }).parse(event.payload).assetId);
  throw new Error("Unrecognised account job.");
}
// Request-specific kick: no unrelated source, matching or notification work.
// The persisted job remains available to the standalone worker after interruption.
export async function kickAccountEvent(id: string) {
  const token = crypto.randomUUID();
  const now = new Date();
  const rows = await db().$queryRaw<
    Outbox[]
  >`UPDATE "Outbox" SET state='processing', attempts=attempts+1, "leaseToken"=${token}, "lockedUntil"=${new Date(now.getTime() + 120_000)} WHERE id=${id} AND topic=ANY(${accountTopics}::text[]) AND attempts < 6 AND "availableAt"<=${now} AND (state='pending' OR (state='processing' AND "lockedUntil"<${now})) RETURNING *`;
  const event = rows[0];
  if (!event) return;
  try {
    await handleAccountEvent(event);
    await db().outbox.updateMany({
      where: { id, leaseToken: token, state: "processing" },
      data: {
        state: "done",
        completedAt: new Date(),
        lockedUntil: null,
        leaseToken: null,
        error: null,
      },
    });
  } catch (error) {
    await failEvent(event, error);
  }
}
export async function maintainAccounts(limit = 25) {
  const now = new Date();
  await db().accountExport.updateMany({
    where: { expiresAt: { lte: now }, state: { not: "expired" } },
    data: { state: "expired", encryptedData: null },
  });
  await db().securityChallenge.updateMany({
    where: { expiresAt: { lte: now }, secret: { not: null } },
    data: { secret: null },
  });
  await db().emailSink.deleteMany({
    where: {
      key: { startsWith: "security:" },
      createdAt: { lt: new Date(now.getTime() - 86_400_000) },
    },
  });
  await db().securityChallenge.deleteMany({
    where: { expiresAt: { lt: new Date(now.getTime() - 7 * 86_400_000) } },
  });
  await db().accountExport.deleteMany({
    where: { expiresAt: { lt: new Date(now.getTime() - 7 * 86_400_000) } },
  });
  const abandoned = await db().mediaAsset.findMany({
    where: { state: "pending", cleanupAfter: { lte: now } },
    take: limit,
  });
  for (const asset of abandoned)
    await db().$transaction((tx) => queueMediaCleanup(tx, asset.publicId, asset.userId));
  const due = await db().accountDeletion.findMany({
    where: { scheduledAt: { lte: now } },
    take: limit,
  });
  for (const row of due)
    await db().outbox.upsert({
      where: {
        key: `account-deletion-due:${digest(`${row.userId}:${row.scheduledAt.toISOString()}`)}`,
      },
      create: {
        key: `account-deletion-due:${digest(`${row.userId}:${row.scheduledAt.toISOString()}`)}`,
        topic: "account.delete",
        payload: { userId: row.userId },
      },
      update: {},
    });
  return { abandonedUploads: abandoned.length, dueDeletions: due.length };
}
