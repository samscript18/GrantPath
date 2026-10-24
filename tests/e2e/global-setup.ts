import { spawnSync } from "node:child_process";
import { db } from "../../src/lib/db";
export default async function globalSetup() {
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
    where: { title: { startsWith: "[TEST ONLY]" } },
    data: { published: false },
  });
  await db().$disconnect();
}
