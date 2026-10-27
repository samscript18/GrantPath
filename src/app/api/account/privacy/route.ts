import { apiActor, apiError } from "@/lib/http";
import { privacyStatus, cancelDeletion } from "@/server/accounts/privacy";
export async function GET(request: Request) {
  try {
    return Response.json(await privacyStatus(await apiActor(request)), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    return Response.json(await cancelDeletion(await apiActor(request)));
  } catch (error) {
    return apiError(error);
  }
}
