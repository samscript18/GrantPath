import type { StudentProfile } from "@/server/profiles/schema";
import type { Requirement, Rule } from "./rules";
export const ENGINE_VERSION = "1.0.0";
export type State = "pass" | "fail" | "unknown";
export type Outcome = "eligible" | "potential" | "not_eligible";
export type RuleResult = { id: string; label: string; state: State; code: string; explanation: string; evidenceKey?: string; studentValue?: unknown; children?: RuleResult[] };
export type Assessment = { outcome: Outcome; state: State; engineVersion: string; evaluatedAt: string; tree: RuleResult; leaves: RuleResult[] };
export const outcomeLabels: Record<Outcome, string> = { eligible: "Eligible based on available information", potential: "Potential match: confirmation needed", not_eligible: "Not eligible based on known requirements" };
const normalise = (v: string) => v.trim().toLocaleLowerCase("en");
function yearsAt(birth: string, reference: string) { const b = new Date(birth); const r = new Date(reference); return r.getUTCFullYear() - b.getUTCFullYear() - (r.getUTCMonth() < b.getUTCMonth() || (r.getUTCMonth() === b.getUTCMonth() && r.getUTCDate() < b.getUTCDate()) ? 1 : 0); }
function monthsAfter(date: string, months: number) { const d = new Date(date); const originalDay = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + months); const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); d.setUTCDate(Math.min(originalDay, end)); return d; }
function leaf(rule: Requirement, p: StudentProfile): RuleResult {
  const value = rule.field === "providerConfirmation" ? undefined : p[rule.field];
  const result = (state: State, code: string, explanation: string): RuleResult => ({ id: rule.id, label: rule.label, state, code, explanation, evidenceKey: rule.evidenceKey, studentValue: value ?? null });
  if (!rule.verified) return result("unknown", "SOURCE_UNVERIFIED", "This requirement is missing, ambiguous or awaiting source confirmation. It cannot establish a pass or failure.");
  if (rule.field === "providerConfirmation") return result("unknown", "PROVIDER_CONFIRMATION", "Review the linked official conditions with the provider. Your profile does not establish these conditions.");
  if (rule.op === "qualification") {
    const accepted = rule.values || [];
    if (p.completedQualifications.some(q => accepted.includes(q))) return result("pass", "QUALIFICATION_HELD", "A recorded completed qualification meets the stated prerequisite.");
    if (!p.qualification || !p.completion) return result("unknown", "QUALIFICATION_MISSING", "Add your current qualification and its completion status.");
    if (p.completion === "completed") return accepted.includes(p.qualification) ? result("pass", "QUALIFICATION_HELD", "Your completed qualification meets this prerequisite.") : result("fail", "QUALIFICATION_NOT_ACCEPTED", "Your recorded qualifications do not include the provider’s required qualification.");
    if (accepted.includes(p.qualification) && rule.allowFinalYear && p.completion === "final_year") {
      if (!p.graduationDate || !rule.completionBy) return result("unknown", "COMPLETION_DATE_MISSING", "Confirm your expected completion date against the provider’s completion condition.");
      return p.graduationDate <= rule.completionBy ? result("pass", "FINAL_YEAR_COMPLETION_BY_DATE", `Final-year applicants are permitted if they complete by ${rule.completionBy}; your expected date meets that condition.`) : result("fail", "COMPLETION_TOO_LATE", `Your expected completion is after the required date ${rule.completionBy}.`);
    }
    if (!rule.allowFinalYear) return result("fail", "QUALIFICATION_NOT_COMPLETED", "The provider requires a completed qualification; your recorded study is not yet completed.");
    return result("unknown", "QUALIFICATION_CONFIRMATION", "Confirm whether your existing qualifications or expected completion meet this provider’s conditions.");
  }
  if (rule.op === "gpa") {
    if (!p.gpa) return result("unknown", "GPA_MISSING", "Add your result with its original scale.");
    const threshold = p.gpa.scale === rule.scale ? rule.threshold : rule.equivalents?.find(e => e.scale === p.gpa!.scale)?.minimum;
    if (threshold === undefined) return result("unknown", "GPA_SCALE_UNSUPPORTED", `Your ${p.gpa.scale}-point scale has no stated provider equivalence. Ask the provider; no proportional conversion was used.`);
    return p.gpa.value >= threshold ? result("pass", "GPA_MEETS_THRESHOLD", `Your original result ${p.gpa.value}/${p.gpa.scale} meets the supported minimum ${threshold}/${p.gpa.scale}.`) : result("fail", "GPA_BELOW_THRESHOLD", `Your original result ${p.gpa.value}/${p.gpa.scale} is below the supported minimum ${threshold}/${p.gpa.scale}.`);
  }
  if (rule.op === "language") {
    if (!p.language) return result("unknown", "LANGUAGE_MISSING", "Add a supported language result, or check the provider’s exemption alternatives.");
    if (!rule.values?.map(normalise).includes(normalise(p.language.type))) return result("fail", "LANGUAGE_TEST_NOT_ACCEPTED", "This language test does not satisfy this alternative. Other alternatives or exemptions may still apply.");
    if (p.language.score < (rule.threshold ?? Infinity)) return result("fail", "LANGUAGE_BELOW_THRESHOLD", "Your recorded language score is below this alternative’s minimum.");
    if (rule.maxAgeMonths) {
      if (!rule.referenceDate) return result("unknown", "LANGUAGE_REFERENCE_DATE_UNKNOWN", "The provider’s validity reference date needs confirmation.");
      if (p.language.takenAt > rule.referenceDate) return result("fail", "LANGUAGE_DATE_IN_FUTURE", "The test date is after the relevant provider reference date.");
      if (monthsAfter(p.language.takenAt, rule.maxAgeMonths) < new Date(rule.referenceDate)) return result("fail", "LANGUAGE_EXPIRED", "The result is older than permitted on the provider’s reference date.");
    }
    return result("pass", "LANGUAGE_MEETS_THRESHOLD", "The recorded test type, score and supported validity conditions meet this alternative.");
  }
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) return result("unknown", "PROFILE_MISSING", `Add or confirm ${rule.field.replace(/([A-Z])/g, " $1").toLowerCase()} to assess this condition.`);
  if (rule.op === "confirmed") return value === true ? result("pass", "CONFIRMED_TRUE", "Your explicit answer satisfies this alternative.") : value === false ? result("fail", "CONFIRMED_FALSE", "Your explicit answer does not satisfy this alternative.") : result("unknown", "CONFIRMATION_MISSING", "This condition needs an explicit confirmed answer.");
  if (rule.op === "in" || rule.op === "notIn") {
    // Qualification exclusion is about held degrees, not unfinished current study.
    if (rule.field === "qualification" && p.completion !== "completed") {
      const held = p.completedQualifications;
      if (rule.op === "notIn" && held.some(q => rule.values?.includes(q))) return result("fail", "EXCLUDED_QUALIFICATION_HELD", "A recorded completed qualification is excluded by the provider.");
      return result("unknown", "QUALIFICATION_HOLDING_UNCONFIRMED", "Confirm which degrees you already hold; current study alone cannot establish this exclusion.");
    }
    const values = (Array.isArray(value) ? value : [value]).filter(v => typeof v === "string").map(v => normalise(v));
    const intersects = values.some(v => rule.values?.map(normalise).includes(v));
    const pass = rule.op === "in" ? intersects : !intersects;
    return result(pass ? "pass" : "fail", pass ? "VALUE_ACCEPTED" : "VALUE_NOT_ACCEPTED", pass ? "Your recorded value satisfies this stated condition." : "Your recorded value does not satisfy this mandatory condition or alternative.");
  }
  if (["min", "max"].includes(rule.op)) {
    const numeric = rule.field === "birthDate" && typeof value === "string" && rule.referenceDate ? yearsAt(value, rule.referenceDate) : value;
    if (typeof numeric !== "number" || rule.threshold === undefined) return result("unknown", "COMPARISON_UNSUPPORTED", "The value or provider comparison units need confirmation.");
    const pass = rule.op === "min" ? numeric >= rule.threshold : numeric <= rule.threshold;
    return result(pass ? "pass" : "fail", pass ? "THRESHOLD_MET" : "THRESHOLD_NOT_MET", `${numeric} ${rule.op === "min" ? "must be at least" : "must be at most"} ${rule.threshold}${rule.field === "experienceMonths" ? " months" : rule.field === "experienceHours" ? " hours" : rule.field === "birthDate" ? " years at the provider’s reference date" : ""}.`);
  }
  if (["before", "after", "onOrBefore", "onOrAfter"].includes(rule.op)) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !rule.date) return result("unknown", "DATE_MISSING", "Confirm the relevant date and provider reference date.");
    const pass = rule.op === "before" ? value < rule.date : rule.op === "after" ? value > rule.date : rule.op === "onOrBefore" ? value <= rule.date : value >= rule.date;
    return result(pass ? "pass" : "fail", pass ? "DATE_CONDITION_MET" : "DATE_CONDITION_NOT_MET", `Your date ${value} was checked against ${rule.date} using the provider’s ${rule.op} condition.`);
  }
  return result("unknown", "UNSUPPORTED_CONDITION", "This condition needs provider confirmation.");
}
export function evaluate(rule: Rule, profile: StudentProfile, now = new Date()): Assessment {
  const leaves: RuleResult[] = [];
  function visit(r: Rule): RuleResult {
    if (r.kind === "requirement") { const v = leaf(r, profile); leaves.push(v); return v; }
    const children = r.rules.map(visit); const states = children.map(c => c.state);
    const state: State = r.kind === "all" ? states.includes("fail") ? "fail" : states.includes("unknown") || !states.length ? "unknown" : "pass" : states.includes("pass") ? "pass" : states.includes("unknown") || !states.length ? "unknown" : "fail";
    return { id: r.id, label: r.label, state, code: `${r.kind.toUpperCase()}_${state.toUpperCase()}`, explanation: r.kind === "all" ? "All mandatory conditions are required; a verified failure determines failure." : "Any passing alternative is sufficient; an unresolved alternative prevents a definite failure.", children };
  }
  const tree = visit(rule);
  return { outcome: tree.state === "pass" ? "eligible" : tree.state === "fail" ? "not_eligible" : "potential", state: tree.state, engineVersion: ENGINE_VERSION, evaluatedAt: now.toISOString(), tree, leaves };
}
