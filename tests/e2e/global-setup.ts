import { runApplicationJobs } from "../../src/server/jobs/run";
import { spawnSync } from "node:child_process";
import { db } from "../../src/lib/db";
export default async function globalSetup() {
  process.env.ENABLE_CONTROLLED_FIXTURES = "1";
  for (const [script, ...args] of [
    ["db:migrate"],
    ["db:seed"],
    ["catalogue:corrections", "--", "--apply"],
    ["db:test-accounts"],
  ]) {
    const r = spawnSync("npm", ["run", script, ...args], { stdio: "inherit", env: process.env });
    if (r.status !== 0) throw new Error(`Browser setup failed: ${script}`);
  }
  // Retain audit evidence but keep previous isolated fixtures out of discovery.
  await db().scholarship.updateMany({
    where: {
      title: { startsWith: "[TEST ONLY]" },
      programme: { NOT: { slug: { startsWith: "test-release-" } } },
    },
    data: { published: false },
  });
  // Earlier runs archived these fixed, labelled release fixtures too. Restore
  // their accepted versions only in the isolated browser database.
  await db().scholarship.updateMany({
    where: {
      title: { startsWith: "[TEST ONLY]" },
      programme: { slug: { startsWith: "test-release-" } },
      version: { gt: 0 },
    },
    data: { published: true },
  });
  for (let batch = 0; batch < 40; batch++) {
    const result = await runApplicationJobs(50);
    if (!result.events.completed && !result.deliveries.length) break;
  }
  await db().$disconnect();
}
