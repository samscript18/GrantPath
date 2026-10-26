import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleAuth } from "google-auth-library";
import { createFieldMatcher } from "../../src/server/scholarships/field-matching";
import {
  classifyFields,
  parseFieldMatches,
  vertexFieldConfig,
  vertexFieldEndpoint,
  type FieldCandidate,
} from "../../src/server/scholarships/vertex-fields";

const env = { VERTEX_PROJECT_ID: "verith-ai" };
const candidates: FieldCandidate[] = [
  {
    id: "organic",
    title: "Organic synthesis scholarship",
    fields: "Organic synthesis",
    summary: "Research in synthetic methods.",
  },
  {
    id: "chemistry",
    title: "Chemistry award",
    fields: "Chemistry",
    summary: "Analytical chemistry research.",
  },
  {
    id: "history",
    title: "History award",
    fields: "History",
    summary: "Modern historical research.",
  },
  {
    id: "unknown",
    title: "General award",
    fields: "Various fields",
    summary: "Check the provider for approved subjects.",
  },
];
const response = (ids: string[], finishReason = "STOP") => ({
  candidates: [
    {
      finishReason,
      content: { role: "model", parts: [{ text: JSON.stringify({ matchingIds: ids }) }] },
    },
  ],
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Vertex subject classification", () => {
  it("uses Confiance's global/regional native endpoint and the requested model", () => {
    expect(vertexFieldEndpoint(vertexFieldConfig(env))).toBe(
      "https://aiplatform.googleapis.com/v1/projects/verith-ai/locations/global/publishers/google/models/gemini-3.8-flash:generateContent",
    );
    expect(
      vertexFieldEndpoint(vertexFieldConfig({ ...env, VERTEX_LOCATION: "us-central1" })),
    ).toContain(
      "https://us-central1-aiplatform.googleapis.com/v1/projects/verith-ai/locations/us-central1/",
    );
    for (const bad of [
      { ...env, VERTEX_PROJECT_ID: "../../other" },
      { ...env, VERTEX_LOCATION: "evil.example" },
      { ...env, VERTEX_MODEL: "gemini-test?key=secret" },
    ])
      expect(() => vertexFieldConfig(bad)).toThrow();
  });
  it("sends only supplied public data, schema-constrained JSON and OAuth", async () => {
    vi.spyOn(GoogleAuth.prototype, "getAccessToken").mockResolvedValue("isolated-token");
    const fetchMock = vi.fn().mockResolvedValue(Response.json(response(["organic", "chemistry"])));
    vi.stubGlobal("fetch", fetchMock);
    expect(await classifyFields("Chemistry", candidates, env)).toEqual(["organic", "chemistry"]);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toContain("gemini-3.8-flash:generateContent");
    expect(request.headers.Authorization).toBe("Bearer isolated-token");
    const payload = JSON.parse(request.body);
    expect(JSON.parse(payload.contents[0].parts[0].text)).toEqual({
      query: "Chemistry",
      scholarships: candidates,
    });
    expect(payload.generationConfig.responseMimeType).toBe("application/json");
    expect(payload.generationConfig.responseSchema.required).toEqual(["matchingIds"]);
    expect(payload.systemInstruction.parts[0].text).toContain(
      "Chemistry includes organic synthesis",
    );
    expect(payload.systemInstruction.parts[0].text).toContain("untrusted data");
    expect(request.signal).toBeInstanceOf(AbortSignal);
  });
  it("rejects blocked, truncated, malformed and invented-ID results", () => {
    for (const value of [
      response(["organic"], "MAX_TOKENS"),
      response([], "SAFETY"),
      response(["invented-scholarship"]),
      { candidates: [] },
      {
        candidates: [
          { finishReason: "STOP", content: { role: "model", parts: [{ text: "not JSON" }] } },
        ],
      },
    ])
      expect(() => parseFieldMatches(value, candidates)).toThrow();
    expect(parseFieldMatches(response([]), candidates)).toEqual([]);
  });
  it("ignores thought text and deduplicates returned IDs", () => {
    const value = response(["organic", "organic"]);
    value.candidates[0].content.parts.unshift({ text: "private thought", thought: true } as never);
    expect(parseFieldMatches(value, candidates)).toEqual(["organic"]);
  });
  it("evaluates every batch and discards incomplete multi-batch work", async () => {
    vi.spyOn(GoogleAuth.prototype, "getAccessToken").mockResolvedValue("isolated-token");
    const records = Array.from({ length: 41 }, (_, index) => ({
      ...candidates[0],
      id: String(index),
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(response(["0"])))
      .mockResolvedValueOnce(Response.json(response(["40"])));
    vi.stubGlobal("fetch", fetchMock);
    expect(await classifyFields("Chemistry", records, env)).toEqual(["0", "40"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock
      .mockReset()
      .mockResolvedValueOnce(Response.json(response(["0"])))
      .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }));
    await expect(classifyFields("Chemistry", records, env)).rejects.toThrow("503");
  });
  it("bounds credential discovery with the overall deadline", async () => {
    vi.useFakeTimers();
    vi.spyOn(GoogleAuth.prototype, "getAccessToken").mockReturnValue(new Promise(() => {}));
    const pending = expect(classifyFields("Chemistry", candidates, env)).rejects.toThrow(
      "timed out",
    );
    await vi.advanceTimersByTimeAsync(15_000);
    await pending;
  });
});

describe("subject matching cache and fallback", () => {
  it("keeps semantic IDs, including organic synthesis, and coalesces normalized queries", async () => {
    const classify = vi.fn().mockResolvedValue(["organic", "chemistry"]);
    const match = createFieldMatcher(classify);
    const results = await Promise.all([
      match(" Chemistry ", candidates, env),
      match("chemistry", candidates, env),
    ]);
    expect(results).toEqual(Array(2).fill({ ids: ["organic", "chemistry"], mode: "semantic" }));
    expect(classify).toHaveBeenCalledTimes(1);
    expect(classify.mock.calls[0][0]).toBe("chemistry");
  });
  it("refreshes after accepted content, model configuration and TTL changes", async () => {
    let time = 1;
    const classify = vi.fn().mockResolvedValue(["organic"]);
    const match = createFieldMatcher(classify, () => time);
    await match("Chemistry", candidates, env);
    await match(
      "Chemistry",
      candidates.map((c) => ({ ...c, summary: "Changed accepted summary" })),
      env,
    );
    await match("Chemistry", candidates, { ...env, VERTEX_MODEL: "gemini-other" });
    time += 3_600_001;
    await match("Chemistry", candidates, env);
    expect(classify).toHaveBeenCalledTimes(4);
  });
  it("labels missing configuration and provider failures as text-only with short failure caching", async () => {
    let time = 1;
    const classify = vi.fn().mockRejectedValue(new Error("private-provider-error"));
    const match = createFieldMatcher(classify, () => time);
    expect(await match(" Chemistry ", candidates, {})).toEqual({
      ids: ["chemistry"],
      mode: "text_only",
    });
    expect(classify).not.toHaveBeenCalled();
    expect(await match("Chemistry", candidates, env)).toEqual({
      ids: ["chemistry"],
      mode: "text_only",
    });
    await match("Chemistry", candidates, env);
    expect(classify).toHaveBeenCalledTimes(1);
    time += 30_001;
    await match("Chemistry", candidates, env);
    expect(classify).toHaveBeenCalledTimes(2);
  });
  it("bounds the cache and skips inference for empty candidate sets", async () => {
    const classify = vi.fn().mockResolvedValue([]);
    const match = createFieldMatcher(classify);
    expect(await match("Chemistry", [], env)).toEqual({ ids: [], mode: "semantic" });
    expect(classify).not.toHaveBeenCalled();
    for (let index = 0; index < 101; index++) await match(`Subject ${index}`, candidates, env);
    await match("Subject 0", candidates, env);
    expect(classify).toHaveBeenCalledTimes(102);
  });
});
