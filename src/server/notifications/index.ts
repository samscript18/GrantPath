import { z } from "zod";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import type { Actor } from "@/server/accounts/auth";
import type { Prisma } from "@/generated/prisma/client";
export const preferencesSchema = z
  .object({
    newMatch: z.boolean().default(true),
    change: z.boolean().default(true),
    deadline: z.boolean().default(true),
    inApp: z.boolean().default(true),
    email: z.boolean().default(false),
  })
  .strict();
export type Preferences = z.infer<typeof preferencesSchema>;
export type Topic = "newMatch" | "change" | "deadline";
export async function preferences(actor: Actor) {
  const p = await db().notificationPreference.findUnique({ where: { userId: actor.id } });
  return p
    ? {
        newMatch: p.newMatch,
        change: p.change,
        deadline: p.deadline,
        inApp: p.inApp,
        email: p.email,
      }
    : preferencesSchema.parse({});
}
export async function savePreferences(actor: Actor, input: unknown) {
  const p = preferencesSchema.parse(input);
  return db().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`notifications:${actor.id}`}))`;
    return tx.notificationPreference.upsert({
      where: { userId: actor.id },
      create: { userId: actor.id, ...p },
      update: p,
    });
  });
}
export async function inbox(actor: Actor, input: { page?: number; unread?: boolean } = {}) {
  const page = Math.max(1, Math.min(10000, Number.isInteger(input.page) ? input.page! : 1));
  const where = { userId: actor.id, ...(input.unread ? { readAt: null } : {}) };
  const [rows, total, unread, settings] = await Promise.all([
    db().notification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 20,
      take: 20,
    }),
    db().notification.count({ where }),
    db().notification.count({ where: { userId: actor.id, readAt: null } }),
    preferences(actor),
  ]);
  return { rows, total, unread, page, preferences: settings };
}
export async function markRead(actor: Actor, id?: string) {
  return db().notification.updateMany({
    where: { userId: actor.id, readAt: null, ...(id ? { id } : {}) },
    data: { readAt: new Date() },
  });
}
export function alertKey(input: {
  userId: string;
  scholarshipId: string;
  eventId: string;
  topic: Topic;
  channel: string;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        input.userId,
        input.scholarshipId,
        input.eventId,
        input.topic,
        input.channel,
      ]),
    )
    .digest("hex");
}
export async function queueAlert(
  input: {
    userId: string;
    scholarshipId: string;
    eventId: string;
    topic: Topic;
    title: string;
    body: string;
    href: string;
  },
  transaction?: Prisma.TransactionClient,
) {
  const client = transaction || db();
  if (!(await client.user.findUnique({ where: { id: input.userId }, select: { id: true } })))
    return { count: 0 };
  const base = process.env.BETTER_AUTH_URL;
  if (!base) throw new Error("BETTER_AUTH_URL is required to freeze an alert’s destination.");
  const href = new URL(input.href, base);
  if (href.origin !== new URL(base).origin || !href.pathname.startsWith("/scholarships/"))
    throw new Error("Scholarship alerts must link to this application’s scholarship evidence.");
  return client.delivery.createMany({
    data: ["inApp", "email"].map((channel) => ({
      key: alertKey({ ...input, channel }),
      userId: input.userId,
      scholarshipId: input.scholarshipId,
      eventId: input.eventId,
      topic: input.topic,
      channel,
      subject: input.title,
      body: input.body,
      href: href.toString(),
    })),
    skipDuplicates: true,
  });
}
export async function unreadCount(actor: Actor) {
  return db().notification.count({ where: { userId: actor.id, readAt: null } });
}
