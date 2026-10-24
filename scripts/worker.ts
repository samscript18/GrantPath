import "dotenv/config";
import { db } from "../src/lib/db";
import { runApplicationJobs } from "../src/server/jobs/run";
async function main() {
  const arg = process.argv.indexOf("--limit");
  const limit = arg > -1 ? Number(process.argv[arg + 1]) : 25;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50)
    throw new Error("Worker limit must be an integer from 1 to 50.");
  console.log(JSON.stringify(await runApplicationJobs(limit)));
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(async () => db().$disconnect());
