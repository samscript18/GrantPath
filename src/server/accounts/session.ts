import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, type Actor } from "./auth";
export const currentSession = cache(async () => {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return null;
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const deletion = await db().accountDeletion.findUnique({ where: { userId: session.user.id } });
  if (deletion && deletion.scheduledAt <= new Date()) return null;
  return session;
});
export const currentUser = cache(async (): Promise<Actor | null> => {
  const session = await currentSession();
  if (!session) return null;
  const user = session.user as typeof session.user & { role?: string };
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || "student",
    image: user.image,
  };
});
export async function requireUser() {
  const actor = await currentUser();
  if (!actor) redirect("/login");
  return actor;
}
