import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleAuth } from "google-auth-library";
import { db } from "../../src/lib/db";
import { createOpportunity } from "../../src/server/operator";
import { publishScholarship } from "../../src/server/scholarships/publish";
import { catalogue, scholarshipBySlug } from "../../src/server/scholarships";
import { testScholarship } from "../fixtures/scholarship";
const operator = {
  id: "test-operator",
  name: "Test operator",
  email: "operator@example.test",
  role: "operator",
};
describe("catalogue persistence and roles", () => {
  it("publishes once, searches persistently, isolates cycles and denies student writes", async () => {
    const tag = crypto.randomUUID();
    const d = testScholarship();
    const input = {
      slug: `test-${tag}`,
      cycle: "TEST-2027",
      programmeSlug: `test-programme-${tag}`,
      providerSlug: `test-provider-${tag}`,
      providerName: "[TEST ONLY] Provider",
      providerUrl: "https://www.ucl.ac.uk",
      data: d,
      reason: "Controlled isolated test publication.",
    };
    await expect(createOpportunity({ ...operator, role: "student" }, input)).rejects.toThrow(
      "Operator",
    );
    const record = await createOpportunity(operator, input);
    const replay = await publishScholarship(
      operator,
      record.id,
      d,
      1,
      "Replay of the same accepted facts.",
    );
    expect(replay.changed).toBe(false);
    expect(await db().scholarshipVersion.count({ where: { scholarshipId: record.id } })).toBe(1);
    expect(await db().outbox.count({ where: { key: `scholarship:${record.id}:1` } })).toBe(1);
    const found = await catalogue({ q: "Controlled scholarship", provider: input.providerSlug });
    expect(found.total).toBe(1);
    expect((await scholarshipBySlug(record.slug))?.data.fundingType).toBe("tuition");
    await expect(createOpportunity(operator, input)).rejects.toThrow("already exists");
    const next = await createOpportunity(operator, {
      ...input,
      slug: `${input.slug}-next`,
      cycle: "TEST-2028",
    });
    expect(next.id).not.toBe(record.id);
    expect(
      await db().scholarship.count({ where: { programme: { slug: input.programmeSlug } } }),
    ).toBe(2);
  });
});

it("persists canonical GLOCAL links and treats equivalent URL replays as unchanged", async () => {
  const tag = crypto.randomUUID();
  const officialUrl = "https://globallocal-erasmusmundus.eu/about-glocal/programme-overview/";
  const applicationUrl = "https://globallocal-erasmusmundus.eu/how-to-apply/";
  const data = {
    ...testScholarship(),
    title: `[TEST ONLY] Canonical GLOCAL ${tag}`,
    officialUrl:
      "https://www.globallocal-erasmusmundus.eu/about-glocal/%70rogramme-overview?utm_source=spain#section",
    applicationUrl: applicationUrl + "?utm_source=uk",
    studyLocations: { scope: "multiple" as const, countries: ["GB", "DE"], institutions: [] },
  };
  const record = await createOpportunity(operator, {
    slug: `test-canonical-glocal-${tag}`,
    cycle: `TEST-${tag}`,
    programmeSlug: "erasmus-glocal",
    providerSlug: "canonical-glocal-test",
    providerName: "[TEST ONLY] GLOCAL provider",
    providerUrl: "https://globallocal-erasmusmundus.eu",
    data,
    reason: "Isolated canonical URL publication verification.",
  });
  const accepted = await db().scholarshipVersion.findUniqueOrThrow({
    where: { scholarshipId_number: { scholarshipId: record.id, number: 1 } },
  });
  expect(accepted.data).toMatchObject({ officialUrl, applicationUrl });
  const replay = await publishScholarship(
    operator,
    record.id,
    { ...data, officialUrl, applicationUrl },
    1,
    "Replay equivalent canonical links without changing accepted facts.",
  );
  expect(replay.changed).toBe(false);
  for (const destination of ["GB", "DE"]) {
    const result = await catalogue({ q: tag, destination, availability: "all" });
    expect(result.total).toBe(1);
    expect(result.rows[0].id).toBe(record.id);
    expect(result.rows[0].data.officialUrl).toBe(officialUrl);
  }
  expect(await db().outbox.count({ where: { key: `scholarship:${record.id}:1` } })).toBe(1);
});

describe("related field catalogue filtering", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  it("finds organic synthesis under Chemistry before counting/pagination and preserves other filters", async () => {
    const tag = crypto.randomUUID();
    vi.stubEnv("VERTEX_PROJECT_ID", "verith-ai");
    vi.stubEnv("VERTEX_CREDENTIALS_JSON", "");
    vi.stubEnv("VERTEX_MODEL", "gemini-3.8-flash");
    vi.spyOn(GoogleAuth.prototype, "getAccessToken").mockResolvedValue("isolated-token");
    const fetchMock = vi.fn(async (_url: string, request: RequestInit) => {
      const body = JSON.parse(String(request.body));
      const input = JSON.parse(body.contents[0].parts[0].text);
      // Emulates a validated model decision; this is not live Gemini evidence.
      const ids = input.scholarships
        .filter((c: { fields: string }) => c.fields === "Organic synthesis")
        .map((c: { id: string }) => c.id);
      return Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              role: "model",
              parts: [{ text: JSON.stringify({ matchingIds: ids }) }],
            },
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    for (let index = 0; index < 13; index++) {
      const d = testScholarship();
      d.title = `[TEST ONLY] ${tag} Organic synthesis ${String(index).padStart(2, "0")}`;
      d.fields = index === 10 ? ["History"] : ["Organic synthesis"];
      if (index === 11) d.availability = "closed";
      const record = await createOpportunity(operator, {
        slug: `test-field-${tag}-${index}`,
        cycle: "TEST-2027",
        programmeSlug: `test-field-programme-${tag}-${index}`,
        providerSlug: `test-field-provider-${tag}`,
        providerName: "[TEST ONLY] Field provider",
        providerUrl: "https://www.ucl.ac.uk",
        data: d,
        reason: "Isolated related-subject catalogue verification.",
      });
      if (index === 12)
        await db().scholarship.update({ where: { id: record.id }, data: { published: false } });
    }
    const input = {
      q: tag,
      field: " Chemistry ",
      destination: "GB",
      level: "master",
      funding: "tuition",
    };
    const first = await catalogue(input);
    expect(first.fieldMatching).toBe("semantic");
    expect(first.filters.field).toBe("Chemistry");
    expect(first.total).toBe(10);
    expect(first.rows).toHaveLength(8);
    expect(first.rows.every((row) => row.data.fields.includes("Organic synthesis"))).toBe(true);
    const second = await catalogue({ ...input, page: 2 });
    expect(second.total).toBe(10);
    expect(second.rows).toHaveLength(2);
    expect(new Set([...first.rows, ...second.rows].map((row) => row.id)).size).toBe(10);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = JSON.parse(
      JSON.parse(String(fetchMock.mock.calls[0][1].body)).contents[0].parts[0].text,
    );
    expect(request.scholarships).toHaveLength(11); // ten organic + one unrelated, all published and active
    expect((await catalogue({ ...input, destination: "DE" })).total).toBe(0);
    expect((await catalogue({ ...input, funding: "comprehensive" })).total).toBe(0);
    expect((await catalogue({ ...input, level: "doctorate" })).total).toBe(0);
    expect((await catalogue({ q: tag, field: "   " })).fieldMatching).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockRejectedValue(new Error("Provider unavailable"));
    const fallback = await catalogue({ ...input, field: "organic" });
    expect(fallback.fieldMatching).toBe("text_only");
    expect(fallback.total).toBe(10);
  });
});
