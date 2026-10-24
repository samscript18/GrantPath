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
