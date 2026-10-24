import { apiActor, apiError, readBody } from "@/lib/http";
import { getProfile, saveProfile } from "@/server/profiles";
import { z } from "zod";
export async function GET(request: Request) {
  try {
    return Response.json(await getProfile(await apiActor(request)));
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request) {
  try {
    const actor = await apiActor(request);
    const input = z
      .object({
        data: z.unknown(),
        version: z.number().int().nonnegative(),
        stage: z.number().int().min(0).max(3),
      })
      .strict()
      .parse(await readBody(request));
    return Response.json(await saveProfile(actor, input.data, input.version, input.stage));
  } catch (e) {
    return apiError(e);
  }
}
