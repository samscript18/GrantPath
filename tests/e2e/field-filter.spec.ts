import { test, expect } from "./fixtures";

test("field filter submits and persists the subject, explains fallback and clears cleanly", async ({
  page,
}) => {
  await page.goto("/scholarships");
  await page.getByText("More filters", { exact: true }).click();
  const field = page.getByLabel("Field of study", { exact: true });
  await expect(field).toHaveAccessibleDescription(/organic synthesis for Chemistry/);
  await field.fill("  Humanities  ");
  await page.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect(page).toHaveURL(/field=/);
  await expect(
    page.getByRole("status").filter({ hasText: "Related-subject matching is unavailable" }),
  ).toContainText("Showing text matches for “Humanities” only.");
  const response = await page.request.get(
    "/api/scholarships?field=%20Humanities%20&availability=all",
  );
  expect(response.ok()).toBe(true);
  const result = await response.json();
  expect(result.fieldMatching).toBe("text_only");
  expect(result.filters.field).toBe("Humanities");
  expect(result.total).toBeGreaterThan(0);
  expect(
    result.rows.every((row: { field: string }) => row.field.toLowerCase().includes("humanities")),
  ).toBe(true);
  await page.reload();
  await page.getByText("More filters", { exact: true }).click();
  await expect(field).toHaveValue("Humanities");
  await page.screenshot({ path: "test-results/field-filter-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 360, height: 850 });
  await expect(field).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/field-filter-mobile.png", fullPage: true });
  await page.getByRole("link", { name: "Clear filters", exact: true }).click();
  await expect(page).toHaveURL(/\/scholarships$/);
  await expect(page.getByText(/Showing text matches for/)).toHaveCount(0);
});
