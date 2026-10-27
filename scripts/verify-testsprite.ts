import { readFile } from "node:fs/promises";
import { assessNativeReport } from "../src/server/operator/testsprite-gate";
const repository = process.env.GITHUB_REPOSITORY;
const sha = process.env.RELEASE_HEAD_SHA;
const token = process.env.GITHUB_TOKEN;
if (
  !repository ||
  !/^[\w.-]+\/[\w.-]+$/.test(repository) ||
  !sha ||
  !/^[a-f\d]{40}$/.test(sha) ||
  !token
)
  throw new Error(
    "GITHUB_REPOSITORY, exact RELEASE_HEAD_SHA and read-only GITHUB_TOKEN are required.",
  );
const manifest = JSON.parse(
  await readFile("docs/evidence/testsprite-global-suite-preparation.json", "utf8"),
);
const expected = manifest.cases.length;
if (!Number.isInteger(expected) || expected < 1)
  throw new Error("A nonempty reviewed suite manifest is required.");
const deadline = Date.now() + 20 * 60_000;
while (Date.now() < deadline) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/commits/${sha}/statuses?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!response.ok) throw new Error(`Could not read native App status: GitHub ${response.status}.`);
  const body = await response.json();
  const status = body.find((s: { context: string }) => s.context === "TestSprite V3");
  if (status) {
    const url = new URL(status.target_url || "https://invalid.example");
    if (
      url.hostname !== "www.testsprite.com" ||
      !url.pathname.includes(`/projects/${manifest.projectId}/execution/`)
    )
      throw new Error("Native App status does not link to this project's execution.");
    if (status.creator?.login !== "testsprite[bot]")
      throw new Error("Native status was not posted by the expected TestSprite App bot.");
    const verdict = assessNativeReport(status, expected);
    if (verdict.state !== "pending") {
      console.log(JSON.stringify({ sha, nativeExecution: status.target_url, ...verdict }));
      if (verdict.state !== "passed") process.exitCode = 1;
      break;
    }
  }
  console.log("Waiting for the existing automatic TestSprite execution; no run is dispatched.");
  await new Promise((resolve) => setTimeout(resolve, 15_000));
}
if (Date.now() >= deadline)
  throw new Error(
    "Native App execution did not report a complete passing verdict before the deadline.",
  );
