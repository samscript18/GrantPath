import { getAuth } from "@/server/accounts/auth";
import { SetupError } from "@/lib/env";
async function handler(request: Request) {
  try {
    const response = await getAuth().handler(request);
    if (
      request.method === "GET" &&
      new URL(request.url).pathname.endsWith("/verify-email") &&
      response.status >= 400
    )
      return Response.redirect(
        new URL("/verify-email?error=expired-or-used", process.env.BETTER_AUTH_URL),
        303,
      );
    return response;
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
