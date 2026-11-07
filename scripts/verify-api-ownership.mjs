import { matchesReviewedBackendSource } from "./lib/native-source.mjs";
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

const project = "d36cedef-a40e-4fb7-ae61-f3b2484ede06";
const test = "88b47334-232c-4665-a6a2-413b09c34eb5";
const sha = process.env.RELEASE_HEAD_SHA;
const repo = process.env.GITHUB_REPOSITORY;
const branch = process.env.RELEASE_HEAD_REF;
if (
  !/^[a-f0-9]{40}$/.test(sha || "") ||
  repo !== "samscript18/GrantPath" ||
  branch !== "release/hosted-verification" ||
  !process.env.TESTSPRITE_API_KEY ||
  !process.env.GITHUB_TOKEN
)
  throw new Error(
    "Native API verification requires the authorised isolated release preview and configured keys.",
  );
const origin = "https://grantpath-git-release-hosted-verification-lammysam8-7688.vercel.app";
const pause = () => new Promise((resolve) => setTimeout(resolve, 15000));
const deadline = Date.now() + 15 * 60_000;
let ready = false;
while (Date.now() < deadline) {
  const response = await fetch(
    `https://api.github.com/repos/${repo}/commits/${sha}/statuses?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!response.ok) throw new Error(`Deployment status read failed: ${response.status}`);
  const status = (await response.json()).find((row) => row.context === "Vercel");
  if (status && ["failure", "error"].includes(status.state))
    throw new Error("Release deployment failed.");
  if (status?.state === "success") {
    const health = await fetch(origin + "/api/health", {
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (health.ok && (await health.json()).revision === sha) {
      ready = true;
      break;
    }
  }
  console.log("Waiting for this exact commit at the isolated preview; no test dispatched.");
  await pause();
}
if (!ready) throw new Error("Exact deployed revision was not verified; no credited run started.");
async function cli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      [
        "--yes",
        "--package=@testsprite/testsprite-cli@0.15.0",
        "--",
        "testsprite",
        ...args,
        "--output",
        "json",
      ],
      {
        env: { ...process.env, TESTSPRITE_NO_TELEMETRY: "1", TESTSPRITE_NO_UPDATE_NOTIFIER: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let out = "";
    child.stdout.on("data", (b) => {
      out += b;
    });
    // Do not echo provider diagnostics, which may include expanded source credentials.
    child.stderr.resume();
    child.on("error", reject);
    child.on("close", (code) => {
      try {
        resolve({ code, data: JSON.parse(out) });
      } catch {
        reject(new Error("TestSprite returned an unreadable result; raw output withheld."));
      }
    });
  });
}
const usage = await cli(["usage"]);
const before = usage.data.credits;
// Owner-approved reserve: 30 credits, with a conservative 0.5-credit run cap.
// The job therefore requires at least 30.5 credits before dispatch.
if (usage.code || typeof before !== "number" || before - 0.5 < 30)
  throw new Error(
    "Credit balance unavailable or 30-credit reserve would be crossed (30.5 credits required); no run started.",
  );
const config = await cli([
  "project",
  "env",
  "update",
  project,
  "default",
  "--url",
  origin,
  "--var",
  `expected_commit=${sha}`,
]);
if (config.code || config.data.environment?.variables?.expected_commit !== sha)
  throw new Error("Exact-commit API environment was not saved; no run started.");
const source = await cli(["test", "code", "get", test]);
if (
  source.code ||
  !matchesReviewedBackendSource(
    source.data.code,
    await readFile("docs/testsprite/code/access_denial_api.py", "utf8"),
  )
)
  throw new Error("Native API source differs from reviewed repository assertions; no run started.");
const run = await cli([
  "test",
  "run",
  test,
  "--env",
  "default",
  "--wait",
  "--timeout",
  "600",
  "--no-auto-heal",
  "--idempotency-key",
  `grantpath-api-${sha}`,
]);
const after = await cli(["usage"]);
const result = {
  checkedAt: new Date().toISOString(),
  head: sha,
  origin,
  project,
  test,
  runId: run.data.runId,
  codeVersion: run.data.codeVersion,
  expectedCodeVersion: source.data.codeVersion,
  status: run.data.status,
  executionUrl: run.data.executionUrl,
  balanceBefore: before,
  balanceAfter: after.data.credits,
  // This account-level window may include a parallel App suite; it is not a per-case cost estimate.
  observedDebit: typeof after.data.credits === "number" ? before - after.data.credits : null,
  assertionsReported:
    run.data.apiOutput ===
    "Verified: cross-account update 404; foreign read excluded; all owner fields unchanged; operator mutation 403.\n",
};
await writeFile("testsprite-api-summary.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
if (
  run.code ||
  run.data.status !== "passed" ||
  run.data.codeVersion !== source.data.codeVersion ||
  !result.assertionsReported
)
  throw new Error("Native API assertions did not pass completely; merge must remain blocked.");
