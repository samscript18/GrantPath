import { getAuth, type Actor } from "@/server/accounts/auth";
import { mutationQuota } from "@/server/rate-limit";
import { z } from "zod";
export async function apiActor(request: Request): Promise<Actor> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    const expected = process.env.BETTER_AUTH_URL;
    if (!origin || origin !== expected) throw new HttpError(403, "Request origin is not allowed.");
  }
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) throw new HttpError(401, "Please sign in to continue.");
  if (!["GET", "HEAD"].includes(request.method) && !await mutationQuota(session.user.id, new URL(request.url).pathname)) throw new HttpError(429, "Too many updates. Please wait a minute and retry.");
  const user = session.user as typeof session.user & { role?: string };
  return { id: user.id, name: user.name, email: user.email, role: user.role || "student" };
}
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function apiError(error: unknown) {
  if (error instanceof z.ZodError) return Response.json({ message: "Please check the highlighted fields.", issues: error.flatten() }, { status: 400 });
  if (error instanceof HttpError) return Response.json({ message: error.message }, { status: error.status });
  if (error instanceof Error && /another tab|version|changed|conflict/i.test(error.message)) return Response.json({ message: error.message }, { status: 409 });
  if (error instanceof Error && /Operator access/.test(error.message)) return Response.json({ message: "Operator access required." }, { status: 403 });
  console.error("GrantPath request failed", error instanceof Error ? error.name : "unknown");
  return Response.json({ message: "Unable to complete this request. Please retry." }, { status: 503 });
}
export async function readBody(request: Request) {
  if (!request.body) throw new HttpError(400, "Expected a JSON body.");
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
  while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength; if (bytes > 100_000) { await reader.cancel(); throw new HttpError(413, "This request is too large."); } chunks.push(part.value); }
  const buffer = new Uint8Array(bytes); let offset = 0; for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(buffer)) as unknown; } catch { throw new HttpError(400, "Expected valid JSON."); }
}
