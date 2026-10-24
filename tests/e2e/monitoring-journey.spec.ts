import { test, expect, type Page } from "./fixtures";
import { db } from "../../src/lib/db";
import { createOpportunity } from "../../src/server/operator";
import { saveProfile } from "../../src/server/profiles";
import { saveOpportunity } from "../../src/server/applications";
import { processSourceHtml, decideReview, recordSourceFailure } from "../../src/server/monitoring";
import { evaluateStudent } from "../../src/server/eligibility";
import { ENGINE_VERSION } from "../../src/server/eligibility/engine";
import { handleDomainEvent } from "../../src/server/jobs/outbox";
import { handleNotificationEvent } from "../../src/server/notifications/events";
import { claimDelivery, deliverClaimed } from "../../src/server/notifications/delivery";
import { savePreferences } from "../../src/server/notifications";
import { testScholarship } from "../fixtures/scholarship";
import { uclSnapshot } from "../fixtures/source";
const password = process.env.TEST_ACCOUNT_PASSWORD || "Isolated-test-passphrase-42";
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Welcome back" }).click();
  await expect(page).toHaveURL(/dashboard/);
}
async function processKey(key: string) {
  const event = await db().outbox.update({
    where: { key },
    data: {
      state: "processing",
      leaseToken: crypto.randomUUID(),
      lockedUntil: new Date(Date.now() + 120000),
      attempts: { increment: 1 },
    },
  });
  await handleDomainEvent(event);
}
async function dispatchChange(
  scholarshipId: string,
  version: number,
  userId: string,
  profileVersion: number,
) {
  await processKey(`scholarship:${scholarshipId}:${version}`);
  await processKey(
    `evaluate:${userId}:p${profileVersion}:${scholarshipId}:v${version}:e${ENGINE_VERSION}`,
  );
  const event = await db().outbox.findUniqueOrThrow({
    where: { key: `change:${scholarshipId}:v${version}:${userId}` },
  });
  await handleNotificationEvent(event);
  await handleNotificationEvent(event);
  const deliveries = await db().delivery.findMany({ where: { userId, eventId: event.key } });
  for (const delivery of deliveries) {
    const claim = await claimDelivery(delivery.id);
    expect(claim).not.toBeNull();
    await deliverClaimed(claim!);
  }
  return event;
}
test("operator-reviewed change recalculates one alert, preserves history and suppresses a queued reversal", async ({
  page,
}) => {
  const student = await db().user.findUniqueOrThrow({ where: { email: "student@example.test" } });
  const operator = await db().user.findUniqueOrThrow({ where: { email: "operator@example.test" } });
  const previousProfile = await db().profile.findUnique({ where: { userId: student.id } });
  const profile = await saveProfile(
    student,
    {
      targetLevel: "master",
      citizenships: ["Nigeria"],
      completedQualifications: ["bachelor"],
      qualificationHistoryComplete: true,
    },
    previousProfile?.version || 0,
    3,
  );
  await savePreferences(student, {
    newMatch: true,
    change: true,
    deadline: true,
    inApp: true,
    email: false,
  });
  const tag = crypto.randomUUID();
  const data = testScholarship();
  data.title = `[TEST ONLY] Change journey ${tag.slice(0, 6)}`;
  const scholarship = await createOpportunity(operator, {
    slug: `browser-change-${tag}`,
    cycle: "ISOLATED TEST CYCLE",
    programmeSlug: `browser-prog-${tag}`,
    providerSlug: `browser-provider-${tag}`,
    providerName: "[TEST ONLY] Controlled provider",
    providerUrl: "https://www.ucl.ac.uk",
    data,
    reason: "Isolated browser source-change fixture; never public production data.",
  });
  await saveOpportunity(student, scholarship.id);
  const source = await db().source.create({
    data: {
      scholarshipId: scholarship.id,
      url: `https://www.ucl.ac.uk/scholarships/ucl-global-masters-scholarship?browser-fixture=${tag}`,
      adapter: "ucl-scholarship",
      enabled: false,
    },
  });
  const baseline = await processSourceHtml(source.id, uclSnapshot(), { controlled: true });
  if (baseline.state !== "review") throw new Error("Baseline review not created");
  const fields = [
    "levels",
    "deadline",
    "source.levels",
    "source.funding",
    "source.requirements",
    "source.deadline",
    "source.status",
  ];
  await decideReview(operator, baseline.reviewId, {
    decision: "accept",
    sameCycleConfirmed: true,
    reason: "Checked isolated baseline wording against the controlled source fixture.",
    confirmedFields: fields,
  });
  await evaluateStudent(student.id, scholarship.id);
  const changed = await processSourceHtml(source.id, uclSnapshot("All Undergraduate degrees"), {
    controlled: true,
  });
  expect(changed.state).toBe("review");
  await login(page, "operator@example.test");
  await page.goto("/operator#reviews");
  const article = page
    .locator("#reviews article")
    .filter({ has: page.getByRole("heading", { name: data.title, exact: true }) });
  await expect(article).toBeVisible();
  await article.getByRole("checkbox", { name: /^levels:/ }).check();
  await article
    .getByRole("checkbox", { name: /^I checked that this update belongs to cycle/ })
    .check();
  await article
    .getByLabel("Decision reason", { exact: true })
    .fill("Checked the changed study level against the isolated official-format snapshot.");
  await page.screenshot({ path: "test-results/operator-review-desktop.png", fullPage: true });
  const acceptedResponse = page.waitForResponse(
    (r) => r.url().endsWith("/api/operator/monitoring") && r.request().method() === "POST",
  );
  await article.getByRole("button", { name: "Accept reviewed version" }).click();
  const accepted = await acceptedResponse;
  expect(accepted.ok()).toBe(true);
  const acceptedData = await accepted.json();
  expect(acceptedData.changed).toBe(true);
  const version = acceptedData.version as number;
  const event = await dispatchChange(scholarship.id, version, student.id, profile.version);
  const evaluation = await db().evaluation.findFirstOrThrow({
    where: {
      userId: student.id,
      scholarshipId: scholarship.id,
      scholarshipVersion: version,
      profileVersion: profile.version,
    },
  });
  expect(evaluation.outcome).toBe("not_eligible");
  expect(await db().notification.count({ where: { userId: student.id, eventId: event.key } })).toBe(
    1,
  );
  expect(
    (await db().delivery.findMany({ where: { userId: student.id, eventId: event.key } }))
      .map((d) => d.state)
      .sort(),
  ).toEqual(["published", "suppressed"]);
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "student@example.test");
  await page.goto("/notifications");
  const alert = page.locator("article").filter({
    has: page.getByRole("heading", { name: `An accepted update: ${data.title}`, exact: true }),
  });
  await expect(alert).toContainText("Not eligible based on known requirements");
  await alert.getByRole("link", { name: "Inspect the evidence" }).click();
  await expect(page).toHaveURL(new RegExp(`version=${version}`));
  await expect(page.getByText("VALUE_NOT_ACCEPTED", { exact: false })).toBeVisible();
  await expect(page.locator("#evidence-levels")).toContainText("All Undergraduate degrees");
  await page.goto("/notifications");
  await page.getByRole("checkbox", { name: /^Accepted scholarship changes/ }).uncheck();
  await page.getByRole("button", { name: "Save my preferences" }).click();
  await expect(page.getByText("Preferences saved.", { exact: false })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: /^Accepted scholarship changes/ }),
  ).not.toBeChecked();
  // A real accepted reversal is a new event; current disabled preferences suppress its queued messages.
  const reversal = await processSourceHtml(source.id, uclSnapshot(), { controlled: true });
  if (reversal.state !== "review") throw new Error("Reversal review missing");
  const published = await decideReview(operator, reversal.reviewId, {
    decision: "accept",
    sameCycleConfirmed: true,
    reason: "Checked isolated reversal against the controlled source snapshot.",
    confirmedFields: fields,
  });
  const latest = await db().scholarship.findUniqueOrThrow({ where: { id: scholarship.id } });
  expect(published.changed).toBe(true);
  expect(latest.version).toBe(version + 1);
  const reversedEvent = await dispatchChange(
    scholarship.id,
    latest.version,
    student.id,
    profile.version,
  );
  expect(
    await db().notification.count({ where: { userId: student.id, eventId: reversedEvent.key } }),
  ).toBe(0);
  expect(
    (
      await db().evaluation.findFirstOrThrow({
        where: {
          userId: student.id,
          scholarshipId: scholarship.id,
          scholarshipVersion: latest.version,
          profileVersion: profile.version,
        },
      })
    ).outcome,
  ).toBe("eligible");
  const replay = await processSourceHtml(
    source.id,
    uclSnapshot("All postgraduate taught", "different navigation"),
    { controlled: true },
  );
  expect(replay.state).toBe("unchanged");
  const lastCheck = await db().source.findUniqueOrThrow({ where: { id: source.id } });
  await recordSourceFailure(source.id, "Controlled browser source outage", 503);
  const failed = await db().source.findUniqueOrThrow({ where: { id: source.id } });
  expect(failed.lastSuccessAt).toEqual(lastCheck.lastSuccessAt);
  expect(
    (await db().scholarship.findUniqueOrThrow({ where: { id: scholarship.id } })).version,
  ).toBe(latest.version);
  await page.goto(
    `/scholarships/${scholarship.slug}?version=${version}&evaluation=${evaluation.id}#requirements`,
  );
  await expect(
    page.getByText(`You’re inspecting accepted version ${version}`, { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("Historical · updating needed")).toBeVisible();
  await expect(page.locator("#evidence-levels")).toContainText("All Undergraduate degrees");
  await page.goto("/notifications");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: "test-results/notifications-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "test-results/notifications-mobile.png", fullPage: true });
  await db().scholarship.update({ where: { id: scholarship.id }, data: { published: false } });
});
