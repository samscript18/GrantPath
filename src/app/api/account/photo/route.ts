import { after } from "next/server";
import { kickAccountEvent } from "@/server/accounts/jobs";
import { apiActor, apiError, readBody } from "@/lib/http";
import { saveAccountPhoto } from "@/server/accounts/profile";

export async function PUT(request: Request) {
  try {
    const actor = await apiActor(request);
    const { cleanupEventIds, ...result } = await saveAccountPhoto(actor, await readBody(request));
    after(async () => {
      for (const id of cleanupEventIds) await kickAccountEvent(id);
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
