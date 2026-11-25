import { writeFile } from "node:fs/promises";
import { db } from "../src/lib/db";
import { configureDirectory } from "../src/server/discovery/service";
import { checkCandidate } from "../src/server/discovery/worker";
const raw = process.env.GROWTH_DATABASE_URL;
if (
  !raw ||
  new URL(raw).hostname !== "127.0.0.1" ||
  new URL(raw).pathname !== "/grantpath_growth_test"
)
  throw Error("Explicit isolated catalogue required");
process.env.DATABASE_URL = raw;
process.env.DATABASE_TRANSPORT = "tcp";
const actor = {
  id: "service:development-window-review",
  name: "Development operator",
  email: "windows@example.test",
  role: "operator",
};
const id = "erasmus-mundus-catalogue";
const urls = [
  "https://www.msc-waves.eu/",
  "https://www.eu-conexus.eu/en/marine-biotechnology/",
  "https://mastergeotech.info/",
];
const results = [];
try {
  await configureDirectory(actor, id, {
    enabled: true,
    autoPublish: true,
    reason:
      "Bounded existing-programme window verification against approved exact primary/support pages in isolated development only.",
  });
  const access = new Map();
  for (const url of process.argv.includes("--marine-only")
    ? urls.filter((url) => url.includes("eu-conexus"))
    : urls) {
    const candidate = await db().discoveredCandidate.findUniqueOrThrow({
      where: { directoryId_canonicalUrl: { directoryId: id, canonicalUrl: url } },
    });
    const result = await checkCandidate(candidate.id, access);
    results.push({ url, ...result });
    console.log(JSON.stringify(results.at(-1)));
  }
} finally {
  await configureDirectory(actor, id, {
    enabled: false,
    autoPublish: false,
    reason:
      "Existing-programme window verification finished; isolated retrieval and automatic publication paused.",
  });
  await writeFile(
    `docs/evidence/application-window-support-${process.argv.includes("--marine-only") ? "marine-reviewed" : "retrievals"}.json`,
    JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2) + "\n",
  );
  await db().$disconnect();
}
