import { profileReadiness } from "./readiness";
import { DomainInputError } from "@/lib/errors";
import { stableJson } from "@/lib/json";
import { db } from "@/lib/db";
import type { Actor } from "@/server/accounts/auth";
import { emptyProfile, profileSchema } from "./schema";
import type { Prisma } from "@/generated/prisma/client";
export async function getProfile(actor: Actor) {
  const profile = await db().profile.findUnique({ where: { userId: actor.id } });
  return profile
    ? { ...profile, data: profileSchema.parse(profile.data) }
    : {
        userId: actor.id,
        version: 0,
        stage: 0,
        data: emptyProfile(),
        updatedAt: null,
        onboardingCompletedAt: null,
      };
}
export async function saveProfile(
  actor: Actor,
  input: unknown,
  expectedVersion: number,
  stage: number,
  complete = false,
) {
  const data = profileSchema.parse(input);
  if (!Number.isInteger(stage) || stage < 0 || stage > 3)
    throw new Error("Invalid onboarding stage.");
  const readiness = profileReadiness(data);
  if (complete && (stage !== 3 || !readiness.ready))
    throw new DomainInputError(
      `Before finishing, add ${readiness.missing.map((field) => field.label.toLowerCase()).join(", ") || "the final step"}. Other requirements can stay unconfirmed.`,
    );
  return db().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${actor.id}))`;
    const previous = await tx.profile.findUnique({ where: { userId: actor.id } });
    if ((previous?.version ?? 0) !== expectedVersion)
      throw new Error("Your profile changed in another tab. Reload before saving.");
    const onboardingCompletedAt = complete
      ? previous?.onboardingCompletedAt || new Date()
      : readiness.ready
        ? previous?.onboardingCompletedAt || null
        : null;
    if (previous && stableJson(previous.data) === stableJson(data)) {
      return tx.profile.update({
        where: { userId: actor.id },
        data: { stage, onboardingCompletedAt },
      });
    }
    const version = expectedVersion + 1;
    const json = data as Prisma.InputJsonValue;
    const profile = await tx.profile.upsert({
      where: { userId: actor.id },
      create: { userId: actor.id, data: json, version, stage, onboardingCompletedAt },
      update: { data: json, version, stage, onboardingCompletedAt },
    });
    await tx.profileVersion.create({ data: { userId: actor.id, number: version, data: json } });
    await tx.outbox.create({
      data: {
        key: `profile:${actor.id}:${version}`,
        topic: "profile.changed",
        payload: { userId: actor.id, version },
      },
    });
    return profile;
  });
}

export async function saveTimeZone(actor: Actor, input: unknown) {
  const { z } = await import("zod");
  const { timeZone, version } = z
    .object({ timeZone: z.string().max(100), version: z.number().int().min(0) })
    .strict()
    .parse(input);
  const current = await getProfile(actor);
  if (current.version !== version)
    throw new Error("Your profile changed in another tab. Reload before saving.");
  const saved = await saveProfile(actor, { ...current.data, timeZone }, version, current.stage);
  return { version: saved.version };
}
