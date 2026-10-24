import { db } from "@/lib/db";
import { ENGINE_VERSION } from "@/server/eligibility/engine";
import { evaluateStudent } from "@/server/eligibility";
import { z } from "zod";
import type { Outbox, Prisma } from "@/generated/prisma/client";
const profileEvent = z.object({
  userId: z.string(),
  version: z.number().int(),
  cursor: z.string().optional(),
});
const scholarshipEvent = z.object({
  scholarshipId: z.string(),
  version: z.number().int(),
  previousVersion: z.number().int(),
  cursor: z.string().optional(),
});
const evaluationJob = z.object({
  userId: z.string(),
  scholarshipId: z.string(),
  profileVersion: z.number().int(),
  scholarshipVersion: z.number().int(),
});
async function queueEvaluation(
  tx: Prisma.TransactionClient,
  userId: string,
  profileVersion: number,
  scholarshipId: string,
  scholarshipVersion: number,
) {
  const key = `evaluate:${userId}:p${profileVersion}:${scholarshipId}:v${scholarshipVersion}:e${ENGINE_VERSION}`;
  await tx.outbox.upsert({
    where: { key },
    create: {
      key,
      topic: "evaluation.requested",
      payload: { userId, profileVersion, scholarshipId, scholarshipVersion },
    },
    update: {},
  });
}
async function markDone(tx: Prisma.TransactionClient, event: Outbox) {
  const done = await tx.outbox.updateMany({
    where: { id: event.id, state: "processing", leaseToken: event.leaseToken },
    data: {
      state: "done",
      completedAt: new Date(),
      lockedUntil: null,
      leaseToken: null,
      error: null,
    },
  });
  if (!done.count) throw new Error("This outbox lease is no longer owned.");
}
export async function handleDomainEvent(event: Outbox) {
  if (event.topic === "evaluation.requested") {
    const p = evaluationJob.parse(event.payload);
    await evaluateStudent(p.userId, p.scholarshipId, {
      profileVersion: p.profileVersion,
      scholarshipVersion: p.scholarshipVersion,
    });
    return db().$transaction((tx) => markDone(tx, event));
  }
  if (event.topic === "profile.changed") {
    const p = profileEvent.parse(event.payload);
    return db().$transaction(async (tx) => {
      const profile = await tx.profile.findUnique({ where: { userId: p.userId } });
      if (profile?.version === p.version) {
        const rows = await tx.scholarship.findMany({
          where: { published: true, ...(p.cursor ? { id: { gt: p.cursor } } : {}) },
          orderBy: { id: "asc" },
          take: 50,
        });
        for (const s of rows) await queueEvaluation(tx, p.userId, p.version, s.id, s.version);
        if (rows.length === 50) {
          const cursor = rows.at(-1)!.id;
          const key = `profile:${p.userId}:${p.version}:after:${cursor}`;
          await tx.outbox.upsert({
            where: { key },
            create: { key, topic: event.topic, payload: { ...p, cursor } },
            update: {},
          });
        }
      }
      await markDone(tx, event);
    });
  }
  if (event.topic === "scholarship.changed") {
    const p = scholarshipEvent.parse(event.payload);
    return db().$transaction(async (tx) => {
      const s = await tx.scholarship.findUnique({
        where: { id: p.scholarshipId },
        include: { versions: { where: { number: p.version }, take: 1 } },
      });
      if (s) {
        const users = await tx.user.findMany({
          where: p.cursor ? { id: { gt: p.cursor } } : {},
          orderBy: { id: "asc" },
          take: 50,
          include: {
            profile: true,
            applications: { where: { scholarshipId: p.scholarshipId, saved: true } },
          },
        });
        for (const user of users) {
          if (user.profile && s.version === p.version)
            await queueEvaluation(tx, user.id, user.profile.version, s.id, p.version);
          if (
            p.previousVersion > 0 &&
            user.applications.some((a) => a.createdAt <= s.versions[0].createdAt)
          ) {
            const key = `change:${s.id}:v${p.version}:${user.id}`;
            await tx.outbox.upsert({
              where: { key },
              create: {
                key,
                topic: "change.ready",
                payload: {
                  userId: user.id,
                  scholarshipId: s.id,
                  version: p.version,
                  previousVersion: p.previousVersion,
                },
              },
              update: {},
            });
          }
        }
        if (users.length === 50) {
          const cursor = users.at(-1)!.id;
          const key = `scholarship:${s.id}:${p.version}:after:${cursor}`;
          await tx.outbox.upsert({
            where: { key },
            create: { key, topic: event.topic, payload: { ...p, cursor } },
            update: {},
          });
        }
      }
      await markDone(tx, event);
    });
  }
  throw new Error(`No registered handler for topic ${event.topic}.`);
}
export const domainTopics = ["profile.changed", "scholarship.changed", "evaluation.requested"];
export async function claimEvent(topics: string[] = domainTopics, now = new Date()) {
  await db().outbox.updateMany({
    where: {
      topic: { in: topics },
      state: "processing",
      attempts: { gte: 6 },
      lockedUntil: { lt: now },
    },
    data: {
      state: "failed",
      leaseToken: null,
      lockedUntil: null,
      error:
        "The last permitted attempt was interrupted. Operator review is required before retrying.",
    },
  });
  const token = crypto.randomUUID();
  const rows = await db().$queryRaw<
    Outbox[]
  >`WITH candidate AS (SELECT id FROM "Outbox" WHERE topic = ANY(${topics}::text[]) AND attempts < 6 AND "availableAt" <= ${now} AND (state = 'pending' OR (state = 'processing' AND "lockedUntil" < ${now})) ORDER BY "createdAt", id FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE "Outbox" o SET state = 'processing', attempts = attempts + 1, "leaseToken" = ${token}, "lockedUntil" = ${new Date(now.getTime() + 120000)} FROM candidate WHERE o.id = candidate.id RETURNING o.*`;
  return rows[0] || null;
}
export async function failEvent(event: Outbox, error: unknown, now = new Date()) {
  return db().outbox.updateMany({
    where: { id: event.id, leaseToken: event.leaseToken, state: "processing" },
    data: {
      state: event.attempts >= 6 ? "failed" : "pending",
      availableAt: new Date(now.getTime() + Math.min(3600000, 15000 * 2 ** event.attempts)),
      lockedUntil: null,
      leaseToken: null,
      error: (error instanceof Error ? error.message : "Event processing failed").slice(0, 1000),
    },
  });
}
export async function drainOutbox(
  limit = 25,
  extra?: { topics: string[]; handler: (event: Outbox) => Promise<unknown> },
) {
  let completed = 0;
  let failed = 0;
  for (let i = 0; i < Math.max(1, Math.min(limit, 50)); i++) {
    const event = await claimEvent([...domainTopics, ...(extra?.topics || [])]);
    if (!event) break;
    try {
      if (extra?.topics.includes(event.topic)) {
        await extra.handler(event);
        await db().$transaction((tx) => markDone(tx, event));
      } else await handleDomainEvent(event);
      completed++;
    } catch (error) {
      await failEvent(event, error);
      failed++;
    }
  }
  return { completed, failed };
}
export async function retryFailedEvent(
  actor: import("@/server/accounts/auth").Actor,
  id: string,
  reason: string,
) {
  const { requireOperator } = await import("@/server/accounts/auth");
  requireOperator(actor);
  if (reason.trim().length < 10) throw new Error("Explain the retry reason.");
  return db().$transaction(async (tx) => {
    const changed = await tx.outbox.updateMany({
      where: { id, state: "failed" },
      data: { state: "pending", attempts: 0, availableAt: new Date(), error: null },
    });
    if (changed.count)
      await tx.audit.create({
        data: { actorId: actor.id, action: "outbox.retry", recordId: id, reason },
      });
    return changed;
  });
}
