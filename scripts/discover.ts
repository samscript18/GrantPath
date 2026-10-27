import "dotenv/config";
import { db } from "../src/lib/db";
import {
  discoverBatch,
  detailBatch,
  checkDirectory,
  checkCandidate,
} from "../src/server/discovery/worker";
import { configureDirectory, registerMappedDetails } from "../src/server/discovery/service";
import { directoryDefinitions } from "../src/server/discovery/registry";
async function main() {
  const args = process.argv.slice(2);
  const value = (key: string) => args[args.indexOf(key) + 1];
  const limit = args.includes("--limit") ? Number(value("--limit")) : 3;
  if (!Number.isInteger(limit) || limit < 1 || limit > 6) throw new Error("Limit must be1–6.");
  if (args.includes("--configure")) {
    const actor = {
      id: "discovery-policy-bootstrap",
      name: "Source policy administrator",
      email: "policy@example.test",
      role: "operator",
    };
    const id = value("--configure"),
      reason = value("--reason");
    if (!directoryDefinitions[id] || !reason || reason.length < 10)
      throw new Error("--configure ID --reason 'policy review reason' [--enable] [--automatic]");
    console.log(
      await configureDirectory(actor, id, {
        enabled: args.includes("--enable"),
        autoPublish: args.includes("--automatic"),
        reason,
      }),
    );
    return;
  }
  if (args.includes("--register-details")) {
    const actor = {
      id: "discovery-policy-bootstrap",
      name: "Source policy administrator",
      email: "policy@example.test",
      role: "operator",
    };
    console.log(JSON.stringify(await registerMappedDetails(actor, value("--register-details"))));
    return;
  }
  const result = args.includes("--directory")
    ? await checkDirectory(value("--directory"))
    : args.includes("--candidate")
      ? await checkCandidate(value("--candidate"))
      : args.includes("--details")
        ? await detailBatch(limit)
        : await discoverBatch(limit);
  console.log(JSON.stringify(result, null, 2));
  if ((Array.isArray(result) ? result : [result]).some((r) => r.state === "failed"))
    process.exitCode = 1;
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(async () => db().$disconnect());
