import { z } from "zod";
import { db } from "@/lib/db";
import type { Actor } from "@/server/accounts/auth";
import { scholarshipDataSchema, availabilityOf } from "@/server/scholarships/schema";
import { statuses } from "./constants";
export { statuses } from "./constants";
export const checklistSchema = z
  .array(
    z
      .object({
        id: z.string().min(1).max(80),
        label: z.string().trim().min(1).max(200),
        done: z.boolean(),
      })
      .strict(),
  )
  .max(30)
  .refine(
    (items) => new Set(items.map((i) => i.id)).size === items.length,
    "Checklist item IDs must be unique.",
  );
export const applicationUpdateSchema = z
  .object({
    revision: z.number().int().positive(),
    status: z.enum(statuses),
    notes: z.string().max(5000),
    checklist: checklistSchema,
    saved: z.boolean(),
  })
  .strict();
export const suggestedChecklist = () => [
  { id: "guidance", label: "Read the official application guidance", done: false },
  { id: "requirements", label: "Confirm unresolved requirements with the provider", done: false },
  { id: "documents", label: "List the documents this provider requests", done: false },
  { id: "plan", label: "Set a personal preparation plan", done: false },
];
export async function saveOpportunity(actor: Actor, scholarshipId: string) {
  return db().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`application:${actor.id}:${scholarshipId}`}))`;
    await tx.scholarship.findUniqueOrThrow({ where: { id: scholarshipId, published: true } });
    const existing = await tx.application.findUnique({
      where: { userId_scholarshipId: { userId: actor.id, scholarshipId } },
    });
    if (existing)
      return existing.saved
        ? existing
        : tx.application.update({
            where: { id: existing.id },
            data: { saved: true, revision: { increment: 1 } },
          });
    return tx.application.create({
      data: {
        userId: actor.id,
        scholarshipId,
        checklist: suggestedChecklist(),
        history: { create: { toStatus: "Interested" } },
      },
    });
  });
}
export async function updateApplication(actor: Actor, id: string, input: unknown) {
  const v = applicationUpdateSchema.parse(input);
  return db().$transaction(async (tx) => {
    const current = await tx.application.findFirstOrThrow({ where: { id, userId: actor.id } });
    const changed = await tx.application.updateMany({
      where: { id, userId: actor.id, revision: v.revision },
      data: {
        status: v.status,
        notes: v.notes,
        checklist: v.checklist,
        saved: v.saved,
        revision: { increment: 1 },
      },
    });
    if (!changed.count)
      throw new Error("This application changed in another tab. Reload before saving your notes.");
    if (current.status !== v.status)
      await tx.applicationHistory.create({
        data: { applicationId: id, fromStatus: current.status, toStatus: v.status },
      });
    return tx.application.findFirstOrThrow({ where: { id, userId: actor.id } });
  });
}
export async function unsaveOpportunity(actor: Actor, scholarshipId: string) {
  return db().application.updateMany({
    where: { userId: actor.id, scholarshipId, saved: true },
    data: { saved: false, revision: { increment: 1 } },
  });
}
export async function removeApplication(actor: Actor, id: string, confirmation: string) {
  if (confirmation !== "REMOVE") throw new Error("Explicit removal confirmation is required.");
  return db().application.deleteMany({ where: { id, userId: actor.id } });
}
export async function applicationForScholarship(actor: Actor, scholarshipId: string) {
  const a = await db().application.findUnique({
    where: { userId_scholarshipId: { userId: actor.id, scholarshipId } },
    include: { history: { orderBy: { createdAt: "desc" } } },
  });
  return a ? { ...a, checklist: checklistSchema.parse(a.checklist) } : null;
}
export async function applications(actor: Actor, savedOnly = false) {
  const rows = await db().application.findMany({
    where: { userId: actor.id, ...(savedOnly ? { saved: true } : {}) },
    include: {
      scholarship: {
        include: {
          programme: { include: { provider: true } },
          versions: { orderBy: { number: "desc" }, take: 1 },
          sources: true,
        },
      },
      history: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((a) => ({
    ...a,
    checklist: checklistSchema.parse(a.checklist),
    scholarship: {
      ...a.scholarship,
      data: scholarshipDataSchema.parse(a.scholarship.versions[0].data),
      currentAvailability: availabilityOf(a.scholarship),
    },
  }));
}
