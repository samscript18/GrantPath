import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { evaluate } from "../../src/server/eligibility/engine";
import { rank } from "../../src/server/eligibility/ranking";
import { emptyProfile, profileSchema } from "../../src/server/profiles/schema";
import type { Requirement, Rule } from "../../src/server/eligibility/rules";
import { testScholarship } from "../fixtures/scholarship";
const rule = (extra: Partial<Requirement> = {}): Requirement => ({
  kind: "requirement",
  id: "r",
  label: "A tested requirement",
  field: "citizenships",
  op: "in",
  values: ["Nigeria"],
  evidenceKey: "citizenship",
  verified: true,
  ...extra,
});
const p = (extra: object) => profileSchema.parse(extra);
const state = (r: Rule, extra: object = {}) =>
  evaluate(r, p(extra), new Date("2026-10-24T12:00:00Z")).state;
describe("requirement × profile × outcome matrix", () => {
  it.each([
    ["missing citizenship", {}, "unknown"],
    ["accepted citizenship", { citizenships: ["Nigeria"] }, "pass"],
    ["different citizenship", { citizenships: ["Ghana"] }, "fail"],
    ["multiple citizenships", { citizenships: ["Ghana", "Nigeria"] }, "pass"],
    ["residence is not citizenship", { residence: "Nigeria" }, "unknown"],
  ])("%s", (_name, profile, expected) => expect(state(rule(), profile)).toBe(expected));
  it("keeps unverified failures unknown", () =>
    expect(state(rule({ verified: false }), { citizenships: ["Ghana"] })).toBe("unknown"));
  it("preserves unknown OR alternatives and valid exemptions", () => {
    const language = rule({
      id: "test",
      field: "language",
      op: "language",
      values: ["IELTS"],
      threshold: 7,
    });
    const exemption = rule({ id: "exempt", field: "englishMedium", op: "confirmed" });
    const any: Rule = {
      kind: "any",
      id: "any",
      label: "Test or exemption",
      rules: [language, exemption],
    };
    expect(state(any, { language: { type: "IELTS", score: 5, takenAt: "2026-01-01" } })).toBe(
      "unknown",
    );
    expect(state(any, { englishMedium: true })).toBe("pass");
    expect(
      state(any, {
        englishMedium: false,
        language: { type: "IELTS", score: 5, takenAt: "2026-01-01" },
      }),
    ).toBe("fail");
  });
  it("accepts final-year completion on the provider boundary and rejects late completion", () => {
    const r = rule({
      field: "qualification",
      op: "qualification",
      values: ["bachelor"],
      allowFinalYear: true,
      completionBy: "2027-09-01",
    });
    expect(
      state(r, {
        qualification: "bachelor",
        completion: "final_year",
        graduationDate: "2027-09-01",
        targetLevel: "master",
      }),
    ).toBe("pass");
    expect(
      state(r, {
        qualification: "bachelor",
        completion: "final_year",
        graduationDate: "2027-09-02",
        qualificationHistoryComplete: true,
      }),
    ).toBe("fail");
    expect(state(r, { qualification: "bachelor", completion: "final_year" })).toBe("unknown");
    expect(
      state(r, {
        qualification: "master",
        completion: "in_progress",
        completedQualifications: ["bachelor"],
      }),
    ).toBe("pass");
  });
  it("never invents a GPA conversion and uses explicit provider equivalences only", () => {
    const r = rule({ field: "gpa", op: "gpa", threshold: 3.5, scale: 4 });
    expect(state(r, { gpa: { value: 4.5, scale: 5 } })).toBe("unknown");
    expect(
      state({ ...r, equivalents: [{ scale: 5, minimum: 4.2 }] }, { gpa: { value: 4.5, scale: 5 } }),
    ).toBe("pass");
    expect(state(r, { gpa: { value: 3.49, scale: 4 } })).toBe("fail");
  });
  it("compares work experience in declared units, preserving zero", () => {
    const r = rule({ field: "experienceHours", op: "min", threshold: 2800 });
    expect(state(r, { experienceMonths: 24 })).toBe("unknown");
    expect(state(r, { experienceHours: 0 })).toBe("fail");
    expect(state(r, { experienceHours: 2800 })).toBe("pass");
  });
  it("checks language validity and age at provider reference dates", () => {
    const language = rule({
      field: "language",
      op: "language",
      values: ["IELTS"],
      threshold: 6.5,
      maxAgeMonths: 24,
      referenceDate: "2027-09-01",
    });
    expect(state(language, { language: { type: "IELTS", score: 7, takenAt: "2025-09-01" } })).toBe(
      "pass",
    );
    expect(state(language, { language: { type: "IELTS", score: 7, takenAt: "2025-08-31" } })).toBe(
      "fail",
    );
    const age = rule({ field: "birthDate", op: "max", threshold: 30, referenceDate: "2027-09-01" });
    expect(state(age, { birthDate: "1996-09-02" })).toBe("pass");
    expect(state(age, { birthDate: "1996-09-01" })).toBe("fail");
  });
  it("ranking cannot override a mandatory failure", () => {
    const d = testScholarship();
    const result = rank(
      p({ destinations: [d.destination], targetField: d.fields[0], fundingNeed: "tuition" }),
      d,
      "not_eligible",
    );
    expect(result.excluded).toBe(true);
    expect(result.score).toBe(0);
  });
  it("a failing AND clause dominates any missing information", () =>
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }), (flags) => {
        const rules = flags.map((verified, i) => rule({ id: `r${i}`, verified }));
        rules.push(rule({ id: "failed", values: ["Ghana"] }));
        expect(
          state({ kind: "all", id: "all", label: "All", rules }, { citizenships: ["Nigeria"] }),
        ).toBe("fail");
      }),
    ));
  it("an OR pass dominates unknown alternatives", () =>
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (count) => {
        const rules = Array.from({ length: count }, (_, i) =>
          rule({ id: `r${i}`, verified: false }),
        );
        rules.push(rule({ id: "pass" }));
        expect(
          state({ kind: "any", id: "any", label: "Any", rules }, { citizenships: ["Nigeria"] }),
        ).toBe("pass");
      }),
    ));
  it("has deterministic versioned results under a fixed clock", () => {
    const now = new Date("2026-10-24T12:00:00Z");
    expect(evaluate(rule(), emptyProfile(), now)).toEqual(evaluate(rule(), emptyProfile(), now));
  });
});

describe("exact explanations and original values", () => {
  it("keeps an inverted original grading system uncertain instead of comparing as a standard GPA", () => {
    const result = evaluate(
      rule({ field: "gpa", op: "gpa", scale: 5, threshold: 3.5 }),
      p({ gpa: { value: 1.3, scale: 5, direction: "lower" } }),
      new Date("2026-10-24T12:00:00Z"),
    );
    expect(result.state).toBe("unknown");
    expect(result.tree.code).toBe("GPA_DIRECTION_UNSUPPORTED");
  });
  it.each([
    [rule(), {}, "unknown", "PROFILE_MISSING"],
    [rule(), { citizenships: ["Ghana"] }, "fail", "VALUE_NOT_ACCEPTED"],
    [rule({ verified: false }), { citizenships: ["Ghana"] }, "unknown", "SOURCE_UNVERIFIED"],
    [
      rule({ field: "gpa", op: "gpa", scale: 4, threshold: 3.5 }),
      { gpa: { value: 4.5, scale: 5 } },
      "unknown",
      "GPA_SCALE_UNSUPPORTED",
    ],
    [
      rule({ field: "experienceHours", op: "min", threshold: 2800 }),
      { experienceMonths: 24 },
      "unknown",
      "PROFILE_MISSING",
    ],
    [
      rule({
        field: "qualification",
        op: "qualification",
        values: ["bachelor"],
        allowFinalYear: true,
        completionBy: "2027-09-01",
      }),
      { qualification: "bachelor", completion: "final_year", graduationDate: "2027-09-01" },
      "pass",
      "FINAL_YEAR_COMPLETION_BY_DATE",
    ],
  ])("returns exact state and reason %#", (requirement, profile, expected, code) => {
    const result = evaluate(requirement as Requirement, p(profile));
    expect(result.state).toBe(expected);
    expect(result.tree.code).toBe(code);
    expect(result.tree.evidenceKey).toBe(requirement.evidenceKey);
  });
  it("treats source-backed country identities consistently and rejects ambiguous nationality descriptions", () => {
    expect(
      state(rule({ field: "residence", values: ["United Kingdom"] }), { residence: "UK" }),
    ).toBe("pass");
    expect(profileSchema.safeParse({ citizenships: ["Nigerian"] }).success).toBe(false);
  });
});

describe("completed qualification evidence and negative knowledge", () => {
  const excluded = rule({ field: "qualification", op: "notIn", values: ["master", "doctorate"] });
  it("uses all recorded completed qualifications when checking an exclusion", () => {
    expect(
      state(excluded, {
        qualification: "bachelor",
        completion: "completed",
        completedQualifications: ["master"],
      }),
    ).toBe("fail");
    expect(state(excluded, { completedQualifications: ["master"] })).toBe("fail");
  });
  it("requires an explicitly complete history before passing the absence of an excluded degree", () => {
    expect(state(excluded, { qualification: "bachelor", completion: "final_year" })).toBe(
      "unknown",
    );
    expect(
      state(excluded, {
        qualification: "bachelor",
        completion: "final_year",
        qualificationHistoryComplete: true,
        completedQualifications: ["secondary"],
      }),
    ).toBe("pass");
  });
  it("does not treat a late current degree as proof that no valid earlier prerequisite is held", () => {
    const r = rule({
      field: "qualification",
      op: "qualification",
      values: ["bachelor"],
      allowFinalYear: true,
      completionBy: "2027-09-01",
    });
    expect(
      state(r, {
        qualification: "bachelor",
        completion: "final_year",
        graduationDate: "2027-09-02",
      }),
    ).toBe("unknown");
    expect(
      state(r, {
        qualification: "bachelor",
        completion: "final_year",
        graduationDate: "2027-09-02",
        completedQualifications: ["bachelor"],
      }),
    ).toBe("pass");
  });
});
