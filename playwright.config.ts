import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";
const database = process.env.E2E_DATABASE_URL || process.env.TEST_DATABASE_URL;
if (!database || !new URL(database).pathname.includes("test")) throw new Error("Browser tests need an isolated E2E_DATABASE_URL or TEST_DATABASE_URL containing test.");
const baseURL = "http://127.0.0.1:3100";
process.env.DATABASE_URL = database;
process.env.DIRECT_URL = database;
process.env.BETTER_AUTH_URL = baseURL;
process.env.APP_ENV = "test";
process.env.EMAIL_MODE = "sink";
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, workers: 1, retries: 0,
  timeout: 45000, expect: { timeout: 10000 },
  globalSetup: "./tests/e2e/global-setup.ts",
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } }],
  webServer: { command: "npm run dev -- --port 3100", url: `${baseURL}/login`, reuseExistingServer: !process.env.CI, timeout: 120000, env: { DATABASE_URL: database, DIRECT_URL: database, APP_ENV: "development", EMAIL_MODE: "sink", BETTER_AUTH_URL: baseURL, NEXT_PUBLIC_APP_URL: baseURL, TRUSTED_ORIGINS: baseURL } },
});
