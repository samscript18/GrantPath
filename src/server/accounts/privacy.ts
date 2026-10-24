import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { HttpError } from "@/lib/http";
import type { Actor } from "./auth";
import { digest, sameDigest, seal, unseal } from "./secrets";
import { lockAccount } from "./security";
import { queueMediaCleanup } from "./cloudinary";
import { verificationKey } from "./verification-cooldown";

export async function privacyStatus(actor: Actor) {
  const [deletion, exports] = await Promise.all([
    db().accountDeletion.findUnique({ where: { userId: actor.id } }),
    db().accountExport.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, state: true, createdAt: true, expiresAt: true, error: true },
    }),
  ]);
  return {
    deletion: deletion
      ? {
          createdAt: deletion.createdAt.toISOString(),
          scheduledAt: deletion.scheduledAt.toISOString(),
        }
      : null,
    exports: await Promise.all(
      exports.map(async (row) => {
        const job =
          row.state === "pending"
            ? await db().outbox.findUnique({
                where: { key: `account-export:${row.id}` },
                select: { state: true },
              })
            : null;
        return {
          ...row,
          createdAt: row.createdAt.toISOString(),
          expiresAt: row.expiresAt.toISOString(),
          state:
            row.expiresAt < new Date() && row.state !== "downloaded"
              ? "expired"
              : job?.state === "failed"
                ? "failed"
                : row.state,
          error:
            job?.state === "failed"
              ? "Preparation could not finish. Request another export or contact the administrator."
              : row.error,
        };
      }),
    ),
  };
}
export async function requestExport(actor: Actor) {
  const token = randomBytes(32).toString("hex");
  const id = randomUUID();
  return db().$transaction(async (tx) => {
    await lockAccount(tx, actor.id);
    const last = await tx.accountExport.findFirst({
      where: { userId: actor.id },
      orderBy: { createdAt: "desc" },
    });
    if (last && last.createdAt.getTime() > Date.now() - 300_000)
      throw new HttpError(
        429,
        "Wait five minutes before requesting another export. Keep this page open for your current download.",
      );
    // A new request invalidates older downloads; plaintext tokens are never retained.
    await tx.accountExport.updateMany({
      where: { userId: actor.id, state: { in: ["pending", "ready"] } },
      data: { state: "expired", encryptedData: null },
    });
    await tx.accountExport.create({
      data: {
        id,
        userId: actor.id,
        tokenHash: digest(token),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    const event = await tx.outbox.create({
      data: { key: `account-export:${id}`, topic: "account.export", payload: { exportId: id } },
    });
    return { id, token, eventId: event.id };
  });
}
export async function prepareExport(exportId: string) {
  try {
    await db().$transaction(
      async (tx) => {
        const exportRow = await tx.accountExport.findUnique({ where: { id: exportId } });
        if (!exportRow) return;
        await lockAccount(tx, exportRow.userId);
        if (exportRow.state !== "pending" || exportRow.expiresAt <= new Date()) return;
        const user = await tx.user.findUniqueOrThrow({
          where: { id: exportRow.userId },
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            image: true,
            role: true,
            authMethod: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        const sizes = await Promise.all([
          tx.profileVersion.count({ where: { userId: user.id } }),
          tx.application.count({ where: { userId: user.id } }),
          tx.applicationHistory.count({ where: { application: { userId: user.id } } }),
          tx.evaluation.count({ where: { userId: user.id } }),
          tx.notification.count({ where: { userId: user.id } }),
          tx.session.count({ where: { userId: user.id } }),
          tx.delivery.count({ where: { userId: user.id } }),
        ]);
        if (sizes.reduce((sum, value) => sum + value, 0) > 10_000)
          throw new Error("Export exceeds the automatic record limit; contact the administrator.");
        const profile = await tx.profile.findUnique({
          where: { userId: user.id },
          include: { versions: true },
        });
        const applications = await tx.application.findMany({
          where: { userId: user.id },
          include: {
            history: true,
            scholarship: { select: { slug: true, title: true, cycle: true } },
          },
        });
        const evaluations = await tx.evaluation.findMany({ where: { userId: user.id } });
        const notifications = await tx.notification.findMany({ where: { userId: user.id } });
        const preferences = await tx.notificationPreference.findUnique({
          where: { userId: user.id },
        });
        const sessions = await tx.session.findMany({
          where: { userId: user.id },
          select: { userAgent: true, createdAt: true, updatedAt: true, expiresAt: true },
        });
        const deliveries = await tx.delivery.findMany({
          where: { userId: user.id },
          select: {
            topic: true,
            channel: true,
            subject: true,
            body: true,
            state: true,
            createdAt: true,
            acceptedAt: true,
          },
        });
        const deletion = await tx.accountDeletion.findUnique({ where: { userId: user.id } });
        const json = JSON.stringify(
          {
            format: "GrantPath account export v1",
            preparedAt: new Date().toISOString(),
            user,
            profile,
            applications,
            evaluations,
            notifications,
            preferences,
            sessions,
            deliveries,
            deletion,
          },
          null,
          2,
        );
        if (Buffer.byteLength(json) > 20_000_000)
          throw new Error("Export exceeds the automatic size limit; contact the administrator.");
        await tx.accountExport.updateMany({
          where: { id: exportId, state: "pending" },
          data: {
            encryptedData: seal(json, `export:${user.id}:${exportId}`),
            state: "ready",
            error: null,
          },
        });
      },
      { isolationLevel: "RepeatableRead", timeout: 30_000 },
    );
  } catch (error) {
    await db().accountExport.updateMany({
      where: { id: exportId, state: "pending" },
      data: {
        error:
          error instanceof Error && error.message.startsWith("Export exceeds")
            ? error.message
            : "Preparation was interrupted. A persisted job will retry; contact the administrator if it remains pending.",
      },
    });
    throw new Error("Account export preparation failed; retry is persisted.");
  }
}
export async function downloadExport(actor: Actor, input: unknown) {
  const { id, token } = z
    .object({ id: z.uuid(), token: z.string().regex(/^[a-f0-9]{64}$/) })
    .strict()
    .parse(input);
  return db().$transaction(async (tx) => {
    await lockAccount(tx, actor.id);
    const row = await tx.accountExport.findFirst({ where: { id, userId: actor.id } });
    if (
      !row ||
      !sameDigest(row.tokenHash, digest(token)) ||
      row.expiresAt <= new Date() ||
      row.state !== "ready" ||
      !row.encryptedData
    )
      throw new HttpError(
        409,
        "This one-time download is not ready, expired, or has already been used.",
      );
    const json = unseal(row.encryptedData, `export:${actor.id}:${row.id}`);
    await tx.accountExport.update({
      where: { id },
      data: { state: "downloaded", consumedAt: new Date(), encryptedData: null },
    });
    return json;
  });
}
export async function cancelDeletion(actor: Actor) {
  return db().$transaction(async (tx) => {
    await lockAccount(tx, actor.id);
    const row = await tx.accountDeletion.findUnique({ where: { userId: actor.id } });
    if (!row) return { cancelled: true };
    if (row.scheduledAt <= new Date())
      throw new HttpError(409, "The cancellation period has ended. Contact the administrator.");
    await tx.accountDeletion.delete({ where: { userId: actor.id } });
    await tx.outbox.updateMany({
      where: {
        topic: "account.delete",
        payload: { path: ["userId"], equals: actor.id },
        state: { in: ["pending", "failed"] },
      },
      data: { state: "done", completedAt: new Date(), payload: {}, error: null },
    });
    return { cancelled: true };
  });
}
export async function eraseAccount(userId: string) {
  await db().$transaction(async (tx) => {
    // The row lock also serialises a last-moment cancellation and any avatar upload.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
    const deletion = await tx.accountDeletion.findUnique({ where: { userId } });
    if (!deletion || deletion.scheduledAt > new Date()) return;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const assets = await tx.mediaAsset.findMany({ where: { userId } });
    for (const asset of assets) await queueMediaCleanup(tx, asset.publicId, userId);
    // Revoke before cascade and remove direct personal references in durable queues.
    await tx.outbox.deleteMany({
      where: { payload: { path: ["userId"], equals: userId }, topic: { not: "account.delete" } },
    });
    const challenges = await tx.securityChallenge.findMany({
      where: { userId },
      select: { id: true },
    });
    const exports = await tx.accountExport.findMany({ where: { userId }, select: { id: true } });
    await tx.outbox.deleteMany({
      where: {
        key: {
          in: [
            ...challenges.map((c) => `security-email:${c.id}`),
            ...exports.map((e) => `account-export:${e.id}`),
          ],
        },
      },
    });
    await tx.verification.deleteMany({
      where: { OR: [{ value: userId }, { identifier: user.email }] },
    });
    await tx.emailSink.deleteMany({ where: { recipient: user.email } });
    await tx.verificationCooldown.deleteMany({ where: { key: verificationKey(user.email) } });
    await tx.rateLimit.deleteMany({
      where: { key: { startsWith: "mutation:", endsWith: `:${userId}` } },
    });
    // Shared source edits retain their history, attributed to an erased account.
    await tx.audit.updateMany({
      where: { actorId: userId },
      data: { actorId: "deleted-account", before: Prisma.DbNull, after: Prisma.DbNull },
    });
    await tx.scholarshipVersion.updateMany({
      where: { actorId: userId },
      data: { actorId: "deleted-account" },
    });
    await tx.review.updateMany({
      where: { actorId: userId },
      data: { actorId: "deleted-account" },
    });
    await tx.mediaAsset.updateMany({ where: { userId }, data: { userId: "deleted-account" } });
    await tx.user.delete({ where: { id: userId } });
    await tx.outbox.updateMany({
      where: { topic: "account.delete", payload: { path: ["userId"], equals: userId } },
      data: { payload: {} },
    });
  });
}
