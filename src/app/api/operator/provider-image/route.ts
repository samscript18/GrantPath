import { after } from "next/server";
import { apiActor, apiError, readBody } from "@/lib/http";
import { saveProviderImage } from "@/server/scholarships/images";
import { kickAccountEvent } from "@/server/accounts/jobs";
export async function PUT(request: Request) {
  try {
    const { cleanupEventIds, ...result } = await saveProviderImage(
      await apiActor(request),
      await readBody(request),
    );
    after(async () => {
      for (const id of cleanupEventIds) await kickAccountEvent(id);
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
