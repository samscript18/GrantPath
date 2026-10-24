import type { StudentProfile } from "./schema";
// Matching basics are separate from provider eligibility and optional preferences.
// GPA/language/experience can remain unknown without inventing answers.
export function profileReadiness(data: StudentProfile) {
  const fields = [
    { label: "Citizenship", complete: data.citizenships.length > 0, stage: 0 },
    { label: "Country of residence", complete: Boolean(data.residence), stage: 0 },
    { label: "Current qualification", complete: Boolean(data.qualification), stage: 1 },
    { label: "Completion status", complete: Boolean(data.completion), stage: 1 },
    { label: "Intended study level", complete: Boolean(data.targetLevel), stage: 2 },
    { label: "Intended field of study", complete: Boolean(data.targetField?.trim()), stage: 2 },
  ];
  const missing = fields.filter((field) => !field.complete);
  return { fields, missing, ready: missing.length === 0 };
}
