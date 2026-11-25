import { apiActor, apiError } from "@/lib/http";
import { matchOverview, recalculateUser } from "@/server/eligibility";
export async function GET(request: Request) {
  try {
    return Response.json(
      await matchOverview(
        await apiActor(request),
        Number(new URL(request.url).searchParams.get("page") || 1),
      ),
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    return Response.json(await recalculateUser(await apiActor(request)));
  } catch (e) {
    return apiError(e);
  }
}
