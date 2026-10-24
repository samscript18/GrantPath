import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { referenceOutcome, type ReferenceTree } from "../fixtures/reference-eligibility";
import { evaluate } from "../../src/server/eligibility/engine";
import { emptyProfile } from "../../src/server/profiles/schema";
import { ruleSchema, type Rule } from "../../src/server/eligibility/rules";
function productionTree(reference: ReferenceTree): Rule {
  let next = 0;
  function convert(r: ReferenceTree): Rule {
    const id = `independent-${next++}`;
    return "value" in r
      ? {
          kind: "requirement",
          id,
          label: "Known or unknown accepted citizenship",
          field: "citizenships",
          op: "in",
          values: [r.value === "false" ? "Ghana" : "Nigeria"],
          verified: r.value !== "unknown",
          evidenceKey: "test",
        }
      : {
          kind: r.operator === "and" ? "all" : "any",
          id,
          label: "A logical group",
          rules: r.children.map(convert),
        };
  }
  return convert(reference);
}
const leaf = fc.constantFrom<ReferenceTree>(
  { value: "true" },
  { value: "false" },
  { value: "unknown" },
);
function tree(depth: number): fc.Arbitrary<ReferenceTree> {
  return depth === 0
    ? leaf
    : fc.oneof(
        leaf,
        fc.record({
          operator: fc.constantFrom("and" as const, "or" as const),
          children: fc.array(tree(depth - 1), { minLength: 1, maxLength: 3 }),
        }),
      );
}
const profile = { ...emptyProfile(), citizenships: ["Nigeria"] };
describe("independent reference comparison", () => {
  it("compares generated mixed nested AND/OR/unknown trees", () => {
    fc.assert(
      fc.property(tree(3), (reference) => {
        expect(evaluate(productionTree(reference), profile).outcome).toBe(
          referenceOutcome(reference),
        );
      }),
      { numRuns: 2000, seed: 20261024 },
    );
  });
  it("exhausts all two-level binary group combinations over three leaf states", () => {
    const leaves: ReferenceTree[] = [{ value: "true" }, { value: "false" }, { value: "unknown" }];
    const small = [...leaves];
    for (const operator of ["and", "or"] as const)
      for (const a of leaves) for (const b of leaves) small.push({ operator, children: [a, b] });
    let checked = 0;
    for (const operator of ["and", "or"] as const)
      for (const a of small)
        for (const b of small) {
          const reference: ReferenceTree = { operator, children: [a, b] };
          expect(evaluate(productionTree(reference), profile).outcome).toBe(
            referenceOutcome(reference),
          );
          checked++;
        }
    expect(checked).toBe(882);
  });
  it("rejects invalid and excessively deep rule input before recursive parsing", () => {
    let input: unknown = productionTree({ value: "unknown" });
    for (let i = 0; i < 1000; i++)
      input = { kind: "all", id: `depth-${i}`, label: "Excessive", rules: [input] };
    expect(() => ruleSchema.safeParse(input)).not.toThrow();
    expect(ruleSchema.safeParse(input).success).toBe(false);
    expect(
      ruleSchema.safeParse({ kind: "all", id: "empty", label: "Empty is uncertain", rules: [] })
        .success,
    ).toBe(false);
  });
});
