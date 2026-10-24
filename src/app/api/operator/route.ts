import { z } from "zod";
import { apiActor, apiError, readBody } from "@/lib/http";
import { requireOperator } from "@/server/accounts/auth";
import { createOpportunity, operatorOverview } from "@/server/operator";
import { publishScholarship } from "@/server/scholarships/publish";
export async function GET(request: Request) {
  try {
    return Response.json(await operatorOverview(await apiActor(request)));
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await apiActor(request);
    requireOperator(actor);
    const body = z
      .object({ action: z.enum(["create", "publish"]), input: z.unknown() })
      .strict()
      .parse(await readBody(request));
    if (body.action === "create") return Response.json(await createOpportunity(actor, body.input));
    const v = z
      .object({
        id: z.string(),
        data: z.unknown(),
        version: z.number().int().nonnegative(),
        reason: z.string().min(10).max(1000),
      })
      .strict()
      .parse(body.input);
    return Response.json(await publishScholarship(actor, v.id, v.data, v.version, v.reason));
  } catch (e) {
    return apiError(e);
  }
}
