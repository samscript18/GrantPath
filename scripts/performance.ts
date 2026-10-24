import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.argv[2] || "http://127.0.0.1:3200";
const url = new URL(base);
if (url.hostname !== "127.0.0.1" || url.protocol !== "http:")
  throw new Error("Use a local production server on 127.0.0.1.");
const browser = await chromium.launch();
try {
  const results = [];
  for (const path of ["/", "/scholarships", "/scholarships/twente-uts-2027"]) {
    const context = await browser.newContext({
      viewport: { width: 360, height: 800 },
      isMobile: true,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await session.send("Network.enable");
    await session.send("Network.setCacheDisabled", { cacheDisabled: true });
    await session.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: 1_600_000 / 8,
      uploadThroughput: 750_000 / 8,
      connectionType: "cellular3g",
    });
    await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.addInitScript(() => {
      new PerformanceObserver((list) => {
        (window as Window & { latestLcp?: number }).latestLcp = list.getEntries().at(-1)?.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    const response = await page.goto(`${base}${path}`, { waitUntil: "load" });
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.waitForTimeout(1000); // Allow the buffered paint observer to settle for this sample.
    results.push({
      path,
      status: response?.status(),
      ...(await page.evaluate(() => {
        const navigation = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming;
        return {
          domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
          loadMs: Math.round(navigation.loadEventEnd),
          lcpMs: Math.round((window as Window & { latestLcp?: number }).latestLcp || 0),
          transferredBytes: navigation.transferSize,
        };
      })),
    });
    await context.close();
  }
  const evidence = {
    observedAt: new Date().toISOString(),
    environment:
      "Local production build; one cold browser-cache sample per public route. 360×800; 150ms latency; 1.6Mbps down/750kbps up; 4× CPU throttle. Loopback PostgreSQL, no hosting/CDN latency. Not field-performance evidence.",
    results,
  };
  await mkdir("test-results", { recursive: true });
  await writeFile("test-results/performance.json", JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
