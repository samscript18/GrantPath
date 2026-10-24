import { test, expect } from "./fixtures";
const password = process.env.TEST_ACCOUNT_PASSWORD || "Isolated-test-passphrase-42";
test("rendered release review: every main screen, mobile, keyboard and recoverable account states", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  await page.getByLabel("Email address").fill("invalid");
  await page.getByLabel("Password", { exact: true }).fill("");
  await page.getByRole("button", { name: "Welcome back" }).click();
  await expect(page.getByText("Enter your password", { exact: true })).toBeVisible();
  await page.getByLabel("Email address").fill("student@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Welcome back" }).click();
  await expect(page).toHaveURL(/dashboard/);
  for (const [name, path] of [
    ["dashboard", "/dashboard"],
    ["catalogue", "/scholarships"],
    ["detail", "/scholarships/twente-uts-2027"],
    ["profile", "/profile"],
    ["saved", "/saved"],
    ["applications", "/applications"],
    ["inbox", "/notifications"],
    ["settings", "/settings"],
    ["notification-settings", "/settings/notifications"],
    ["account-settings", "/settings/account"],
  ]) {
    for (const width of [1440, 360]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("main")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${name} at ${width}px`,
      ).toBe(true);
      await page.screenshot({ path: `test-results/release-${name}-${width}.png`, fullPage: true });
      await page.getByLabel("Appearance").selectOption("dark");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${name} dark at ${width}px`,
      ).toBe(true);
      await page.screenshot({
        path: `test-results/release-dark-${name}-${width}.png`,
        fullPage: true,
      });
      await page.getByLabel("Appearance").selectOption("light");
    }
  }
  // A student cannot render protected operator data, including on mobile.
  await page.goto("/operator");
  await expect(
    page.getByRole("heading", { name: "This path doesn’t lead anywhere." }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/login/);
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [name, path] of [
    ["landing", "/"],
    ["register", "/register"],
    ["recovery", "/forgot-password"],
    ["verification", "/verify-email?error=expired-or-used"],
    ["missing", "/scholarships/does-not-exist"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.screenshot({ path: `test-results/release-${name}.png`, fullPage: true });
  }
  await page.goto("/login");
  await page.getByLabel("Email address").fill("operator@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Welcome back" }).click();
  await expect(page).toHaveURL(/dashboard/);
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/operator");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/release-operator-${width}.png`, fullPage: true });
    await page.getByLabel("Appearance").selectOption("dark");
    await page.screenshot({
      path: `test-results/release-dark-operator-${width}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
