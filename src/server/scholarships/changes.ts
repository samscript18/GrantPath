import { semanticHash } from "./publish";
import type { ScholarshipData } from "./schema";
export function materialChanges(before: ScholarshipData | null, after: ScholarshipData) {
  const fields = [
    "deadline",
    "deadlineLabel",
    "deadlineState",
    "availability",
    "requirements",
    "funding",
    "fundingType",
    "fundingSummary",
    "applicationUrl",
    "levels",
    "sourceFacts",
    "studyLocations",
  ] as const;
  return fields
    .filter((field) => semanticHash(before?.[field] ?? null) !== semanticHash(after[field] ?? null))
    .map((field) => ({ field, before: before?.[field] ?? null, after: after[field] ?? null }));
}
