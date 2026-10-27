import { test as base } from "@playwright/test";
export { expect, type Page } from "@playwright/test";
export const test = base.extend<{ isolatedClient: void }>({
  isolatedClient: [
    async ({ page }, use, testInfo) => {
      // Independent journeys represent separate clients. Keep the real server throttle enabled.
      let hash = 0;
      for (const char of testInfo.testId) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
      await page.setExtraHTTPHeaders({ "x-forwarded-for": `198.51.100.${1 + (hash % 250)}` });
      await use();
    },
    { auto: true },
  ],
});

export async function dismissStudyPrompt(page: import("@playwright/test").Page) {
  const later = page.getByRole("button", { name: "Continue study profile later", exact: true });
  try {
    await later.waitFor({ state: "visible", timeout: 1500 });
    await later.click();
  } catch {
    // Completed profiles have no prompt. Do not suppress errors from a visible dialog.
    if (await page.locator("dialog[open]").count())
      throw new Error("Study profile prompt could not be dismissed.");
  }
}
