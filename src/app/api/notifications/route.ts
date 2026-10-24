import { z } from "zod";
import { apiActor, apiError, readBody } from "@/lib/http";
import { inbox, markRead, savePreferences } from "@/server/notifications";
export async function GET(request: Request) {
  try {
    const actor = await apiActor(request);
    const p = new URL(request.url).searchParams;
    return Response.json(
      await inbox(actor, {
        page: Number(p.get("page") || 1),
        unread: p.get("filter") === "unread",
      }),
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request) {
  try {
    const actor = await apiActor(request);
    const input = z
      .object({ action: z.literal("preferences"), preferences: z.unknown() })
      .strict()
      .parse(await readBody(request));
    return Response.json(await savePreferences(actor, input.preferences));
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await apiActor(request);
    const input = z
      .object({ action: z.literal("read"), id: z.string().optional() })
      .strict()
      .parse(await readBody(request));
    return Response.json(await markRead(actor, input.id));
  } catch (e) {
    return apiError(e);
  }
}
