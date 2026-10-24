import { describe, expect, it } from "vitest";
import { readBody, HttpError } from "../../src/lib/http";
import { ruleSchema } from "../../src/server/eligibility/rules";
describe("bounded mutation inputs", () => {
  it("limits streamed bytes and rejects malformed JSON", async () => {
    await expect(
      readBody(new Request("https://example.test", { method: "POST", body: "x".repeat(100001) })),
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      readBody(new Request("https://example.test", { method: "POST", body: "{broken" })),
    ).rejects.toBeInstanceOf(HttpError);
  });
  it("rejects incompatible field/predicate combinations and unsupported scale thresholds", () => {
    const base = {
      kind: "requirement",
      id: "bad",
      label: "Invalid authoring test",
      verified: true,
      evidenceKey: "test",
    };
    for (const fields of [
      { field: "englishMedium", op: "notIn", values: ["false"] },
      { field: "targetLevel", op: "min", threshold: 1 },
      { field: "gpa", op: "gpa", scale: 4, threshold: 5 },
      { field: "qualification", op: "qualification", values: ["bachelor"], allowFinalYear: true },
    ])
      expect(ruleSchema.safeParse({ ...base, ...fields }).success).toBe(false);
  });
});
