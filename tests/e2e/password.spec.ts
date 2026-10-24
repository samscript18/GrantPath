import { test, expect } from "./fixtures";
import { db } from "../../src/lib/db";

test("password checklist, confirmation, independent visibility controls and recovery", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/register");
  const password = page.getByLabel("Password", { exact: true });
  const confirmation = page.getByLabel("Confirm password", { exact: true });
  const checklist = page.getByRole("list", { name: "Password requirements" });
  await expect(checklist.getByRole("checkbox", { checked: true })).toHaveCount(0);
  await password.fill("abcdefghij");
  await expect(
    checklist.getByRole("checkbox", { name: "10–128 characters", exact: true }),
  ).toBeChecked();
  await expect(
    checklist.getByRole("checkbox", { name: "A lowercase letter", exact: true }),
  ).toBeChecked();
  await expect(
    checklist.getByRole("checkbox", { name: "An uppercase letter", exact: true }),
  ).not.toBeChecked();
  await password.fill("Abcdefghij");
  await expect(
    checklist.getByRole("checkbox", { name: "An uppercase letter", exact: true }),
  ).toBeChecked();
  await password.fill("Abcdefghij1");
  await expect(checklist.getByRole("checkbox", { name: "A number", exact: true })).toBeChecked();
  await password.fill("Abcdefghij1!");
  await expect(checklist.getByRole("checkbox", { name: "A symbol", exact: false })).toBeChecked();
  await confirmation.fill("Different1!");
  await expect(
    checklist.getByRole("checkbox", { name: "Passwords match", exact: true }),
  ).not.toBeChecked();
  await page.getByLabel("Email address").fill("confirmation-fixture@example.test");
  await page.getByRole("button", { name: "Create your account" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Passwords must match");
  await expect(page).toHaveURL(/register/);
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(confirmation).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show confirm password", exact: true }).click();
  await expect(confirmation).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password", exact: true }).click();
  await expect(password).toHaveAttribute("type", "password");
  await confirmation.fill("Abcdefghij1!");
  await expect(checklist.getByRole("checkbox", { checked: true })).toHaveCount(6);
  await password.fill("Abcdefghij!");
  await expect(
    checklist.getByRole("checkbox", { name: "A number", exact: true }),
  ).not.toBeChecked();
  await expect(
    checklist.getByRole("checkbox", { name: "Passwords match", exact: true }),
  ).not.toBeChecked();
  await password.fill("Abcdefghij1!");
  await page.screenshot({
    path: "test-results/dark-password-checklist-mobile.png",
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto("/login");
  await expect(page.getByLabel("Confirm password", { exact: true })).toHaveCount(0);
  await page.getByLabel("Password", { exact: true }).fill("legacy-password");
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill("other@example.test");
  await page.getByRole("button", { name: "Request recovery link" }).click();
  await expect(page.getByRole("status")).toContainText("requested a link");
  const mail = await db().emailSink.findFirstOrThrow({
    where: { recipient: "other@example.test", subject: { contains: "Reset" } },
    orderBy: { createdAt: "desc" },
  });
  await page.goto(mail.body.match(/https?:\/\/\S+/)![0]);
  await page.getByLabel("New password", { exact: true }).fill("Isolated-test-passphrase-42");
  await page.getByLabel("Confirm password", { exact: true }).fill("Different1!");
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Passwords must match");
  await page.getByLabel("Confirm password", { exact: true }).fill("Isolated-test-passphrase-42");
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Password updated" })).toContainText(
    "Password updated",
  );
});
