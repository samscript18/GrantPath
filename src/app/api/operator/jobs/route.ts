import { z } from "zod";
import { apiActor, apiError, readBody } from "@/lib/http";
import { processOperatorJobs } from "@/server/operator/jobs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const actor = await apiActor(request);
    const input = z
      .object({ limit: z.number().int().min(1).max(20).default(10) })
      .strict()
      .parse(await readBody(request));
    return Response.json(await processOperatorJobs(actor, input.limit));
  } catch (e) {
    return apiError(e);
  }
}
