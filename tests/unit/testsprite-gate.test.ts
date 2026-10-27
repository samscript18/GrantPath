import { it, expect } from "vitest";
import { assessNativeReport } from "../../src/server/operator/testsprite-gate";
it("requires the complete nineteen-case App suite after the owner retired one case", () => {
  expect(
    assessNativeReport({ state: "success", description: "All 19 tests passed" }, 19).state,
  ).toBe("passed");
  expect(assessNativeReport({ state: "success", description: "19/19 passed" }, 19).state).toBe(
    "passed",
  );
  for (const description of [
    "7/7 passed",
    "10/10 passed",
    "18/19 passed",
    "20/20 passed",
    "19/19 passed · 1 blocked",
  ])
    expect(assessNativeReport({ state: "success", description }, 19).state).toBe("failed");
});
it("rejects a green native status with actual failed or blocked cases", () => {
  expect(
    assessNativeReport({ state: "success", description: "1/7 passed · 4 failed · 2 blocked" }, 7)
      .state,
  ).toBe("failed");
});
it("requires the entire reviewed suite rather than an earlier or partial case count", () => {
  expect(assessNativeReport({ state: "success", description: "2/2 passed" }, 7).state).toBe(
    "failed",
  );
  expect(
    assessNativeReport({ state: "success", description: "7/7 passed · 1 blocked" }, 7).state,
  ).toBe("failed");
  expect(assessNativeReport({ state: "success", description: null }, 7).state).toBe("failed");
});
it("accepts all reviewed cases passed while preserving pending and failed outcomes", () => {
  expect(assessNativeReport({ state: "success", description: "7/7 passed" }, 7).state).toBe(
    "passed",
  );
  expect(assessNativeReport({ state: "pending", description: "7 tests queued" }, 7).state).toBe(
    "pending",
  );
  expect(assessNativeReport({ state: "failure", description: "7/7 passed" }, 7).state).toBe(
    "failed",
  );
});
it("accepts the observed App all-tests format only for the exact reviewed count", () => {
  expect(assessNativeReport({ state: "success", description: "All 7 tests passed" }, 7).state).toBe(
    "passed",
  );
  for (const description of [
    "All 2 tests passed",
    "All tests passed",
    "All 7 tests passed · 1 blocked",
    "All 7 tests passed · 1 failed",
    "All 7 tests passed · 1 skipped",
    "All 7 tests passed · error",
  ])
    expect(assessNativeReport({ state: "success", description }, 7).state).toBe("failed");
  expect(assessNativeReport({ state: "failure", description: "All 7 tests passed" }, 7).state).toBe(
    "failed",
  );
  expect(assessNativeReport({ state: "success", description: "All 0 tests passed" }, 0).state).toBe(
    "failed",
  );
});
