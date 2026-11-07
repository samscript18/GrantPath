import { z } from "zod";
import { assertSameOrigin, readBody, apiError } from "@/lib/http";
import { verificationCooldown } from "@/server/accounts/verification-cooldown";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { email } = z.object({ email: z.email() }).parse(await readBody(request));
    return Response.json(await verificationCooldown(email), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
