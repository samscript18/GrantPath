import type { ScholarshipData } from "../../src/server/scholarships/schema";
// Fictional source information for isolated automated tests only. Never seeded publicly.
export function testScholarship(): ScholarshipData { return {
  title: "[TEST ONLY] Controlled scholarship", summary: "An isolated fictional opportunity used to verify changes and eligibility. Never public production data.",
  destination: "United Kingdom", institution: "[TEST ONLY] Provider", levels: ["master"], fields: ["Computer Science"],
  fundingType: "tuition", funding: [{ component: "tuition", coverage: "full", description: "Fictional tuition-only award for testing." }], fundingSummary: "Test tuition only; living costs excluded.",
  availability: "open", opensAt: null, deadline: "2027-01-15T12:00:00.000Z", deadlineLabel: "15 January 2027, 12:00 UTC — isolated fixture", deadlineState: "confirmed",
  officialUrl: "https://www.ucl.ac.uk/scholarships/test-fixture", applicationUrl: "https://www.ucl.ac.uk/scholarships/test-fixture",
  requirements: { kind: "all", id: "all", label: "All requirements", rules: [{ kind: "requirement", id: "level", label: "Intended master’s study", field: "targetLevel", op: "in", values: ["master"], verified: true, evidenceKey: "levels" }] },
  evidence: ["levels", "funding", "availability", "deadline"].map(field => ({ field, url: "https://www.ucl.ac.uk/scholarships/test-fixture", passage: `Fictional ${field} evidence in an isolated test fixture.`, state: "verified", retrievedAt: "2026-10-24T10:15:11.000Z" })),
}; }
