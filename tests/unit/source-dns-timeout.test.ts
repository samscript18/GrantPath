import { afterEach, expect, it, vi } from "vitest";
vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
import { lookup } from "node:dns/promises";
import { boundedFetchUrl } from "../../src/server/monitoring/network";
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("bounds DNS resolution before HTTP without issuing a fetch on timeout", async () => {
  vi.useFakeTimers();
  vi.mocked(lookup).mockImplementation(() => new Promise(() => {}));
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const result = boundedFetchUrl(new URL("https://scholarships.uq.edu.au/scholarships"));
  const rejection = expect(result).rejects.toThrow("SOURCE_DNS_TIMEOUT");
  await vi.advanceTimersByTimeAsync(5000);
  await rejection;
  expect(fetch).not.toHaveBeenCalled();
});
it("still rejects a mixed public and private DNS answer before any HTTP request", async () => {
  vi.mocked(lookup).mockResolvedValue([
    { address: "93.184.216.34", family: 4 },
    { address: "127.0.0.1", family: 4 },
  ] as never);
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(
    boundedFetchUrl(new URL("https://scholarships.uq.edu.au/scholarships")),
  ).rejects.toThrow("exclusively to public addresses");
  expect(fetch).not.toHaveBeenCalled();
});
