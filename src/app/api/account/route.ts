import { apiActor, apiError, readBody } from "@/lib/http";
import { saveAccountName } from "@/server/accounts/profile";

export async function PATCH(request: Request) {
  try {
    const actor = await apiActor(request);
    return Response.json(await saveAccountName(actor, await readBody(request)));
  } catch (error) {
    return apiError(error);
  }
}
