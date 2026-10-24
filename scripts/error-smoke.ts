import { chromium, expect } from "@playwright/test";
// Run only against the deliberately unavailable local test-database server.
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 360, height: 800 },
    reducedMotion: "reduce",
  });
  await page.goto("http://127.0.0.1:3201/scholarships");
  const heading = page.getByRole("heading", { name: "We couldn’t load this page." });
  await expect(heading).toBeVisible();
  const retried = page.waitForResponse(
    (r) => r.url().includes("/scholarships") && r.request().headers()["rsc"] === "1",
  );
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await retried;
  await expect(heading).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "docs/evidence/unavailable-database-mobile.png", fullPage: true });
  console.log(
    "PASS: controlled unavailable database renders a readable mobile error; retry requests the route again and remains recoverable. No database was stopped or modified.",
  );
} finally {
  await browser.close();
}
