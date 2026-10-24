import { apiActor, apiError, readBody } from "@/lib/http";
import { ownedSessionId } from "@/server/accounts/request-session";
import { sessionList, revokeSessions } from "@/server/accounts/security";
export async function GET(request: Request) {
  try {
    const actor = await apiActor(request);
    return Response.json(await sessionList(actor, await ownedSessionId(actor, request.headers)), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const actor = await apiActor(request);
    return Response.json(
      await revokeSessions(
        actor,
        await ownedSessionId(actor, request.headers),
        await readBody(request),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
