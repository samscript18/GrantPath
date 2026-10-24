import { test, expect } from "./fixtures";
import { db } from "../../src/lib/db";
const password = process.env.TEST_ACCOUNT_PASSWORD || "Isolated-test-passphrase-42";
test("registration, captured verification, staged profile, sign out and return", async ({
  page,
}) => {
  const email = `browser-${crypto.randomUUID()}@example.test`;
  await page.goto("/register");
  await page.getByLabel("Your name").fill("Test Explorer");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create your account" }).click();
  await expect(page).toHaveURL(/verify-email/);
  const mail = await db().emailSink.findFirstOrThrow({
    where: { recipient: email },
    orderBy: { createdAt: "desc" },
  });
  const url = mail.body.match(/https?:\/\/\S+/)![0];
  await page.goto(url);
  await expect(page).toHaveURL(/profile/);
  await page.getByLabel("Citizenship(s)").fill("Nigeria");
  await page.getByLabel("Country of residence").fill("Ghana");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByLabel("Current qualification")).toBeVisible();
  await page.getByLabel("Current qualification").selectOption("bachelor");
  await page.getByLabel("Completion status").selectOption("final_year");
  await page.getByLabel("Actual or expected graduation").fill("2027-06-01");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByLabel("Intended future qualification")).toBeVisible();
  await page.getByLabel("Intended future qualification").selectOption("master");
  await page.getByLabel("Intended field of study").fill("Computer Science");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await page.getByRole("button", { name: "Save & see my matches" }).click();
  await expect(page).toHaveURL(/dashboard/);
  const updateResponse = page.waitForResponse(
    (r) => r.url().endsWith("/api/matches") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Update my matches" }).click();
  const response = await updateResponse;
  expect(response.ok()).toBe(true);
  expect((await response.json()).remaining).toBe(0);
  await expect(page.getByRole("button", { name: "Update my matches" })).toHaveCount(0);
  await expect(page.getByText("Potential · confirm requirements").first()).toBeVisible();
  await page.screenshot({ path: "test-results/dashboard-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Welcome back" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/profile");
  await page.getByRole("button", { name: /Your world/ }).click();
  await expect(page.getByLabel("Citizenship(s)")).toHaveValue("Nigeria");
  await expect(page.getByLabel("Country of residence")).toHaveValue("Ghana");
});
test("discovery filters, evidence, private idempotent save and application progress", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("student@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Welcome back" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/scholarships");
  await page.getByLabel("Search scholarships").fill("Twente");
  await page.getByLabel("Destination", { exact: true }).selectOption("Netherlands");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=Twente/);
  await page.reload();
  await expect(page.getByLabel("Search scholarships")).toHaveValue("Twente");
  await page.getByRole("link", { name: "University of Twente Scholarship", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Evidence you can inspect." })).toBeVisible();
  const source = page.locator("#evidence-funding");
  await expect(source).toContainText("€ 3,000 - € 22,000");
  const save = page.getByRole("button", { name: "Save opportunity", exact: true });
  if (await save.isVisible()) await save.click();
  await expect(page.getByRole("button", { name: "Saved · click to unsave" })).toBeVisible();
  const scholarship = await db().scholarship.findUniqueOrThrow({
    where: { slug: "twente-uts-2027" },
  });
  const replay = await page.request.post("/api/applications", {
    headers: { Origin: "http://127.0.0.1:3100" },
    data: { scholarshipId: scholarship.id },
  });
  expect(replay.ok()).toBe(true);
  const user = await db().user.findUniqueOrThrow({ where: { email: "student@example.test" } });
  expect(
    await db().application.count({ where: { userId: user.id, scholarshipId: scholarship.id } }),
  ).toBe(1);
  await page.getByText(/My application plan ·/).click();
  await page.getByLabel("My application progress").selectOption("Preparing documents");
  await page
    .getByLabel("Private notes")
    .fill("Ask the provider to confirm language subscore requirements.");
  await page.getByRole("button", { name: "Save my plan" }).click();
  await expect(page.getByText("Your plan is saved.", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByText(/My application plan ·/).click();
  await expect(page.getByLabel("Private notes")).toHaveValue(
    "Ask the provider to confirm language subscore requirements.",
  );
  await expect(page.getByLabel("My application progress")).toHaveValue("Preparing documents");
  await expect(page.getByText("Open", { exact: true })).toBeVisible();
  expect(
    (await db().scholarship.findUniqueOrThrow({ where: { id: scholarship.id } })).availability,
  ).toBe("open");
  await page.goto("/applications");
  await expect(
    page.getByRole("heading", { name: "Preparing documents", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "University of Twente Scholarship", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/applications-desktop.png", fullPage: true });
});
test("360px public pages have no horizontal overflow and empty filters recover", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of ["/", "/login", "/scholarships", "/scholarships/eth-esop-2027"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      path,
    ).toBe(true);
    await page.screenshot({
      path: `test-results/mobile-${path.replaceAll("/", "-") || "home"}.png`,
      fullPage: true,
    });
  }
  await page.goto("/scholarships?q=no-such-opportunity-xyz");
  await expect(
    page.getByRole("heading", { name: "Room for a different direction." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Reset filters", exact: true }).click();
  await expect(page.getByLabel("Search scholarships")).toHaveValue("");
});
