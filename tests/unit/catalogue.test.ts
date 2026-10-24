import { describe, it, expect } from "vitest";
import { reviewedCatalogue } from "../../src/data/catalogue";
import { scholarshipDataSchema, availabilityOf } from "../../src/server/scholarships/schema";
import { semanticHash } from "../../src/server/scholarships/publish";
import { testScholarship } from "../fixtures/scholarship";
describe("accepted catalogue and evidence", () => {
  it("validates every researched real record without test opportunities", () => { expect(reviewedCatalogue).toHaveLength(20); for (const entry of reviewedCatalogue) { expect(scholarshipDataSchema.safeParse(entry.data).success, entry.slug).toBe(true); expect(entry.data.title).not.toContain("TEST"); } });
  it("rejects checked rules with no checked supporting evidence", () => { const d = testScholarship(); d.evidence = d.evidence.filter(e => e.field !== "levels"); expect(scholarshipDataSchema.safeParse(d).success).toBe(false); });
  it("cannot label tuition-only funding comprehensive or infer a closing instant", () => { const d = testScholarship(); d.fundingType = "comprehensive"; expect(scholarshipDataSchema.safeParse(d).success).toBe(false); d.fundingType = "tuition"; d.deadlineState = "unknown"; expect(scholarshipDataSchema.safeParse(d).success).toBe(false); });
  it("ignores whitespace, ordering and retrieval-time changes", () => { expect(semanticHash({ a: "one  two", b: ["x", "y"], retrievedAt: "old" })).toBe(semanticHash({ retrievedAt: "new", b: ["y", "x"], a: "one two" })); });
  it("separates availability from eligibility and uses actual confirmed deadline", () => { expect(availabilityOf({ availability: "open", deadline: "2026-01-01T12:00:00Z" }, new Date("2026-01-01T12:00:00Z"))).toBe("closed"); expect(availabilityOf({ availability: "unknown", deadline: null })).toBe("unknown"); });
});
