import { dismissStudyPrompt, expect, test } from "./fixtures";

const password = process.env.TEST_ACCOUNT_PASSWORD || "Isolated-test-passphrase-42";

test("phone navigation stays reachable and releases focus when closed or resized", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto("/login");
  await page.getByLabel("Email address").fill("student@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Welcome back" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await dismissStudyPrompt(page);
  const quick = page.getByRole("navigation", { name: "Quick navigation" });
  await expect(quick).toBeVisible();
  await quick.getByRole("button", { name: "More navigation" }).click();
  const dialog = page.locator("#workspace-mobile-menu");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveJSProperty("open", false);
  await expect(quick.getByRole("button", { name: "More navigation" })).toBeFocused();

  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(dialog).toHaveJSProperty("open", false);
  await page.setViewportSize({ width: 768, height: 900 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(dialog).toHaveJSProperty("open", false);
});

test("the final study-profile actions fit a narrow phone without page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto("/login");
  await page.getByLabel("Email address").fill("student@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Welcome back" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await dismissStudyPrompt(page);
  await page.goto("/settings/profile");
  await page.getByRole("button", { name: /Other requirements/ }).click();
  const save = page.getByRole("button", { name: "Save & see my matches" });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeVisible();
  const bounds = await save.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
