import { test, expect, dismissStudyPrompt } from "./fixtures";
const password = process.env.TEST_ACCOUNT_PASSWORD || "Isolated-test-passphrase-42";
test("real joint programme filters preserve identity across every actual study destination", async ({
  page,
}) => {
  let id = "";
  for (const destination of ["GB", "DE", "ES", "SE", "CO", "JP", "NL"]) {
    await page.goto(`/scholarships?q=GLOCAL&destination=${destination}&availability=all`);
    await expect(
      page.getByRole("heading", {
        name: "GLOCAL — Erasmus Mundus Joint Master scholarship",
        exact: true,
      }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Destination", { exact: true })).toHaveValue(destination);
    const response = await page.request.get(
      `/api/scholarships?q=GLOCAL&destination=${destination}&availability=all`,
    );
    expect(response.ok()).toBe(true);
    const result = await response.json();
    expect(result.total).toBe(1);
    id ||= result.rows[0].id;
    expect(result.rows[0].id).toBe(id);
  }
  await page
    .getByRole("link", { name: "GLOCAL — Erasmus Mundus Joint Master scholarship", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Where you could study" })).toBeVisible();
  await page.screenshot({ path: "test-results/global-joint-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 360, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/global-joint-mobile.png", fullPage: true });
});
test("authenticated operator publishes and replays a valid source while uncertain new evidence stays in review", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("operator@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Welcome back" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await dismissStudyPrompt(page);
  await page.goto("/operator");
  await page.getByText("Isolated source verification", { exact: true }).click();
  await page.getByRole("button", { name: "Publish valid snapshot", exact: true }).click();
  const status = page.getByRole("status").filter({ hasText: /auto_publish|unchanged/ });
  await expect(status).toBeVisible();
  await page.getByRole("button", { name: "Publish valid snapshot", exact: true }).click();
  await expect(status).toContainText("unchanged");
  await page.getByRole("button", { name: "Inspect ambiguous snapshot", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "review_required" })).toContainText(
    "LEVEL_SEMANTICS_UNSUPPORTED",
  );
  const response = await page.request.get(
    "/api/scholarships?q=Unresolved%20source%20scholarship&availability=all",
  );
  expect((await response.json()).total).toBe(0);
  await expect(
    page.getByRole("heading", { name: "[TEST ONLY] Unresolved source scholarship", exact: true }),
  ).toBeVisible();
  const overview = await (await page.request.get("/api/operator/discovery")).json();
  const accepted = overview.decisions.find(
    (decision: { title: string }) => decision.title === "[TEST ONLY] Controlled joint scholarship",
  );
  expect(accepted?.eventIds.length).toBeGreaterThan(0);
  await page.getByText(/^Recent automatic publications/).click();
  await expect(page.getByText(accepted.eventIds[0], { exact: true })).toBeVisible();
  await page.getByText(accepted.eventIds[0], { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/global-operator-review-desktop.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 360, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByText(accepted.eventIds[0], { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/global-operator-review-mobile.png",
    fullPage: false,
  });
});
