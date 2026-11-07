// Public deployment identity only; never expose credentials or student data.
export const dynamic = "force-dynamic";
export function GET() {
  const revision = process.env.VERCEL_GIT_COMMIT_SHA || process.env.APP_REVISION || "";
  return Response.json(
    { application: "GrantPath", revision: /^[a-f0-9]{40}$/.test(revision) ? revision : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
