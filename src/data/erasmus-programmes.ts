import contracts from "./erasmus-programme-contracts.json" with { type: "json" };
import type { DetailMapping } from "@/server/discovery/types";
import { scholarshipDataSchema } from "@/server/scholarships/schema";
// Individually reviewed programme contracts, reached through the EACEA
// catalogue. Programme membership alone never becomes a funding assertion.
export const erasmusProgrammeMappings: DetailMapping[] = contracts.map((contract) => ({
  ...contract,
  passages: Object.fromEntries(
    Object.entries(contract.passages).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  ),
  data: scholarshipDataSchema.parse(contract.data),
  ...(contract.key === "erasmus-waves-water-spatial-sciences"
    ? { applicationWindow: { closing: "15 January 2027 (23:59 CET)" } }
    : contract.key === "erasmus-euconexus-marine-biotechnology"
      ? { applicationWindow: { opening: "1 December 2026", closing: "31 January 2027" } }
      : contract.key === "erasmus-geospatial-technologies"
        ? {
            applicationWindow: {
              url: "https://mastergeotech.info/fees-fundings/erasmus-mundus-scholarships/",
              closing: "January 7, 2027",
            },
          }
        : {}),
}));
