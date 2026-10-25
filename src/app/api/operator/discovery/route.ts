import { z } from "zod";
import { apiActor, apiError, readBody } from "@/lib/http";
import {
  processControlledReleaseSnapshot,
  configureDirectory,
  discoveryOverview,
  retryCandidate,
  decideDiscovery,
  registerMappedDetails,
} from "@/server/discovery/service";
export async function GET(request: Request) {
  try {
    return Response.json(await discoveryOverview(await apiActor(request)));
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await apiActor(request);
    const body = z
      .discriminatedUnion("action", [
        z
          .object({
            action: z.literal("controlled-snapshot"),
            mode: z.enum(["valid", "changed", "ambiguous"]),
            scenario: z.enum(["publication", "change"]).default("publication"),
          })
          .strict(),
        z
          .object({
            action: z.literal("configure"),
            id: z.string(),
            enabled: z.boolean(),
            autoPublish: z.boolean(),
            reason: z.string().min(10).max(1000),
          })
          .strict(),
        z
          .object({
            action: z.literal("retry"),
            id: z.string(),
            reason: z.string().min(10).max(1000),
          })
          .strict(),
        z.object({ action: z.literal("register-details"), id: z.string() }).strict(),
        z
          .object({
            action: z.literal("decide"),
            id: z.string(),
            decision: z.enum(["accept", "reject"]),
            reason: z.string().min(10).max(1000),
            data: z.unknown().optional(),
          })
          .strict(),
      ])
      .parse(await readBody(request));
    return Response.json(
      body.action === "controlled-snapshot"
        ? await processControlledReleaseSnapshot(actor, body.mode, body.scenario)
        : body.action === "configure"
          ? await configureDirectory(actor, body.id, body)
          : body.action === "retry"
            ? await retryCandidate(actor, body.id, body.reason)
            : body.action === "register-details"
              ? await registerMappedDetails(actor, body.id)
              : await decideDiscovery(actor, body.id, body),
    );
  } catch (e) {
    return apiError(e);
  }
}
