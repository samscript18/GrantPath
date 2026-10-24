import "dotenv/config";
import { spawnSync } from "node:child_process";
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.includes("test"))
  throw new Error("Refusing to migrate: TEST_DATABASE_URL must name an isolated test database.");
const result = spawnSync("node", ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
});
process.exitCode = result.status ?? 1;
