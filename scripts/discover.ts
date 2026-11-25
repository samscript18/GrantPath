import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { discoveryRunSummary } from "../src/server/discovery/report";
import { db } from "../src/lib/db";
import {
  discoverBatch,
  detailBatch,
  checkDirectory,
  checkCandidate,
} from "../src/server/discovery/worker";
import { configureDirectory, registerMappedDetails } from "../src/server/discovery/service";
import { directoryDefinitions } from "../src/server/discovery/registry";
import { opportunityAdapters } from "../src/server/discovery/adapter-registry";
import { directoryAdapters } from "../src/server/discovery/directory-adapters";
async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--list")) {
    console.log(
      JSON.stringify(
        {
          directoryAdapters: [...directoryAdapters.keys()],
          detailAdapters: opportunityAdapters.list(),
          sources: Object.values(directoryDefinitions)
            .filter((d) => d.id !== "controlled-release")
            .map((d) => ({
              id: d.id,
              url: d.url,
              directoryAdapter: d.directoryAdapter || "official-html-1",
              detailAdapter: d.dynamicDetail || "reviewed-exact-mapping",
              review: d.review || null,
            })),
        },
        null,
        2,
      ),
    );
    return;
  }
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
  const results = Array.isArray(result) ? result : [result];
  const report = {
    checkedAt: new Date().toISOString(),
    phase: args.includes("--details") || args.includes("--candidate") ? "details" : "discovery",
    summary: discoveryRunSummary(results),
    results,
  };
  console.log(JSON.stringify(report, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY)
    await writeFile(
      process.env.GITHUB_STEP_SUMMARY,
      `### Official-source ${report.phase}\n\n| Outcome | Count |\n| --- | --- |\n${Object.entries(
        report.summary,
      )
        .filter(([, v]) => typeof v === "number")
        .map(([k, v]) => `| ${k} | ${v} |`)
        .join("\n")}\n\n${report.summary.message}\n`,
      { flag: "a" },
    );
  if (
    (Array.isArray(result) ? result : [result]).some(
      (r) => r.state === "failed" || r.state === "unsupported_directory",
    )
  )
    process.exitCode = 1;
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(async () => db().$disconnect());
