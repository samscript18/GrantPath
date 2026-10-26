import { test, expect } from "./fixtures";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
const execute = promisify(execFile);
test("exact reusable TestSprite sources assert the connected public, policy, eligibility, notification and ownership journeys locally", async () => {
  test.setTimeout(240000);
  const python =
    process.env.GRANTPATH_PYTHON ||
    (existsSync(".local/playwright-python/bin/python")
      ? ".local/playwright-python/bin/python"
      : "python3");
  const password = process.env.TEST_ACCOUNT_PASSWORD || "Isolated-test-passphrase-42";
  for (const script of [
    "discovery_evidence",
    "profile_application",
    "multi_destination",
    "automatic_publication",
    "publication_exception",
    "eligibility_notification",
    "access_denial",
  ]) {
    const placeholders = [
      ...readFileSync(`docs/testsprite/code/${script}.py`, "utf8").matchAll(/VAR_\{([^}]+)\}/g),
    ].map((match) => match[1]);
    expect(
      placeholders.every((name) =>
        ["url", "username", "password", "operator_email", "other_email"].includes(name),
      ),
      `Unsupported provider template marker in ${script}`,
    ).toBe(true);
    const result = await execute(python, [`docs/testsprite/code/${script}.py`], {
      timeout: 180000,
      maxBuffer: 250000,
      env: {
        ...process.env,
        GRANTPATH_TEST_URL: "http://127.0.0.1:3100",
        GRANTPATH_TEST_USERNAME: "student@example.test",
        GRANTPATH_TEST_PASSWORD: password,
        GRANTPATH_OPERATOR_EMAIL: "operator@example.test",
        GRANTPATH_OTHER_EMAIL: "other@example.test",
        GRANTPATH_CHROMIUM_PATH: chromium.executablePath(),
        PYTHONPYCACHEPREFIX: process.cwd() + "/.local/python-cache",
      },
    }).catch((e) => ({
      stdout: "",
      stderr: String(e.stderr || e.message)
        .split(password)
        .join("[REDACTED]"),
      failed: true,
    }));
    expect("failed" in result, `Exact reusable source ${script}: ${result.stderr}`).toBe(false);
  }
});
