import { writeFile } from "node:fs/promises";
import { db } from "../src/lib/db";
import { directoryDefinitions } from "../src/server/discovery/registry";
import { fetchDiscoveryPage } from "../src/server/discovery/worker";
const raw = process.env.GROWTH_DATABASE_URL;
if (
  !raw ||
  new URL(raw).hostname !== "127.0.0.1" ||
  new URL(raw).pathname !== "/grantpath_growth_test"
)
  throw Error("Explicit isolated growth database required");
process.env.DATABASE_URL = raw;
process.env.DATABASE_TRANSPORT = "tcp";
const id = process.argv[2];
if (!id) throw Error("Candidate id required");
try {
  const candidate = await db().discoveredCandidate.findUniqueOrThrow({ where: { id } });
  const d = directoryDefinitions[candidate.directoryId];
  if (!d?.review) throw Error("Reviewed source required");
  const page = await fetchDiscoveryPage(candidate.canonicalUrl, d, "detail", new Map());
  await writeFile(`.local/growth/inspect-${id}.html`, page.text);
  console.log(JSON.stringify({ id, url: candidate.canonicalUrl, status: page.status }));
} finally {
  await db().$disconnect();
}
