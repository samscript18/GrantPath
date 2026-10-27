import { dismissStudyPrompt, test, expect } from "./fixtures";
const password = process.env.TEST_ACCOUNT_PASSWORD || "Isolated-test-passphrase-42";
test("settings, searchable profile choices, original results, keyboard switches and references persist", async ({
  page,
  browser,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await page.getByLabel("Email address").fill("student@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Welcome back" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await dismissStudyPrompt(page);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Make this space your own." })).toBeVisible();
  await page.getByRole("link", { name: "Your study profile", exact: false }).click();
  await page.getByRole("button", { name: /Your world/ }).click();
  const countries = page.getByRole("list", { name: "Selected citizenship(s)" });
  while (await countries.getByRole("button").count())
    await countries.getByRole("button").first().click();
  await page.getByRole("combobox", { name: "Citizenship(s)", exact: true }).fill("Niger");
  await page.getByRole("option", { name: "Nigeria", exact: true }).click();
  const residence = page.getByRole("list", { name: "Selected country of residence" });
  if (await residence.count()) await residence.getByRole("button").click();
  await page.getByRole("combobox", { name: "Country of residence", exact: true }).fill("Ghana");
  await page.getByRole("option", { name: "Ghana", exact: true }).click();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await page
    .getByRole("form", { name: "Study profile", exact: true })
    .getByLabel("Current qualification")
    .selectOption("bachelor");
  await page
    .getByRole("form", { name: "Study profile", exact: true })
    .getByLabel("Completion status")
    .selectOption("final_year");
  await page
    .getByRole("form", { name: "Study profile", exact: true })
    .getByLabel("Actual or expected graduation")
    .fill("2027-06-01");
  await page
    .getByRole("combobox", { name: "Original degree classification (if available)", exact: true })
    .fill("Second Class Upper Division");
  await page
    .getByRole("combobox", { name: "Original degree classification (if available)", exact: true })
    .press("Enter");
  await page
    .getByRole("form", { name: "Study profile", exact: true })
    .getByLabel("Academic result (original value)")
    .fill("4.25");
  await page
    .getByRole("form", { name: "Study profile", exact: true })
    .getByLabel("Original result scale", { exact: true })
    .fill("5");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await page
    .getByRole("form", { name: "Study profile", exact: true })
    .getByLabel("Intended future qualification")
    .selectOption("master");
  await page
    .getByRole("form", { name: "Study profile", exact: true })
    .getByLabel("Intended field of study")
    .fill("Computer Science");
  const preferred = page.getByRole("list", { name: "Selected preferred study countries" });
  if (await preferred.count()) {
    const removeCanada = preferred.getByRole("button", { name: "Remove Canada", exact: true });
    if (await removeCanada.count()) await removeCanada.click();
  }
  await page
    .getByRole("combobox", { name: "Preferred study countries", exact: true })
    .fill("Canada");
  await page.getByRole("option", { name: "Canada", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Preferred institutions", exact: true })
    .fill("University of Lagos");
  await page.getByRole("combobox", { name: "Preferred institutions", exact: true }).press("Enter");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await page.getByRole("button", { name: "Save & see my matches" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await dismissStudyPrompt(page);
  await page.goto("/settings/profile");
  await page.getByRole("button", { name: /Your world/ }).click();
  await expect(page.getByRole("list", { name: "Selected citizenship(s)" })).toContainText(
    "Nigeria",
  );
  await expect(
    page.getByRole("combobox", { name: "Country of residence", exact: true }),
  ).toHaveValue("Ghana");
  await page.getByRole("button", { name: /Your education/ }).click();
  await expect(
    page.getByRole("combobox", {
      name: "Original degree classification (if available)",
      exact: true,
    }),
  ).toHaveValue("Second Class Upper Division");
  await expect(
    page
      .getByRole("form", { name: "Study profile", exact: true })
      .getByLabel("Academic result (original value)"),
  ).toHaveValue("4.25");
  await expect(
    page
      .getByRole("form", { name: "Study profile", exact: true })
      .getByLabel("Original result scale", { exact: true }),
  ).toHaveValue("5");
  await page.getByRole("button", { name: /Your next chapter/ }).click();
  await expect(
    page.getByRole("list", { name: "Selected preferred study countries" }),
  ).toContainText("Canada");
  await expect(page.getByRole("list", { name: "Selected preferred institutions" })).toContainText(
    "University of Lagos",
  );
  await page.goto("/settings/notifications");
  const toggle = page.getByRole("switch", { name: "Email", exact: true });
  const before = await toggle.getAttribute("aria-checked");
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-checked", before === "true" ? "false" : "true");
  await page.getByRole("button", { name: "Save my preferences" }).click();
  await expect(page.getByRole("status")).toContainText("Preferences saved");
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-checked", before === "true" ? "false" : "true");
  await toggle.click();
  await page.getByRole("button", { name: "Save my preferences" }).click();
  await page.setViewportSize({ width: 360, height: 850 });
  await page.getByLabel("Appearance").selectOption("dark");
  await page.screenshot({ path: "test-results/settings-notifications-mobile.png", fullPage: true });
  for (const path of [
    "/settings",
    "/settings/profile",
    "/settings/app",
    "/settings/account",
    "/academic-references",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByLabel("Search grading references").fill("Germany");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "University of Passau", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "McGill University", exact: true })).toHaveCount(
    0,
  );
  const context = await browser.newContext();
  const anonymous = await context.newPage();
  await anonymous.goto("http://127.0.0.1:3100/settings/account");
  await expect(anonymous).toHaveURL(/login/);
  await context.close();
});
