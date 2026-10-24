import type { StudentProfile } from "@/server/profiles/schema";
import type { ScholarshipData } from "@/server/scholarships/schema";
import type { Outcome } from "./engine";
export function rank(profile: StudentProfile, scholarship: ScholarshipData, outcome: Outcome) {
  if (outcome === "not_eligible")
    return {
      score: 0,
      excluded: true,
      factors: ["Known mandatory failure: excluded from recommendations."],
    };
  let score = 0;
  const factors: string[] = [];
  const equal = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  if (profile.destinations.some((d) => equal(d, scholarship.destination))) {
    score += 30;
    factors.push("Preferred destination +30");
  }
  if (profile.targetField && scholarship.fields.some((f) => equal(f, profile.targetField!))) {
    score += 25;
    factors.push("Preferred field +25");
  }
  if (profile.preferredInstitutions.some((i) => equal(i, scholarship.institution))) {
    score += 15;
    factors.push("Preferred institution +15");
  }
  if (profile.fundingNeed === "full" && scholarship.fundingType === "comprehensive") {
    score += 20;
    factors.push("Preferred comprehensive funding +20");
  } else if (
    profile.fundingNeed === "tuition" &&
    ["tuition", "comprehensive"].includes(scholarship.fundingType)
  ) {
    score += 20;
    factors.push("Preferred tuition support +20");
  } else if (profile.fundingNeed === "any" && scholarship.fundingType !== "unknown") {
    score += 10;
    factors.push("Known funding package +10");
  }
  if (!profile.acceptPartial && scholarship.fundingType === "partial") {
    score -= 20;
    factors.push("Partial funding outside your preference −20");
  }
  if (!factors.length) factors.push("No stated preference differentiates this opportunity yet.");
  return { score, excluded: false, factors };
}
