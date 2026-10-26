import { expect, it } from "vitest";
import {
  normaliseScholarshipLinks,
  GLOCAL_OFFICIAL_URL,
  GLOCAL_APPLICATION_URL,
} from "../../src/server/scholarships/links";
import { testScholarship } from "../fixtures/scholarship";

it("uses one GLOCAL URL for equivalent syntax and tracking variants, independently of destinations", () => {
  for (const officialUrl of [
    GLOCAL_OFFICIAL_URL,
    "https://www.globallocal-erasmusmundus.eu/about-glocal/programme-overview?utm_source=spain#funding",
    "https://globallocal-erasmusmundus.eu/about-glocal/%70rogramme-overview/?fbclid=example",
  ]) {
    const original = {
      ...testScholarship(),
      officialUrl,
      applicationUrl: GLOCAL_APPLICATION_URL + "?utm_source=uk",
    };
    const result = normaliseScholarshipLinks("erasmus-glocal", original);
    expect(result.officialUrl).toBe(GLOCAL_OFFICIAL_URL);
    expect(result.applicationUrl).toBe(GLOCAL_APPLICATION_URL);
    expect(result.evidence).toEqual(original.evidence);
    expect(original.officialUrl).toBe(officialUrl);
    expect(normaliseScholarshipLinks("other-programme", original)).toBe(original);
  }
});

it("rejects conflicting pages, semantic queries and unsafe lookalike URLs instead of hiding them", () => {
  for (const officialUrl of [
    "https://globallocal-erasmusmundus.eu.evil.example/about-glocal/programme-overview/",
    "https://globallocal-erasmusmundus.eu/about-glocal/programme-overview/?redirect=elsewhere",
    "https://globallocal-erasmusmundus.eu/how-to-apply/",
    "https://globallocal-erasmusmundus.eu/about-glocal%2fprogramme-overview/",
    "https://user:password@globallocal-erasmusmundus.eu/about-glocal/programme-overview/",
    "http://globallocal-erasmusmundus.eu/about-glocal/programme-overview/",
  ])
    expect(() =>
      normaliseScholarshipLinks("erasmus-glocal", {
        ...testScholarship(),
        officialUrl,
        applicationUrl: GLOCAL_APPLICATION_URL,
      }),
    ).toThrow("canonical official page");
});
