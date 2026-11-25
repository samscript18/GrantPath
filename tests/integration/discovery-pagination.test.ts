import { expect, it, vi } from "vitest";
vi.mock("../../src/server/monitoring/worker", () => ({ reserveHost: vi.fn(async () => {}) }));
vi.mock("../../src/server/monitoring/network", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/server/monitoring/network")>()),
  boundedFetchUrl: vi.fn(),
}));
import { boundedFetchUrl } from "../../src/server/monitoring/network";
import { checkDirectory } from "../../src/server/discovery/worker";
import { configureDirectory } from "../../src/server/discovery/service";
import { directoryDefinitions } from "../../src/server/discovery/registry";
import { db } from "../../src/lib/db";
it("resumes a bounded directory sweep while checking the landing page for new awards", async () => {
  const id = "test-pagination-" + crypto.randomUUID(),
    base = directoryDefinitions["uq-scholarships"];
  directoryDefinitions[id] = {
    ...base,
    id,
    url: base.url + "?fixture=" + id,
    resumePagination: true,
    bounds: { pages: 2, candidates: 100 },
  };
  const requests: string[] = [];
  vi.mocked(boundedFetchUrl).mockImplementation(async (url, robots) => {
    requests.push(url.href);
    const page = Number(url.searchParams.get("page") || 0),
      text = robots
        ? "User-agent: *\nAllow: /"
        : `<h1>Find a scholarship</h1><a class="card__link" href="https://scholarships.uq.edu.au/scholarship/${id}-${page}">Scholarship</a><a class="uq-pagination__next" href="?page=${page + 1}">Next</a>`;
    return { status: 200, text, bytes: Buffer.from(text) };
  });
  try {
    await configureDirectory(
      { id: "test-operator", name: "Test", email: "operator@example.test", role: "operator" },
      id,
      {
        enabled: true,
        autoPublish: false,
        reason: "[TEST ONLY] Bounded continuation verification.",
      },
    );
    expect((await checkDirectory(id)).state).toBe("success");
    expect(
      (await db().discoveryDirectory.findUniqueOrThrow({ where: { id } })).continuationUrl,
    ).toContain("page=2");
    requests.length = 0;
    await checkDirectory(id);
    const pages = requests.filter((x) => !x.endsWith("robots.txt"));
    expect(pages).toHaveLength(2);
    expect(pages[0]).toContain("fixture=");
    expect(pages[1]).toContain("page=2");
    expect(await db().discoveredCandidate.count({ where: { directoryId: id } })).toBe(3);
  } finally {
    delete directoryDefinitions[id];
    vi.restoreAllMocks();
  }
});

it("progresses beyond a full landing page and rejects an untrusted saved cursor before fetching it", async () => {
  const id = "test-full-landing-" + crypto.randomUUID(),
    base = directoryDefinitions["uq-scholarships"];
  directoryDefinitions[id] = {
    ...base,
    id,
    url: base.url + "?fixture=" + id,
    resumePagination: true,
    bounds: { pages: 2, candidates: 100 },
  };
  const requests: string[] = [];
  vi.mocked(boundedFetchUrl).mockImplementation(async (url, robots) => {
    requests.push(url.href);
    const page = Number(url.searchParams.get("page") || 0);
    const links = Array.from(
      { length: page === 0 ? 100 : 1 },
      (_, i) =>
        `<a class="card__link" href="https://scholarships.uq.edu.au/scholarship/${id}-${page}-${i}">Scholarship</a>`,
    ).join("");
    const text = robots
      ? "User-agent: *\nAllow: /"
      : `<h1>Find a scholarship</h1>${links}<a class="uq-pagination__next" href="?page=${page + 1}">Next</a>`;
    return { status: 200, text, bytes: Buffer.from(text) };
  });
  try {
    await configureDirectory(
      { id: "test-operator", name: "Test", email: "operator@example.test", role: "operator" },
      id,
      { enabled: true, autoPublish: false, reason: "[TEST ONLY] Large landing page continuation." },
    );
    expect((await checkDirectory(id)).discovered).toBe(100);
    expect((await checkDirectory(id)).pages).toBe(2);
    expect(await db().discoveredCandidate.count({ where: { directoryId: id } })).toBe(101);
    await db().discoveryDirectory.update({
      where: { id },
      data: { continuationUrl: "https://evil.test/scholarships" },
    });
    requests.length = 0;
    expect((await checkDirectory(id)).state).toBe("failed");
    expect(requests.every((url) => new URL(url).hostname === "scholarships.uq.edu.au")).toBe(true);
    expect(await db().discoveredCandidate.count({ where: { directoryId: id } })).toBe(101);
  } finally {
    delete directoryDefinitions[id];
    vi.restoreAllMocks();
  }
});
