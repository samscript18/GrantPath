import { z } from "zod";
import { apiActor, apiError, readBody } from "@/lib/http";
import { requireOperator } from "@/server/accounts/auth";
import { configureSource, decideReview, registerSource, requestCheck } from "@/server/monitoring";
import { retryFailedEvent } from "@/server/jobs/outbox";
const reason = z.string().min(10).max(1000);
const actions = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("register"),
      scholarshipId: z.string(),
      url: z.url(),
      adapter: z.string(),
      cadenceHours: z.number().int().min(24).max(720),
      reason,
    })
    .strict(),
  z
    .object({
      action: z.literal("configure"),
      id: z.string(),
      enabled: z.boolean(),
      cadenceHours: z.number().int().min(24).max(720),
      reason,
    })
    .strict(),
  z.object({ action: z.literal("check"), id: z.string() }).strict(),
  z
    .object({
      action: z.literal("review"),
      id: z.string(),
      decision: z.enum(["accept", "reject"]),
      confirmedFields: z.array(z.string()).max(100),
      reason,
      candidate: z.unknown().optional(),
    })
    .strict(),
  z.object({ action: z.literal("retry-event"), id: z.string(), reason }).strict(),
]);
export async function POST(request: Request) {
  try {
    const actor = await apiActor(request);
    requireOperator(actor);
    const v = actions.parse(await readBody(request));
    switch (v.action) {
      case "register":
        return Response.json(await registerSource(actor, v));
      case "configure":
        return Response.json(await configureSource(actor, v.id, v));
      case "check":
        return Response.json(await requestCheck(actor, v.id));
      case "review":
        return Response.json(await decideReview(actor, v.id, v));
      case "retry-event":
        return Response.json(await retryFailedEvent(actor, v.id, v.reason));
    }
  } catch (e) {
    return apiError(e);
  }
}
