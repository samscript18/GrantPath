import type { NextRequest } from "next/server";
import { serve } from "inngest/next";
import { inngest, processApplicationJobs } from "@/server/jobs/inngest";
export const maxDuration = 60;
const handlers = serve({ client: inngest, functions: [processApplicationJobs] });
function configured() {
  return !!process.env.INNGEST_SIGNING_KEY;
}
export async function GET(request: NextRequest) {
  if (!configured())
    return Response.json(
      {
        message:
          "Inngest is not configured. Set INNGEST_SIGNING_KEY or run npm run jobs:run outside Vercel.",
      },
      { status: 503 },
    );
  return handlers.GET(request, undefined);
}
export async function POST(request: NextRequest) {
  if (!configured())
    return Response.json({ message: "Inngest signing is not configured." }, { status: 503 });
  return handlers.POST(request, undefined);
}
export async function PUT(request: NextRequest) {
  if (!configured())
    return Response.json({ message: "Inngest signing is not configured." }, { status: 503 });
  return handlers.PUT(request, undefined);
}
