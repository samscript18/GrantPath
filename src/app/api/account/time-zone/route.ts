import { apiActor, apiError, readBody } from "@/lib/http";
import { saveTimeZone } from "@/server/profiles";
export async function PATCH(request: Request) {
  try {
    return Response.json(await saveTimeZone(await apiActor(request), await readBody(request)));
  } catch (error) {
    return apiError(error);
  }
}
