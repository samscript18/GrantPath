// Isolated fixtures only. These definitions are never registered by production setup.
import type { DirectoryDefinition, DetailMapping } from "../../src/server/discovery/types";
import { testScholarship } from "./scholarship";
import { semanticHash } from "../../src/server/scholarships/publish";
export function discoveryFixture(tag = "unit") {
  const url = `https://www.ucl.ac.uk/scholarships/controlled-${tag}`;
  const data = testScholarship();
  data.title += ` ${tag}`;
  data.studyLocations = {
    scope: "multiple",
    countries: ["GB", "DE"],
    institutions: [
      { name: "[TEST ONLY] Joint institution", countryCode: "GB" },
      { name: "[TEST ONLY] German institution", countryCode: "DE" },
    ],
  };
  data.recordKind = "cycle";
  data.cycleStatus = "confirmed";
  data.officialUrl = url;
  data.applicationUrl = url;
  const passages = {
    title: data.title,
    destination: "United Kingdom and Germany",
    institution: "Joint institution",
    levels: "Master degree only",
    funding: "Tuition only",
    availability: "Applications open",
    deadline: "15 January 2027 12:00 UTC",
    cycle: "TEST 2027",
  };
  data.evidence = Object.entries(passages).map(([field, passage]) => ({
    field,
    passage,
    url,
    state: "verified",
    retrievedAt: "2026-10-25T08:00:00.000Z",
  }));
  const section = "Master degree only";
  const mapping: DetailMapping = {
    key: `controlled-${tag}`,
    provider: {
      key: `controlled-${tag}`,
      name: "[TEST ONLY] Joint provider",
      url: "https://www.ucl.ac.uk",
      countryCode: "GB",
    },
    programme: "[TEST ONLY] Joint programme",
    url,
    cycle: "TEST 2027",
    cycleConfirmed: true,
    heading: "Controlled scholarship",
    data,
    passages,
    requirementsComplete: true,
    sections: [{ selector: "#requirements", hash: semanticHash(section) }],
  };
  const directory: DirectoryDefinition = {
    id: `controlled-${tag}`,
    url: `https://www.ucl.ac.uk/scholarships/controlled-directory-${tag}`,
    heading: "Controlled directory",
    linkSelector: "main a[href]",
    allowedDetails: [{ host: "www.ucl.ac.uk", pathPrefix: "/scholarships" }],
    pagination: {
      selector: "a[rel=next]",
      pathPrefix: `/scholarships/controlled-directory-${tag}`,
      queryKeys: ["page"],
    },
    mappings: [mapping],
  };
  const html = `<main><h1>${data.title}</h1><p>${passages.destination}</p><p>${passages.institution}</p><div id="requirements">${section}</div><p>${passages.funding}</p><p>${passages.availability}</p><p>${passages.deadline}</p><p>${passages.cycle}</p></main>`;
  return { directory, mapping, html };
}
