import { db } from "@/lib/db";
import type { Actor } from "@/server/accounts/auth";
import { emptyProfile, profileSchema } from "./schema";
import type { Prisma } from "@/generated/prisma/client";
export async function getProfile(actor: Actor) {
  const profile = await db().profile.findUnique({ where: { userId: actor.id } });
  return profile
    ? { ...profile, data: profileSchema.parse(profile.data) }
    : { userId: actor.id, version: 0, stage: 0, data: emptyProfile(), updatedAt: null };
}
export async function saveProfile(
  actor: Actor,
  input: unknown,
  expectedVersion: number,
  stage: number,
) {
  const data = profileSchema.parse(input);
  if (!Number.isInteger(stage) || stage < 0 || stage > 3)
    throw new Error("Invalid onboarding stage.");
  return db().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${actor.id}))`;
    const previous = await tx.profile.findUnique({ where: { userId: actor.id } });
    if ((previous?.version ?? 0) !== expectedVersion)
      throw new Error("Your profile changed in another tab. Reload before saving.");
    if (previous && JSON.stringify(previous.data) === JSON.stringify(data)) {
      return tx.profile.update({ where: { userId: actor.id }, data: { stage } });
    }
    const version = expectedVersion + 1;
    const json = data as Prisma.InputJsonValue;
    const profile = await tx.profile.upsert({
      where: { userId: actor.id },
      create: { userId: actor.id, data: json, version, stage },
      update: { data: json, version, stage },
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
