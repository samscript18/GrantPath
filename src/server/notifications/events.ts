import { z } from "zod";
import { db } from "@/lib/db";
import type { Outbox } from "@/generated/prisma/client";
import { queueAlert } from "./index";
import { evaluateStudent } from "@/server/eligibility";
import { ENGINE_VERSION, outcomeLabels, type Outcome } from "@/server/eligibility/engine";
import { scholarshipDataSchema, availabilityOf } from "@/server/scholarships/schema";
import { materialChanges } from "@/server/scholarships/changes";
export const notificationTopics = ["match.created", "change.ready", "deadline.ready"];
export const reminderEventKey = (scholarshipId: string, instant: string, days: number) =>
  `deadline:${scholarshipId}:${new Date(instant).toISOString()}:d${days}`;
const matchPayload = z.object({
  userId: z.string(),
  scholarshipId: z.string(),
  evaluationId: z.string(),
  version: z.number().int(),
});
const changePayload = z.object({
  userId: z.string(),
  scholarshipId: z.string(),
  version: z.number().int(),
  previousVersion: z.number().int(),
});
const reminderPayload = z.object({
  scholarshipId: z.string(),
  version: z.number().int(),
  deadline: z.iso.datetime(),
  days: z.union([z.literal(7), z.literal(1)]),
  cursor: z.string().optional(),
});
export async function handleNotificationEvent(event: Outbox) {
  if (event.topic === "match.created") {
    const p = matchPayload.parse(event.payload);
    const evaluation = await db().evaluation.findFirst({
      where: {
        id: p.evaluationId,
        userId: p.userId,
        scholarshipId: p.scholarshipId,
        scholarshipVersion: p.version,
      },
      include: { scholarship: true },
    });
    if (!evaluation || evaluation.outcome === "not_eligible") return;
    const version = await db().scholarshipVersion.findUniqueOrThrow({
      where: { scholarshipId_number: { scholarshipId: p.scholarshipId, number: p.version } },
    });
    const data = scholarshipDataSchema.parse(version.data);
    await queueAlert({
      userId: p.userId,
      scholarshipId: p.scholarshipId,
      eventId: event.key,
      topic: "newMatch",
      title: `A possibility to explore: ${data.title}`,
      body: `${outcomeLabels[evaluation.outcome as Outcome]}. Assessed using profile v${evaluation.profileVersion} and accepted scholarship v${p.version}. Inspect the conditions and official evidence before applying.`,
      href: `/scholarships/${evaluation.scholarship.slug}?version=${p.version}&evaluation=${evaluation.id}#requirements`,
    });
    return;
  }
  if (event.topic === "change.ready") {
    const p = changePayload.parse(event.payload);
    const [s, profile] = await Promise.all([
      db().scholarship.findUnique({
        where: { id: p.scholarshipId },
        include: { versions: { where: { number: { in: [p.version, p.previousVersion] } } } },
      }),
      db().profile.findUnique({ where: { userId: p.userId } }),
    ]);
    if (!s) return;
    const accepted = s.versions.find((v) => v.number === p.version);
    const prior = s.versions.find((v) => v.number === p.previousVersion);
    if (!accepted || !prior) return;
    const data = scholarshipDataSchema.parse(accepted.data);
    const old = scholarshipDataSchema.parse(prior.data);
    const changes = materialChanges(old, data).filter(
      (c) => c.field !== "sourceFacts" || c.before !== null,
    );
    if (!changes.length) return;
    if (profile && s.version === p.version)
      await evaluateStudent(p.userId, s.id, {
        profileVersion: profile.version,
        scholarshipVersion: p.version,
      });
    const evaluations = profile
      ? await db().evaluation.findMany({
          where: {
            userId: p.userId,
            scholarshipId: s.id,
            profileVersion: profile.version,
            scholarshipVersion: { in: [p.version, p.previousVersion] },
            engineVersion: ENGINE_VERSION,
          },
        })
      : [];
    const before = evaluations.find((e) => e.scholarshipVersion === p.previousVersion);
    const after = evaluations.find((e) => e.scholarshipVersion === p.version);
    const context =
      before && after
        ? `For profile v${profile!.version}, the assessment changed from “${outcomeLabels[before.outcome as Outcome]}” to “${outcomeLabels[after.outcome as Outcome]}”.`
        : "A comparable before/after assessment for the same profile is not available. Inspect the accepted conditions and current assessment.";
    const fields: Record<string, string> = {
      deadline: "closing instant",
      deadlineLabel: "deadline guidance",
      deadlineState: "deadline certainty",
      availability: "application window",
      requirements: "requirements",
      funding: "funding",
      fundingType: "funding coverage",
      fundingSummary: "funding guidance",
      applicationUrl: "official link",
      levels: "study level",
      sourceFacts: "official wording",
    };
    await queueAlert({
      userId: p.userId,
      scholarshipId: s.id,
      eventId: event.key,
      topic: "change",
      title: `An accepted update: ${data.title}`,
      body: `Accepted version ${p.previousVersion} → ${p.version}: ${changes.map((c) => fields[c.field] || c.field).join(", ")}. ${context}`,
      href: `/scholarships/${s.slug}?version=${p.version}${after ? `&evaluation=${after.id}` : ""}#history`,
    });
    return;
  }
  if (event.topic === "deadline.ready") {
    const p = reminderPayload.parse(event.payload);
    const s = await db().scholarship.findUnique({
      where: { id: p.scholarshipId, published: true },
      include: { versions: { orderBy: { number: "desc" }, take: 1 } },
    });
    if (!s || s.deadline?.toISOString() !== p.deadline || availabilityOf(s) !== "open") return;
    const data = scholarshipDataSchema.parse(s.versions[0].data);
    if (data.deadlineState !== "confirmed") return;
    const applications = await db().application.findMany({
      where: {
        scholarshipId: s.id,
        saved: true,
        status: { notIn: ["No longer pursuing", "Awarded", "Not awarded"] },
        ...(p.cursor ? { userId: { gt: p.cursor } } : {}),
      },
      orderBy: { userId: "asc" },
      take: 50,
    });
    await db().$transaction(async (tx) => {
      for (const application of applications)
        await queueAlert(
          {
            userId: application.userId,
            scholarshipId: s.id,
            eventId: reminderEventKey(s.id, p.deadline, p.days),
            topic: "deadline",
            title: `${p.days === 7 ? "One week" : "One day"} to the confirmed deadline: ${data.title}`,
            body: `The provider’s confirmed closing instant is ${p.deadline}. This is the ${p.days}-day reminder for your saved plan. Check official guidance and allow time to submit.`,
            href: `/scholarships/${s.slug}?version=${s.version}#overview`,
          },
          tx,
        );
      if (applications.length === 50) {
        const cursor = applications.at(-1)!.userId;
        const key = `${reminderEventKey(s.id, p.deadline, p.days)}:after:${cursor}`;
        await tx.outbox.upsert({
          where: { key },
          create: { key, topic: "deadline.ready", payload: { ...p, cursor } },
          update: {},
        });
      }
    });
    return;
  }
  throw new Error("Unrecognised notification event.");
}
export async function scheduleReminders(now = new Date(), limit = 100) {
  const rows = await db().scholarship.findMany({
    where: {
      published: true,
      availability: "open",
      deadline: { gt: now, lte: new Date(now.getTime() + 7 * 86400000) },
    },
    include: { versions: { orderBy: { number: "desc" }, take: 1 } },
    orderBy: [{ deadline: "asc" }, { id: "asc" }],
    take: Math.max(1, Math.min(100, limit)),
  });
  let queued = 0;
  for (const s of rows) {
    const data = scholarshipDataSchema.parse(s.versions[0].data);
    if (!s.deadline || data.deadlineState !== "confirmed") continue;
    const remaining = s.deadline.getTime() - now.getTime();
    for (const days of [7, 1] as const) {
      if (remaining > days * 86400000 || remaining <= (days - 1) * 86400000) continue;
      const key = reminderEventKey(s.id, s.deadline.toISOString(), days);
      const result = await db().outbox.createMany({
        data: [
          {
            key,
            topic: "deadline.ready",
            payload: {
              scholarshipId: s.id,
              version: s.version,
              deadline: s.deadline.toISOString(),
              days,
            },
          },
        ],
        skipDuplicates: true,
      });
      queued += result.count;
    }
  }
  return { queued };
}
