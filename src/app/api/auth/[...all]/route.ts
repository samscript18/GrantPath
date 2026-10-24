import { getAuth } from "@/server/accounts/auth";
import { SetupError } from "@/lib/env";
async function handler(request: Request) {
  try {
    return await getAuth().handler(request);
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof SetupError
            ? error.message
            : "Account service is temporarily unavailable. Please retry.",
      },
      { status: 503 },
    );
  }
}
export const GET = handler;
export const POST = handler;
