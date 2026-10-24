import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, type Actor } from "./auth";
export async function currentUser(): Promise<Actor | null> {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return null;
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const user = session.user as typeof session.user & { role?: string };
  return { id: user.id, name: user.name, email: user.email, role: user.role || "student" };
}
export async function requireUser() {
  const actor = await currentUser();
  if (!actor) redirect("/login");
  return actor;
}
