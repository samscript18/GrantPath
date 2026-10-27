import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/lib/db";
import { persistedFieldClassifier } from "../../src/server/scholarships/field-search-store";
const env = { VERTEX_PROJECT_ID: "verith-ai" };
const candidates = [
  {
    id: "organic",
    title: "Organic synthesis award",
    fields: "Organic synthesis",
    summary: "Synthetic chemistry research.",
  },
];
describe("shared semantic search results and spending reservations", () => {
  beforeEach(async () => {
    await db().fieldSearchCache.deleteMany();
    await db().rateLimit.deleteMany({
      where: { key: { in: ["field-search:hour", "field-search:day"] } },
    });
  });
  it("shares an in-flight request and persists identical results across instances", async () => {
    const classify = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return ["organic"];
    });
    const [a, b] = await Promise.all([
      persistedFieldClassifier("Chemistry", candidates, env, classify),
      persistedFieldClassifier("Chemistry", candidates, env, classify),
    ]);
    expect(a).toEqual(["organic"]);
    expect(b).toEqual(a);
    const otherInstance = vi.fn().mockResolvedValue([]);
    expect(await persistedFieldClassifier("Chemistry", candidates, env, otherInstance)).toEqual(a);
    expect(classify).toHaveBeenCalledTimes(1);
    expect(otherInstance).not.toHaveBeenCalled();
    expect(
      (await db().rateLimit.findUniqueOrThrow({ where: { key: "field-search:hour" } })).count,
    ).toBe(1);
    await persistedFieldClassifier(
      "Chemistry",
      [{ ...candidates[0], summary: "Changed accepted subject evidence" }],
      env,
      classify,
    );
    expect(classify).toHaveBeenCalledTimes(2);
  });
  it("commits bounded hourly/daily reservations before inference and retains failures", async () => {
    const classify = vi.fn(async () => {
      expect(
        (await db().rateLimit.findUniqueOrThrow({ where: { key: "field-search:hour" } })).count,
      ).toBeGreaterThan(0);
      return ["organic"];
    });
    for (let i = 0; i < 12; i++)
      await persistedFieldClassifier("Chemistry " + i, candidates, env, classify);
    await expect(
      persistedFieldClassifier("Next subject", candidates, env, classify),
    ).rejects.toThrow("unavailable");
    expect(classify).toHaveBeenCalledTimes(12);
    await db().rateLimit.update({ where: { key: "field-search:hour" }, data: { lastRequest: 0n } });
    await db().rateLimit.update({ where: { key: "field-search:day" }, data: { count: 60 } });
    await expect(
      persistedFieldClassifier("Daily exhausted", candidates, env, classify),
    ).rejects.toThrow("unavailable");
    expect(classify).toHaveBeenCalledTimes(12);
  });
  it("does not repeat billed failures and charges batch reservations conservatively", async () => {
    const fail = vi.fn().mockRejectedValue(new Error("Provider error"));
    await expect(persistedFieldClassifier("Chemistry", candidates, env, fail)).rejects.toThrow();
    await expect(persistedFieldClassifier("Chemistry", candidates, env, fail)).rejects.toThrow();
    expect(fail).toHaveBeenCalledTimes(1);
    expect(
      (await db().rateLimit.findUniqueOrThrow({ where: { key: "field-search:hour" } })).count,
    ).toBe(1);
    const many = Array.from({ length: 41 }, (_, i) => ({ ...candidates[0], id: String(i) }));
    await expect(persistedFieldClassifier("Chemistry", many, env, fail)).rejects.toThrow();
    expect(
      (await db().rateLimit.findUniqueOrThrow({ where: { key: "field-search:hour" } })).count,
    ).toBe(3);
  });
});
