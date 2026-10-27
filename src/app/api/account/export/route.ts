import { after } from "next/server";
import { apiActor, apiError } from "@/lib/http";
import { requestExport } from "@/server/accounts/privacy";
import { kickAccountEvent } from "@/server/accounts/jobs";
export async function POST(request: Request) {
  try {
    const result = await requestExport(await apiActor(request));
    after(() => kickAccountEvent(result.eventId));
    return Response.json(
      { id: result.id, token: result.token },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
