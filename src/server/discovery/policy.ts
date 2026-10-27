import { publicationSchema, type ScholarshipData } from "@/server/scholarships/schema";
import { semanticHash } from "@/server/scholarships/publish";
import type { Validation } from "./types";
export function publicationPolicy(input: {
  enabled: boolean;
  autoPublish: boolean;
  validation: Validation;
  candidate: ScholarshipData | null;
  previous?: ScholarshipData | null;
}) {
  const { validation: v, candidate: data, previous } = input;
  const reasons = [...v.codes];
  if (!input.enabled) reasons.push("SOURCE_PAUSED");
  if (!input.autoPublish) reasons.push("POLICY_PAUSED");
  if (!v.structure) reasons.push("UNSUPPORTED_LAYOUT");
  if (!data) reasons.push("UNSUPPORTED_DETAIL_MAPPING");
  if (data) {
    if (!publicationSchema.safeParse(data).success) reasons.push("PUBLICATION_SCHEMA_INVALID");
    for (const field of ["title", "destination", "institution", "levels"])
      if (
        !v.matchedFields.includes(field) ||
        !data.evidence.some((e) => e.field === field && e.state === "verified")
      )
        reasons.push(`CRITICAL_EVIDENCE_MISSING:${field}`);
    if (data.evidence.some((e) => e.state === "conflicting")) reasons.push("SOURCE_CONFLICT");
    if (v.cycleConfirmed && !v.matchedFields.includes("cycle"))
      reasons.push("CYCLE_EVIDENCE_MISSING");
    if (!v.cycleConfirmed && data.recordKind !== "overview") reasons.push("CYCLE_UNCONFIRMED");
    if (
      data.recordKind === "overview" &&
      (data.availability !== "unknown" || data.deadline || data.deadlineState !== "unknown")
    )
      reasons.push("OVERVIEW_IS_NOT_OPEN_CYCLE");
    if (!v.requirementsComplete && !mandatoryConfirmation(data.requirements))
      reasons.push("MANDATORY_CONDITIONS_UNMAPPED");
    if (previous && semanticHash(previous) !== semanticHash(data)) {
      const changed = (Object.keys(data) as (keyof ScholarshipData)[]).filter(
        (key) => key !== "evidence" && semanticHash(data[key]) !== semanticHash(previous[key]),
      );
      const safe = new Set([
        "deadline",
        "deadlineState",
        "deadlineLabel",
        "availability",
        "requirements",
        "levels",
        "funding",
        "fundingType",
        "fundingSummary",
      ]);
      if (changed.some((key) => !safe.has(key))) reasons.push("UNSUPPORTED_FIELD_CHANGE");
      if (
        changed.some((key) =>
          ["requirements", "levels", "funding", "fundingType", "fundingSummary"].includes(key),
        ) &&
        !v.requirementsComplete
      )
        reasons.push("SEMANTIC_CHANGE_NEEDS_REVIEW");
      if (
        (previous.deadline && !data.deadline) ||
        (previous.funding.length && !data.funding.length)
      )
        reasons.push("REMOVED_MATERIAL_CONTENT");
      if (
        changed.includes("requirements") &&
        countRules(data.requirements) < countRules(previous.requirements)
      )
        reasons.push("REMOVED_REQUIREMENT");
      if (
        changed.includes("deadline") &&
        (!v.cycleConfirmed ||
          data.deadlineState !== "confirmed" ||
          !v.matchedFields.includes("deadline"))
      )
        reasons.push("DEADLINE_SEMANTICS_UNSUPPORTED");
      if (changed.length > 4) reasons.push("MASS_CHANGE");
    }
  }
  const codes = [...new Set(reasons)];
  if (codes.includes("UNSAFE_SOURCE_IDENTITY")) return { decision: "reject" as const, codes };
  if (codes.length) return { decision: "review_required" as const, codes };
  if (previous && data && semanticHash(previous) === semanticHash(data))
    return { decision: "unchanged" as const, codes: ["SEMANTICALLY_UNCHANGED"] };
  return {
    decision: "auto_publish" as const,
    codes: [previous ? "VALIDATED_FIELD_UPDATE" : "VALIDATED_OFFICIAL_RECORD"],
  };
}
import type { Rule } from "@/server/eligibility/rules";
function mandatoryConfirmation(rule: Rule): boolean {
  if (rule.kind === "requirement") return rule.field === "providerConfirmation";
  return rule.kind === "all" && rule.rules.some(mandatoryConfirmation);
}
const countRules = (rule: Rule): number =>
  rule.kind === "requirement" ? 1 : rule.rules.reduce((n, r) => n + countRules(r), 0);
