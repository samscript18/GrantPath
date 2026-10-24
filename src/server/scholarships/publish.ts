import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { requireOperator, type Actor } from "@/server/accounts/auth";
import { publicationSchema } from "./schema";
import type { Prisma } from "@/generated/prisma/client";
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).sort().join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([key, value]) => key !== "retrievedAt" && value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(typeof value === "string" ? value.replace(/\s+/g, " ").trim() : value);
}
export const semanticHash = (value: unknown) =>
  createHash("sha256").update(canonical(value)).digest("hex");
export async function publishScholarship(
  actor: Actor,
  scholarshipId: string,
  input: unknown,
  expectedVersion: number,
  reason: string,
  reviewId?: string,
) {
  requireOperator(actor);
  if (reason.trim().length < 10)
    throw new Error("Explain the review decision in at least 10 characters.");
  const data = publicationSchema.parse(input);
  const hash = semanticHash(data);
  return db().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${scholarshipId}))`;
    const scholarship = await tx.scholarship.findUniqueOrThrow({ where: { id: scholarshipId } });
    const previous = await tx.scholarshipVersion.findUnique({
      where: { scholarshipId_number: { scholarshipId, number: scholarship.version } },
    });
    if (previous?.semanticHash === hash) return { changed: false, version: scholarship.version };
    if (scholarship.version !== expectedVersion)
      throw new Error("This scholarship version changed. Reload the review before publishing.");
    if (reviewId) {
      await tx.review.findFirstOrThrow({
        where: { id: reviewId, scholarshipId, state: "pending", baseVersion: expectedVersion },
      });
    }
    const number = scholarship.version + 1;
    await tx.scholarshipVersion.create({
      data: {
        scholarshipId,
        number,
        data: data as Prisma.InputJsonValue,
        semanticHash: hash,
        actorId: actor.id,
        reason,
        evidence: {
          create: data.evidence.map((e) => ({ ...e, retrievedAt: new Date(e.retrievedAt) })),
        },
      },
    });
    await tx.scholarship.update({
      where: { id: scholarshipId },
      data: {
        title: data.title,
        destination: data.destination,
        level: data.levels.join(","),
        field: data.fields.join(","),
        fundingType: data.fundingType,
        availability: data.availability,
        deadline: data.deadline,
        deadlineLabel: data.deadlineLabel,
        version: number,
        published: true,
      },
    });
    await tx.review.updateMany({
      where: {
        scholarshipId,
        state: "pending",
        baseVersion: { lt: number },
        ...(reviewId ? { id: { not: reviewId } } : {}),
      },
      data: {
        state: "superseded",
        actorId: actor.id,
        decidedAt: new Date(),
        reason: `Superseded by accepted version ${number}; original candidate retained for audit.`,
      },
    });
    await tx.outbox.create({
      data: {
        key: `scholarship:${scholarshipId}:${number}`,
        topic: "scholarship.changed",
        payload: { scholarshipId, version: number, previousVersion: scholarship.version },
      },
    });
    await tx.audit.create({
      data: {
        actorId: actor.id,
        action: "scholarship.publish",
        recordId: scholarshipId,
        before: previous?.data ?? undefined,
        after: data as Prisma.InputJsonValue,
        reason,
      },
    });
    if (reviewId)
      await tx.review.update({
        where: { id: reviewId },
        data: { state: "accepted", actorId: actor.id, reason, decidedAt: new Date() },
      });
    return { changed: true, version: number };
  });
}
