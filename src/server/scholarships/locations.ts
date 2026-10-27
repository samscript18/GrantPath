import { countryCode, countryName } from "@/lib/countries";
import type { ScholarshipData } from "./schema";
export function studyLocationsOf(
  data: Pick<ScholarshipData, "destination" | "studyLocations" | "institution">,
) {
  if (data.studyLocations) return data.studyLocations;
  const code = countryCode(data.destination);
  return {
    scope: code ? ("single" as const) : ("unconfirmed" as const),
    countries: code ? [code] : [],
    institutions: [{ name: data.institution, ...(code ? { countryCode: code } : {}) }],
  };
}
export function destinationLabel(
  data: Pick<ScholarshipData, "destination" | "studyLocations" | "institution">,
) {
  const locations = studyLocationsOf(data);
  if (locations.countries.length)
    return locations.countries.map((code) => countryName(code)).join(" · ");
  return {
    global: "Worldwide",
    institution_dependent: "Depends on institution",
    participating: "Participating destinations",
    unconfirmed: "Destination to confirm",
    single: "Destination to confirm",
    multiple: "Destinations to confirm",
  }[locations.scope];
}
