import { apiActor, apiError, readBody } from "@/lib/http";
import { downloadExport } from "@/server/accounts/privacy";
export async function POST(request: Request) {
  try {
    const json = await downloadExport(await apiActor(request), await readBody(request));
    return new Response(json, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="grantpath-account.json"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
