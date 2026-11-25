import { db } from "@/lib/db";
import type { Actor } from "@/server/accounts/auth";
import { profileSchema, emptyProfile } from "@/server/profiles/schema";
import { scholarshipDataSchema, availabilityOf } from "@/server/scholarships/schema";
import { ENGINE_VERSION, evaluate, type Assessment } from "./engine";
import { rank } from "./ranking";
import { Prisma } from "@/generated/prisma/client";
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
  const batchSize = Number.isFinite(limit) ? Math.max(1, Math.min(50, Math.floor(limit))) : 50;
  const pending = Prisma.sql`FROM "Scholarship" s WHERE s.published = true AND NOT EXISTS (
    SELECT 1 FROM "Evaluation" e WHERE e."scholarshipId" = s.id
      AND e."userId" = ${actor.id} AND e."profileVersion" = ${profile.version}
      AND e."scholarshipVersion" = s.version AND e."engineVersion" = ${ENGINE_VERSION}
  )`;
  const [scholarships, counts] = await Promise.all([
    db().$queryRaw<{ id: string; version: number }[]>(Prisma.sql`
      SELECT s.id, s.version ${pending} ORDER BY s.id LIMIT ${batchSize}`),
    db().$queryRaw<{ total: number }[]>(Prisma.sql`SELECT count(*)::int AS total ${pending}`),
  ]);
  for (const scholarship of scholarships)
    await evaluateStudent(actor.id, scholarship.id, {
      profileVersion: profile.version,
      scholarshipVersion: scholarship.version,
    });
  return {
    processed: scholarships.length,
    remaining: Math.max(counts[0].total - scholarships.length, 0),
  };
}
export async function matchOverview(actor: Actor, requestedPage = 1) {
  const profile = await db().profile.findUnique({ where: { userId: actor.id } });
  const page =
    Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 10000
      ? requestedPage
      : 1;
  const pageSize = 50,
    now = new Date();
  const current = Prisma.sql`FROM "Scholarship" s LEFT JOIN "Evaluation" e
    ON e."scholarshipId" = s.id AND e."userId" = ${actor.id}
    AND e."profileVersion" = ${profile?.version ?? 0}
    AND e."scholarshipVersion" = s.version AND e."engineVersion" = ${ENGINE_VERSION}
    WHERE s.published = true`;
  const ready = Prisma.sql`e.outcome IN ('eligible', 'potential')
    AND s.availability IN ('open', 'upcoming') AND (s.deadline IS NULL OR s.deadline > ${now})
    AND (s.deadline > ${now} OR s."windowClosesOn" IS NULL OR s."windowClosesOn" > ${new Date(now.getTime() + 14 * 3600000).toISOString().slice(0, 10)})
    AND (s.availability <> 'upcoming' OR s."opensAt" IS NULL OR s."opensAt" > ${now} OR s.deadline > ${now})
    AND (s.availability <> 'upcoming' OR s."opensAt" IS NOT NULL OR s."windowOpensOn" IS NULL
      OR s."windowOpensOn" > ${new Date(now.getTime() + 14 * 3600000).toISOString().slice(0, 10)}
      OR (s."windowOpensOn" <= ${new Date(now.getTime() - 38 * 3600000).toISOString().slice(0, 10)} AND s."windowClosesOn" IS NOT NULL))`;
  const [ids, counts] = await Promise.all([
    db().$queryRaw<{ id: string }[]>(Prisma.sql`SELECT s.id ${current}
      ORDER BY CASE WHEN ${ready} THEN 0 ELSE 1 END, COALESCE(e.rank, -1000) DESC, s.title, s.id
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`),
    db().$queryRaw<
      { total: number; pending: number; ready: number; potential: number }[]
    >(Prisma.sql`
      SELECT count(*)::int AS total, count(*) FILTER (WHERE e.id IS NULL)::int AS pending,
        count(*) FILTER (WHERE ${ready})::int AS ready,
        count(*) FILTER (WHERE e.outcome = 'potential' AND s.availability <> 'closed'
          AND (s.deadline IS NULL OR s.deadline > ${now})
          AND (s.deadline IS NOT NULL OR s."windowClosesOn" IS NULL OR s."windowClosesOn" > ${new Date(now.getTime() - 38 * 3600000).toISOString().slice(0, 10)}))::int AS potential
      ${current}`),
  ]);
  const rows = await db().scholarship.findMany({
    where: { published: true, id: { in: ids.map((row) => row.id) } },
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
  });
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
      (a, b) => ids.findIndex((row) => row.id === a.id) - ids.findIndex((row) => row.id === b.id),
    );
  return {
    profile: profile
      ? { ...profile, data: profileSchema.parse(profile.data) }
      : { version: 0, stage: 0, data: emptyProfile() },
    matches,
    pending: counts[0].pending,
    total: counts[0].total,
    page,
    pageSize,
    summary: { readyToExplore: counts[0].ready, needsConfirmation: counts[0].potential },
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
