import { spawnSync } from "node:child_process";
export default function globalSetup() {
  for (const script of ["db:migrate", "db:seed", "db:test-accounts"]) {
    const r = spawnSync("npm", ["run", script], { stdio: "inherit", env: process.env });
    if (r.status !== 0) throw new Error(`Browser setup failed: ${script}`);
  }
}
