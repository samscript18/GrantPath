import { db } from "@/lib/db";
import type { Actor } from "@/server/accounts/auth";
import { profileSchema, emptyProfile } from "@/server/profiles/schema";
import { scholarshipDataSchema, availabilityOf } from "@/server/scholarships/schema";
import { ENGINE_VERSION, evaluate, type Assessment } from "./engine";
import { rank } from "./ranking";
import type { Prisma } from "@/generated/prisma/client";
export async function evaluateStudent(
  userId: string,
  scholarshipId: string,
  requested?: { profileVersion?: number; scholarshipVersion?: number },
) {
  const [profile, scholarship] = await Promise.all([
    db().profile.findUnique({ where: { userId } }),
    db().scholarship.findUnique({
      where: { id: scholarshipId, published: true },
      include: { versions: { orderBy: { number: "desc" }, take: 1 } },
    }),
  ]);
  if (!profile || !scholarship)
    return {
      state: "skipped" as const,
      reason: "Profile or published scholarship no longer exists.",
    };
  if (
    (requested?.profileVersion !== undefined && requested.profileVersion !== profile.version) ||
    (requested?.scholarshipVersion !== undefined &&
      requested.scholarshipVersion !== scholarship.version)
  )
    return { state: "stale" as const, reason: "The requested versions are no longer current." };
  const p = profileSchema.parse(profile.data);
  const data = scholarshipDataSchema.parse(scholarship.versions[0].data);
  const assessment = evaluate(data.requirements, p);
  const ranking = rank(p, data, assessment.outcome);
  const result = { ...assessment, ranking };
  return db().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${scholarshipId}))`;
    const currentProfile = await tx.profile.findUnique({ where: { userId } });
    const currentScholarship = await tx.scholarship.findUnique({ where: { id: scholarshipId } });
    if (
      currentProfile?.version !== profile.version ||
      currentScholarship?.version !== scholarship.version
    )
      return {
        state: "stale" as const,
        reason: "Input changed while this assessment was being calculated.",
      };
    const key = {
      userId,
      scholarshipId,
      profileVersion: profile.version,
      scholarshipVersion: scholarship.version,
      engineVersion: ENGINE_VERSION,
    };
    const existing = await tx.evaluation.findUnique({
      where: { userId_scholarshipId_profileVersion_scholarshipVersion_engineVersion: key },
    });
    if (existing) return { state: "current" as const, evaluation: existing };
    const previous = await tx.evaluation.findFirst({
      where: { userId, scholarshipId },
      orderBy: [{ profileVersion: "desc" }, { scholarshipVersion: "desc" }],
    });
    const evaluation = await tx.evaluation.create({
      data: {
        ...key,
        outcome: assessment.outcome,
        result: result as unknown as Prisma.InputJsonValue,
        rank: ranking.score,
      },
    });
    if (
      assessment.outcome !== "not_eligible" &&
      (!previous || previous.outcome === "not_eligible") &&
      ["open", "upcoming"].includes(availabilityOf(data))
    )
      await tx.outbox.upsert({
        where: { key: `match:${evaluation.id}` },
        create: {
          key: `match:${evaluation.id}`,
          topic: "match.created",
          payload: {
            userId,
            scholarshipId,
            evaluationId: evaluation.id,
            version: scholarship.version,
          },
        },
        update: {},
      });
    return { state: "created" as const, evaluation };
  });
}
export async function recalculateUser(actor: Actor, limit = 50) {
  const profile = await db().profile.findUnique({ where: { userId: actor.id } });
  if (!profile) return { processed: 0, remaining: 0 };
  const scholarships = await db().scholarship.findMany({
    where: { published: true },
    select: { id: true, version: true },
    orderBy: { id: "asc" },
    take: 1000,
  });
  const previous = await db().evaluation.findMany({
    where: { userId: actor.id, profileVersion: profile.version, engineVersion: ENGINE_VERSION },
    select: { scholarshipId: true, scholarshipVersion: true },
  });
  const pending = scholarships.filter(
    (s) => !previous.some((e) => e.scholarshipId === s.id && e.scholarshipVersion === s.version),
  );
  for (const scholarship of pending.slice(0, Math.min(limit, 50)))
    await evaluateStudent(actor.id, scholarship.id, {
      profileVersion: profile.version,
      scholarshipVersion: scholarship.version,
    });
  return {
    processed: Math.min(pending.length, limit),
    remaining: Math.max(pending.length - limit, 0),
  };
}
export async function matchOverview(actor: Actor) {
  const [profile, rows] = await Promise.all([
    db().profile.findUnique({ where: { userId: actor.id } }),
    db().scholarship.findMany({
      where: { published: true },
      include: {
        programme: { include: { provider: true } },
        versions: { orderBy: { number: "desc" }, take: 1 },
        sources: true,
        evaluations: {
          where: { userId: actor.id },
          orderBy: [{ profileVersion: "desc" }, { scholarshipVersion: "desc" }],
          take: 1,
        },
      },
      take: 1000,
    }),
  ]);
  const matches = rows
    .map((s) => {
      const evaluation = s.evaluations[0];
      const current =
        !!evaluation &&
        evaluation.profileVersion === profile?.version &&
        evaluation.scholarshipVersion === s.version &&
        evaluation.engineVersion === ENGINE_VERSION;
      return {
        ...s,
        data: scholarshipDataSchema.parse(s.versions[0].data),
        currentAvailability: availabilityOf(s),
        evaluation: evaluation
          ? {
              ...evaluation,
              assessment: evaluation.result as unknown as Assessment & {
                ranking: ReturnType<typeof rank>;
              },
            }
          : null,
        evaluationCurrent: current,
      };
    })
    .sort(
      (a, b) =>
        (b.evaluationCurrent ? b.evaluation?.rank || 0 : -1000) -
          (a.evaluationCurrent ? a.evaluation?.rank || 0 : -1000) || a.title.localeCompare(b.title),
    );
  return {
    profile: profile
      ? { ...profile, data: profileSchema.parse(profile.data) }
      : { version: 0, stage: 0, data: emptyProfile() },
    matches,
    pending: matches.filter((s) => !s.evaluationCurrent).length,
  };
}
export async function studentAssessment(
  actor: Actor,
  scholarshipId: string,
  version?: number,
  evaluationId?: string,
) {
  const profile = await db().profile.findUnique({ where: { userId: actor.id } });
  const scholarship = await db().scholarship.findUniqueOrThrow({ where: { id: scholarshipId } });
  const latest = await db().evaluation.findFirst({
    where: {
      userId: actor.id,
      scholarshipId,
      ...(version ? { scholarshipVersion: version } : {}),
      ...(evaluationId ? { id: evaluationId } : {}),
    },
    orderBy: [{ profileVersion: "desc" }, { scholarshipVersion: "desc" }, { createdAt: "desc" }],
  });
  if (!latest) return { current: false, evaluation: null };
  return {
    current:
      latest.profileVersion === profile?.version &&
      latest.scholarshipVersion === scholarship.version &&
      latest.engineVersion === ENGINE_VERSION,
    evaluation: {
      ...latest,
      assessment: latest.result as unknown as Assessment & { ranking: ReturnType<typeof rank> },
    },
  };
}
