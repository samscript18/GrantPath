import { getAuth, type Actor } from "./auth";
import { HttpError } from "@/lib/http";
export async function ownedSessionId(actor: Actor, headers: Headers) {
  const session = await getAuth().api.getSession({ headers });
  if (!session || session.user.id !== actor.id) throw new HttpError(401, "Please sign in again.");
  return session.session.id;
}
