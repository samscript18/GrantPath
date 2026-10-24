import { db } from "@/lib/db";
import type { Actor } from "./auth";
export async function accountDetails(actor: Actor) {
  return db().user.findUniqueOrThrow({
    where: { id: actor.id },
    select: {
      email: true,
      name: true,
      authMethod: true,
      emailVerified: true,
      image: true,
      role: true,
      createdAt: true,
    },
  });
}
export async function accountMethod(email: string) {
  const user = await db().user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { authMethod: true },
  });
  return user?.authMethod;
}
export async function userAccountMethod(userId: string) {
  return (await db().user.findUnique({ where: { id: userId }, select: { authMethod: true } }))
    ?.authMethod;
}
