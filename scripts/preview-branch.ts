import "dotenv/config";
// Explicit manual helper. Never runs as a build side effect; does not print credentials.
async function main() {
  const pr = process.argv[2];
  if (!pr || !/^\d+$/.test(pr)) throw new Error("Usage: tsx scripts/preview-branch.ts PR_NUMBER");
  const { NEON_API_KEY: token, NEON_PROJECT_ID: project, NEON_PARENT_BRANCH_ID: parent } = process.env;
  if (!token || !project || !parent) throw new Error("Set NEON_API_KEY, NEON_PROJECT_ID and empty baseline NEON_PARENT_BRANCH_ID.");
  const base = `https://console.neon.tech/api/v2/projects/${encodeURIComponent(project)}/branches`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const listing = await fetch(base, { headers }); if (!listing.ok) throw new Error(`Neon listing failed (${listing.status})`);
  const existing = await listing.json() as { branches: { id: string; name: string }[] };
  const name = `grantpath-pr-${pr}`;
  const found = existing.branches.find(b => b.name === name);
  if (found) { console.log(`Existing isolated branch: ${found.id}. Configure endpoints in the secret store; credentials are not printed.`); return; }
  const response = await fetch(base, { method: "POST", headers, body: JSON.stringify({ branch: { name, parent_id: parent }, endpoints: [{ type: "read_write" }] }) });
  if (!response.ok) throw new Error(`Neon branch creation failed (${response.status}); verify free allowance before retrying.`);
  const body = await response.json() as { branch: { id: string } };
  console.log(`Created isolated branch: ${body.branch.id}. Configure its endpoints securely before deploying.`);
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
