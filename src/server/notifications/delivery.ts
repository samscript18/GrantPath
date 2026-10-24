import { db } from "@/lib/db";
import { sendEmail } from "@/server/accounts/email";
import { preferencesSchema, type Topic } from "./index";
import { availabilityOf, scholarshipDataSchema } from "@/server/scholarships/schema";
import { ENGINE_VERSION } from "@/server/eligibility/engine";
import { reminderEventKey } from "./events";
import type { Delivery, Prisma } from "@/generated/prisma/client";
type Client = Prisma.TransactionClient;
export async function deliveryDecision(
  delivery: Delivery,
  client: Client = db(),
  now = new Date(),
) {
  const settings = await client.notificationPreference.findUnique({
    where: { userId: delivery.userId },
  });
  const user = await client.user.findUnique({ where: { id: delivery.userId } });
  const s = await client.scholarship.findUnique({
    where: { id: delivery.scholarshipId },
    include: { versions: { orderBy: { number: "desc" }, take: 1 } },
  });
  const application = await client.application.findUnique({
    where: {
      userId_scholarshipId: { userId: delivery.userId, scholarshipId: delivery.scholarshipId },
    },
  });
  if (!user || !s) return { allowed: false, reason: "Account or opportunity no longer exists." };
  const prefs = settings
    ? {
        newMatch: settings.newMatch,
        change: settings.change,
        deadline: settings.deadline,
        inApp: settings.inApp,
        email: settings.email,
      }
    : preferencesSchema.parse({});
  if (
    !prefs[delivery.topic as Topic] ||
    !(delivery.channel === "inApp" ? prefs.inApp : prefs.email)
  )
    return { allowed: false, reason: "Current topic or channel preference is disabled." };
  if (delivery.topic !== "newMatch" && !application?.saved)
    return { allowed: false, reason: "This saved-only subscription was removed." };
  if (delivery.topic === "newMatch") {
    const profile = await client.profile.findUnique({ where: { userId: delivery.userId } });
    const evaluation = profile
      ? await client.evaluation.findUnique({
          where: {
            userId_scholarshipId_profileVersion_scholarshipVersion_engineVersion: {
              userId: delivery.userId,
              scholarshipId: s.id,
              profileVersion: profile.version,
              scholarshipVersion: s.version,
              engineVersion: ENGINE_VERSION,
            },
          },
        })
      : null;
    if (
      !evaluation ||
      evaluation.outcome === "not_eligible" ||
      !["open", "upcoming"].includes(availabilityOf(s, now))
    )
      return {
        allowed: false,
        reason: "The opportunity is no longer a current open/upcoming relevant match.",
      };
  }
  if (delivery.topic === "deadline") {
    const data = scholarshipDataSchema.parse(s.versions[0].data);
    const days = Number(delivery.eventId.match(/:d(7|1)$/)?.[1]);
    if (
      !s.deadline ||
      data.deadlineState !== "confirmed" ||
      availabilityOf(s, now) !== "open" ||
      delivery.eventId !== reminderEventKey(s.id, s.deadline.toISOString(), days) ||
      !application ||
      ["No longer pursuing", "Awarded", "Not awarded"].includes(application.status)
    )
      return {
        allowed: false,
        reason:
          "Closing instant, provider window or personal plan changed; stale reminder suppressed.",
      };
  }
  return { allowed: true, reason: "Current preference and relevance checks passed.", user };
}
export async function claimDelivery(id?: string, now = new Date()) {
  await db().delivery.updateMany({
    where: {
      ...(id ? { id } : {}),
      state: "processing",
      attempts: { gte: 5 },
      lockedUntil: { lt: now },
    },
    data: {
      state: "uncertain",
      leaseToken: null,
      lockedUntil: null,
      error:
        "The final delivery attempt was interrupted. Check provider acceptance before any manual resend.",
    },
  });
  const token = crypto.randomUUID();
  const requested = id || null;
  const rows = await db().$queryRaw<
    Delivery[]
  >`WITH candidate AS (SELECT id FROM "Delivery" WHERE (${requested}::text IS NULL OR id = ${requested}) AND attempts < 5 AND "availableAt" <= ${now} AND (state = 'pending' OR (state = 'processing' AND "lockedUntil" < ${now})) ORDER BY "createdAt", id FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE "Delivery" d SET state = 'processing', attempts = attempts + 1, "leaseToken" = ${token}, "lockedUntil" = ${new Date(now.getTime() + 120000)} FROM candidate WHERE d.id = candidate.id RETURNING d.*`;
  return rows[0] || null;
}
async function finish(
  tx: Client,
  delivery: Delivery,
  state: string,
  error?: string,
  providerId?: string,
  now = new Date(),
) {
  const updated = await tx.delivery.updateMany({
    where: { id: delivery.id, state: "processing", leaseToken: delivery.leaseToken },
    data: {
      state,
      error: error || null,
      providerId: providerId || null,
      acceptedAt: state === "accepted" || state === "published" ? now : null,
      lockedUntil: null,
      leaseToken: null,
    },
  });
  if (!updated.count) return { state: "stale" };
  await tx.deliveryAttempt.upsert({
    where: { deliveryId_number: { deliveryId: delivery.id, number: delivery.attempts } },
    create: { deliveryId: delivery.id, number: delivery.attempts, state, error },
    update: { state, error },
  });
  return { state };
}
export async function deliverClaimed(delivery: Delivery, now = new Date()) {
  try {
    if (delivery.channel === "inApp")
      return db().$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`notifications:${delivery.userId}`}))`;
        const owned = await tx.delivery.findFirst({
          where: { id: delivery.id, leaseToken: delivery.leaseToken, state: "processing" },
        });
        if (!owned) return { state: "stale" };
        const decision = await deliveryDecision(delivery, tx, now);
        if (!decision.allowed)
          return finish(tx, delivery, "suppressed", decision.reason, undefined, now);
        await tx.notification.upsert({
          where: { key: delivery.key },
          create: {
            key: delivery.key,
            userId: delivery.userId,
            scholarshipId: delivery.scholarshipId,
            eventId: delivery.eventId,
            topic: delivery.topic,
            title: delivery.subject,
            body: delivery.body,
            href: delivery.href,
          },
          update: {},
        });
        return finish(tx, delivery, "published", undefined, undefined, now);
      });
    const previous = await db().deliveryAttempt.findFirst({
      where: { deliveryId: delivery.id },
      orderBy: { number: "asc" },
    });
    if (previous && now.getTime() - previous.createdAt.getTime() >= 23 * 3600000)
      return db().$transaction((tx) =>
        finish(
          tx,
          delivery,
          "uncertain",
          "Earlier provider acceptance is uncertain and the safe idempotency retry window has elapsed. Inspect the provider before any further send.",
          undefined,
          now,
        ),
      );
    const decision = await deliveryDecision(delivery, db(), now);
    if (!decision.allowed || !decision.user)
      return db().$transaction((tx) =>
        finish(tx, delivery, "suppressed", decision.reason, undefined, now),
      );
    await db().deliveryAttempt.upsert({
      where: { deliveryId_number: { deliveryId: delivery.id, number: delivery.attempts } },
      create: {
        deliveryId: delivery.id,
        number: delivery.attempts,
        state: "started",
        createdAt: now,
      },
      update: {},
    });
    const result = await sendEmail({
      to: decision.user.email,
      subject: delivery.subject,
      text: `${delivery.body}\n\nInspect the exact evidence and assessment:\n${delivery.href}\n\nManage scholarship notification preferences in your GrantPath inbox.`,
      key: `grantpath-delivery:${delivery.id}`,
    });
    return db().$transaction((tx) => finish(tx, delivery, result.state, undefined, result.id, now));
  } catch (error) {
    const message = (error instanceof Error ? error.message : "Delivery failed").slice(0, 1000);
    return db().$transaction(async (tx) => {
      const owned = await tx.delivery.updateMany({
        where: { id: delivery.id, leaseToken: delivery.leaseToken, state: "processing" },
        data: {
          state: delivery.attempts >= 5 ? "failed" : "pending",
          availableAt: new Date(now.getTime() + Math.min(3600000, 30000 * 2 ** delivery.attempts)),
          lockedUntil: null,
          leaseToken: null,
          error: message,
        },
      });
      if (owned.count)
        await tx.deliveryAttempt.upsert({
          where: { deliveryId_number: { deliveryId: delivery.id, number: delivery.attempts } },
          create: {
            deliveryId: delivery.id,
            number: delivery.attempts,
            state: "failed",
            error: message,
            createdAt: now,
          },
          update: { state: "failed", error: message },
        });
      return { state: owned.count ? "retry_or_failed" : "stale" };
    });
  }
}
export async function deliverBatch(limit = 20) {
  const states: Record<string, number> = {};
  for (let i = 0; i < Math.max(1, Math.min(50, limit)); i++) {
    const delivery = await claimDelivery();
    if (!delivery) break;
    const result = await deliverClaimed(delivery);
    states[result.state] = (states[result.state] || 0) + 1;
  }
  return states;
}
