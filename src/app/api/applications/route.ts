import { z } from "zod";
import { apiActor, apiError, readBody } from "@/lib/http";
import {
  applications,
  saveOpportunity,
  updateApplication,
  unsaveOpportunity,
  removeApplication,
} from "@/server/applications";
export async function GET(request: Request) {
  try {
    return Response.json(await applications(await apiActor(request)));
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await apiActor(request);
    const v = z
      .object({ scholarshipId: z.string().min(1) })
      .strict()
      .parse(await readBody(request));
    return Response.json(await saveOpportunity(actor, v.scholarshipId));
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request) {
  try {
    const actor = await apiActor(request);
    const v = z
      .object({ id: z.string(), data: z.unknown() })
      .strict()
      .parse(await readBody(request));
    return Response.json(await updateApplication(actor, v.id, v.data));
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request) {
  try {
    const actor = await apiActor(request);
    const v = z
      .discriminatedUnion("action", [
        z.object({ action: z.literal("unsave"), scholarshipId: z.string() }).strict(),
        z
          .object({
            action: z.literal("remove"),
            id: z.string(),
            confirmation: z.literal("REMOVE"),
          })
          .strict(),
      ])
      .parse(await readBody(request));
    return Response.json(
      v.action === "unsave"
        ? await unsaveOpportunity(actor, v.scholarshipId)
        : await removeApplication(actor, v.id, v.confirmation),
    );
  } catch (e) {
    return apiError(e);
  }
}
