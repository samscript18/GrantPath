import "dotenv/config";
import { db } from "../src/lib/db";
import { checkSource, ingestBatch } from "../src/server/monitoring/worker";
async function main() {
  const args = process.argv.slice(2);
  const source = args[args.indexOf("--source") + 1];
  if (args.includes("--source") && (!source || source.startsWith("--")))
    throw new Error("--source needs a registered source ID.");
  const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : 6;
  if (!Number.isInteger(limit) || limit < 1 || limit > 6)
    throw new Error("Limit must be an integer from 1 to 6.");
  const result = args.includes("--source")
    ? await checkSource(source, true)
    : await ingestBatch(limit);
  console.log(JSON.stringify(result, null, 2));
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(async () => db().$disconnect());
