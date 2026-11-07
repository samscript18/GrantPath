import { test, expect } from "./fixtures";
import { db } from "../../src/lib/db";
import { verificationKey } from "../../src/server/accounts/verification-cooldown";
const password = process.env.TEST_ACCOUNT_PASSWORD || "Isolated-test-passphrase-42";
test("verification resend has a durable two-minute lock and a visible countdown", async ({
  page,
}) => {
  const email = `resend-browser-${crypto.randomUUID()}@example.test`;
  try {
    const signup = await page.request.post("/api/auth/sign-up/email", {
      headers: { Origin: "http://127.0.0.1:3100" },
      data: { email, password, name: "[TEST ONLY] Countdown" },
    });
    expect(signup.status()).toBe(200);
    await page.goto("/verify-email?email=" + encodeURIComponent(email));
    const resend = page.getByRole("button", { name: /Resend available in/ });
    await expect(resend).toBeDisabled();
    await expect(resend).toHaveText(/Resend available in [12]:/);
    const before = await resend.innerText();
    await page.clock.install();
    await page.clock.fastForward(4000);
    await expect(resend).not.toHaveText(before);
    await page.reload();
    await expect(resend).toBeDisabled();
    expect(
      (
        await page.request.post("/api/auth/send-verification-email", {
          headers: { Origin: "http://127.0.0.1:3100" },
          data: { email },
        })
      ).status(),
    ).toBe(429);
    await db().verificationCooldown.update({
      where: { key: verificationKey(email) },
      data: { nextAllowedAt: new Date(Date.now() - 1000) },
    });
    await page.reload();
    const available = page.getByRole("button", { name: "Resend verification link", exact: true });
    await expect(available).toBeEnabled();
    await available.click();
    await expect(page.getByRole("status")).toContainText("requested a new link");
    await expect(resend).toBeDisabled();
    await page.setViewportSize({ width: 360, height: 850 });
    await page.screenshot({
      path: "test-results/verification-countdown-mobile.png",
      fullPage: true,
    });
  } finally {
    await db().emailSink.deleteMany({ where: { recipient: email } });
    await db().user.deleteMany({ where: { email } });
    await db().verificationCooldown.deleteMany({ where: { key: verificationKey(email) } });
  }
});
