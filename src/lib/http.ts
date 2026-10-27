import { getAuth, type Actor } from "@/server/accounts/auth";
import { mutationQuota } from "@/server/rate-limit";
import { z } from "zod";
import { DomainInputError } from "./errors";
import { db } from "./db";
import { SetupError } from "./env";
export async function apiActor(request: Request): Promise<Actor> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    assertSameOrigin(request);
  }
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) throw new HttpError(401, "Please sign in to continue.");
  const deletion = await db().accountDeletion.findUnique({ where: { userId: session.user.id } });
  if (deletion && deletion.scheduledAt <= new Date())
    throw new HttpError(403, "Your account deletion cancellation period has ended.");
  if (
    !["GET", "HEAD"].includes(request.method) &&
    !(await mutationQuota(session.user.id, new URL(request.url).pathname))
  )
    throw new HttpError(429, "Too many updates. Please wait a minute and retry.");
  const user = session.user as typeof session.user & { role?: string };
  return { id: user.id, name: user.name, email: user.email, role: user.role || "student" };
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== process.env.BETTER_AUTH_URL)
    throw new HttpError(403, "Request origin is not allowed.");
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function apiError(error: unknown) {
  if (error instanceof SetupError)
    return Response.json({ message: error.message }, { status: 503 });
  if (error instanceof DomainInputError)
    return Response.json({ message: error.message }, { status: 400 });
  if (error instanceof z.ZodError)
    return Response.json(
      { message: "Please check the highlighted fields.", issues: error.flatten() },
      { status: 400 },
    );
  if (error instanceof HttpError)
    return Response.json({ message: error.message }, { status: error.status });
  if (error instanceof Error && /another tab|version|changed|conflict/i.test(error.message))
    return Response.json({ message: error.message }, { status: 409 });
  if (error instanceof Error && /Operator access/.test(error.message))
    return Response.json({ message: "Operator access required." }, { status: 403 });
  if (error && typeof error === "object" && "code" in error) {
    if (error.code === "P2002")
      return Response.json(
        { message: "This record already exists. Reload and edit the existing record." },
        { status: 409 },
      );
    if (error.code === "P2025")
      return Response.json(
        { message: "This record is unavailable to your account." },
        { status: 404 },
      );
  }
  console.error("GrantPath request failed", error instanceof Error ? error.name : "unknown");
  return Response.json(
    { message: "Unable to complete this request. Please retry." },
    { status: 503 },
  );
}
export async function readBody(request: Request) {
  if (!request.body) throw new HttpError(400, "Expected a JSON body.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > 100_000) {
      await reader.cancel();
      throw new HttpError(413, "This request is too large.");
    }
    chunks.push(part.value);
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(buffer)) as unknown;
  } catch {
    throw new HttpError(400, "Expected valid JSON.");
  }
}
