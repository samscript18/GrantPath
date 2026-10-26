import { test, expect, dismissStudyPrompt } from "./fixtures";
const password = process.env.TEST_ACCOUNT_PASSWORD || "Isolated-test-passphrase-42";
test("real joint programme filters preserve identity across every actual study destination", async ({
  page,
}) => {
  await page.goto("/scholarships/australia-awards-cycle-unconfirmed");
  await expect(
    page.getByText(/Scheme overview\. This is guidance about the programme/),
  ).toBeVisible();
  await page.goto("/scholarships/twente-uts-2027");
  await expect(page.getByText("PROVIDER APPLICATION WINDOW", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Your application progress", exact: true }),
  ).toContainText("Sign in to track your progress");
  await page.screenshot({
    path: "test-results/provider-personal-progress-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 360, height: 850 });
  await page
    .getByRole("region", { name: "Your application progress", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/provider-personal-progress-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  let id = "";
  let href = "";
  const officialUrl = "https://globallocal-erasmusmundus.eu/about-glocal/programme-overview/";
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
    expect(result.rows[0].data.officialUrl).toBe(officialUrl);
    await expect(
      page.getByRole("link", {
        name: "Official scholarship information for GLOCAL — Erasmus Mundus Joint Master scholarship",
        exact: true,
      }),
    ).toHaveAttribute("href", officialUrl);
    const rowLink = await page
      .getByRole("link", {
        name: "GLOCAL — Erasmus Mundus Joint Master scholarship",
        exact: true,
      })
      .getAttribute("href");
    href ||= rowLink!;
    expect(rowLink).toBe(href);
  }
  await page
    .getByRole("link", { name: "GLOCAL — Erasmus Mundus Joint Master scholarship", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Where you could study" })).toBeVisible();
  const officialLinks = page.getByRole("link", { name: /^Official scholarship information for / });
  await expect(officialLinks).toHaveCount(7);
  for (const link of await officialLinks.all())
    await expect(link).toHaveAttribute("href", officialUrl);
  await expect(page.locator('meta[name="scholarship:official-url"]')).toHaveAttribute(
    "content",
    officialUrl,
  );
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
  await page.getByRole("button", { name: "Eligibility and notifications", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Eligibility and notifications", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const scenarioResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/operator/discovery") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Publish valid snapshot", exact: true }).click();
  const selected = await scenarioResponse;
  expect(selected.ok()).toBe(true);
  expect(selected.request().postDataJSON()).toMatchObject({ mode: "valid", scenario: "change" });
  await expect(
    page.getByRole("button", { name: "Eligibility and notifications", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Publish valid snapshot", exact: true }),
  ).toBeEnabled();
  await page.getByRole("group", { name: "Isolated scenario" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/operator-scenario-buttons-desktop.png" });
  await page.setViewportSize({ width: 360, height: 850 });
  await page.getByRole("group", { name: "Isolated scenario" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/operator-scenario-buttons-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Publication and replay", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Publication and replay", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
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
  const unresolved = page.getByRole("article").filter({
    has: page.getByRole("heading", {
      name: "[TEST ONLY] Unresolved source scholarship",
      exact: true,
    }),
  });
  await expect(unresolved.getByRole("definition").nth(0)).toHaveText("None");
  await expect(unresolved.getByRole("definition").nth(1)).toHaveText("0");
  await unresolved.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/exception-outcome-desktop.png" });
  await page.setViewportSize({ width: 360, height: 850 });
  await unresolved.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/exception-outcome-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const published = await (
    await page.request.get("/api/scholarships?q=Controlled%20joint%20scholarship&availability=all")
  ).json();
  const scholarshipId = published.rows[0].id;
  const overview = await (
    await page.request.get(
      `/api/operator/discovery?scholarshipId=${encodeURIComponent(scholarshipId)}`,
    )
  ).json();
  const accepted = overview.decisions.find(
    (decision: { title: string }) => decision.title === "[TEST ONLY] Controlled joint scholarship",
  );
  expect(accepted?.eventIds.length).toBeGreaterThan(0);
  await page.goto(
    `/operator?publication=${encodeURIComponent(scholarshipId)}#automatic-publications`,
  );
  const publications = page.locator("#automatic-publications");
  await expect(publications.getByText(accepted.eventIds[0], { exact: true })).toBeVisible();
  await page.getByText(/^Persisted application events/).click();
  await expect(
    page
      .getByRole("list", { name: "Recent persisted event history" })
      .getByText("Completed", { exact: true })
      .first(),
  ).toBeVisible();
  await publications.getByText(accepted.eventIds[0], { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/global-operator-review-desktop.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 360, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await publications.getByText(accepted.eventIds[0], { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/global-operator-review-mobile.png",
    fullPage: false,
  });
  const history = page.getByRole("list", { name: "Recent persisted event history" });
  await history.locator("li").first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/global-completed-events-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await history.locator("li").first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/global-completed-events-desktop.png" });
});
