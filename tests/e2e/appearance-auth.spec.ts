import { test, expect } from "./fixtures";

test("appearance follows the system, persists overrides, syncs tabs, and remains usable without storage", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByLabel("Appearance")).toHaveValue("system");
  await page.getByLabel("Appearance").selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.getByLabel("Appearance")).toHaveValue("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const other = await context.newPage();
  await other.goto("/login");
  await expect(other.getByLabel("Appearance")).toHaveValue("light");
  await page.getByLabel("Appearance").selectOption("dark");
  await expect(other.getByLabel("Appearance")).toHaveValue("dark");
  await expect(other.locator("html")).toHaveAttribute("data-theme", "dark");
  await other.close();
  await page.goto("/scholarships?q=Twente");
  await expect(page.getByLabel("Appearance")).toHaveValue("dark");
  await page.getByRole("link", { name: "University of Twente Scholarship", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Evidence you can inspect." })).toBeVisible();
  await page.screenshot({ path: "test-results/dark-evidence-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of ["/", "/login", "/register", "/scholarships"]) {
    await page.goto(path);
    await expect(page.getByLabel("Appearance")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.goto("/register");
  await page.screenshot({ path: "test-results/dark-register-mobile.png", fullPage: true });
  await page.getByLabel("Appearance").selectOption("system");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "getItem", {
      value() {
        throw new Error("Storage disabled for this test");
      },
    });
    Object.defineProperty(Storage.prototype, "setItem", {
      value() {
        throw new Error("Storage disabled for this test");
      },
    });
  });
  await page.reload();
  await page.getByLabel("Appearance").selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(errors).toEqual([]);
});

test("Google login and signup use the same provider, recover from failure, and start a real OAuth redirect", async ({
  page,
}) => {
  await page.goto("/register");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await page.goto("/login?oauth=failed");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Google sign-in did not finish",
  );
  await page.route("**/api/auth/sign-in/social", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Isolated unavailable-provider fixture" }),
    }),
  );
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Google sign-in is unavailable",
  );
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Welcome back" })).toBeEnabled();
  await page.unroute("**/api/auth/sign-in/social");
  await page.route("https://accounts.google.com/**", (route) => route.abort());
  const authorization = page.waitForRequest((request) =>
    request.url().startsWith("https://accounts.google.com/"),
  );
  await page.getByRole("button", { name: "Continue with Google" }).click();
  const request = await authorization;
  const url = new URL(request.url());
  expect(url.searchParams.get("client_id")).toBe("isolated.browser.apps.googleusercontent.com");
  expect(url.searchParams.get("redirect_uri")).toBe(
    "http://127.0.0.1:3100/api/auth/callback/google",
  );
  expect(url.searchParams.get("code_challenge_method")).toBe("S256");
});
