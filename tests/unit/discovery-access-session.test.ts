import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../../src/server/monitoring/worker", () => ({ reserveHost: vi.fn(async () => {}) }));
vi.mock("../../src/server/monitoring/network", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/server/monitoring/network")>()),
  boundedFetchUrl: vi.fn(),
}));
import { boundedFetchUrl } from "../../src/server/monitoring/network";
import { reserveHost } from "../../src/server/monitoring/worker";
import { fetchDiscoveryPage, type DiscoveryAccessSession } from "../../src/server/discovery/worker";
import { directoryDefinitions } from "../../src/server/discovery/registry";
beforeEach(() => vi.clearAllMocks());
const page = (text: string) => ({ text, status: 200, bytes: new Uint8Array(Buffer.from(text)) });
it("reuses a short-lived robots observation while retaining per-page host reservations and per-path rules", async () => {
  const mocked = vi.mocked(boundedFetchUrl),
    d = directoryDefinitions["uq-scholarships"],
    session: DiscoveryAccessSession = new Map();
  mocked
    .mockResolvedValueOnce(page("User-agent: *\nDisallow: /scholarship/private\nCrawl-delay: 22"))
    .mockResolvedValueOnce(page("<h1>Directory</h1>"))
    .mockResolvedValueOnce(page("<h1>Award</h1>"));
  await fetchDiscoveryPage(d.url, d, "directory", session);
  await fetchDiscoveryPage(
    "https://scholarships.uq.edu.au/scholarship/public",
    d,
    "detail",
    session,
  );
  expect(mocked).toHaveBeenCalledTimes(3);
  expect(reserveHost).toHaveBeenCalledTimes(3);
  expect(reserveHost).toHaveBeenLastCalledWith("scholarships.uq.edu.au", 22);
  await expect(
    fetchDiscoveryPage("https://scholarships.uq.edu.au/scholarship/private", d, "detail", session),
  ).rejects.toThrow("ROBOTS_DISALLOWED");
  expect(mocked).toHaveBeenCalledTimes(3);
});
it("refreshes expired robots evidence and never fetches after an access error", async () => {
  const mocked = vi.mocked(boundedFetchUrl),
    d = directoryDefinitions["uq-scholarships"],
    session: DiscoveryAccessSession = new Map([
      [
        "https://scholarships.uq.edu.au",
        { retrievedAt: Date.now() - 300001, status: 200, text: "User-agent: *\nAllow: /" },
      ],
    ]);
  mocked.mockResolvedValueOnce({ ...page("Forbidden"), status: 403 });
  await expect(fetchDiscoveryPage(d.url, d, "directory", session)).rejects.toThrow(
    "ROBOTS_UNAVAILABLE",
  );
  expect(mocked).toHaveBeenCalledTimes(1);
});
