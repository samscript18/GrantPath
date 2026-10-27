import { after } from "next/server";
import { apiActor, apiError, readBody } from "@/lib/http";
import { ownedSessionId } from "@/server/accounts/request-session";
import {
  requestSecurityCode,
  confirmSecurityCode,
  securityStatus,
} from "@/server/accounts/security";
import { kickAccountEvent } from "@/server/accounts/jobs";
export async function GET(request: Request) {
  try {
    const actor = await apiActor(request);
    return Response.json(
      await securityStatus(actor, await ownedSessionId(actor, request.headers)),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await apiActor(request);
    const result = await requestSecurityCode(
      actor,
      await ownedSessionId(actor, request.headers),
      await readBody(request),
    );
    after(() => kickAccountEvent(result.eventId));
    return Response.json(
      {
        id: result.id,
        purpose: result.purpose,
        expiresAt: result.expiresAt,
        resendAt: result.resendAt,
        emailState: result.emailState,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function PUT(request: Request) {
  try {
    const actor = await apiActor(request);
    return Response.json(
      await confirmSecurityCode(
        actor,
        await ownedSessionId(actor, request.headers),
        await readBody(request),
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
