import { catalogue } from "@/server/scholarships";
import { apiError } from "@/lib/http";
export async function GET(request: Request) { try { return Response.json(await catalogue(Object.fromEntries(new URL(request.url).searchParams))); } catch (e) { return apiError(e); } }
