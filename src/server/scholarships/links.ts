import type { ScholarshipData } from "./schema";

export const GLOCAL_PROGRAMME_KEY = "erasmus-glocal";
export const GLOCAL_OFFICIAL_URL =
  "https://globallocal-erasmusmundus.eu/about-glocal/programme-overview/";
export const GLOCAL_APPLICATION_URL = "https://globallocal-erasmusmundus.eu/how-to-apply/";

function canonicalGlocalUrl(raw: string, expected: string) {
  const url = new URL(raw);
  const target = new URL(expected);
  // Decode only unreserved characters; never interpret an encoded separator as a path.
  const path = url.pathname.replace(/%[\da-f]{2}/gi, (encoded) => {
    const character = String.fromCharCode(Number.parseInt(encoded.slice(1), 16));
    return /^[\w.~\-]$/.test(character) ? character : encoded;
  });
  if (
    url.protocol !== "https:" ||
    ![target.hostname, `www.${target.hostname}`].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    path.replace(/\/+$/, "") !== target.pathname.replace(/\/+$/, "") ||
    [...url.searchParams.keys()].some((key) => !/^(utm_.+|fbclid|gclid|msclkid)$/i.test(key))
  )
    throw new Error(`GLOCAL must use its canonical official page: ${expected}`);
  return expected;
}

// Programme identity, never a selected destination, determines the official link.
// Evidence citations deliberately retain their own original source URLs.
export function normaliseScholarshipLinks(programmeKey: string, data: ScholarshipData) {
  if (programmeKey !== GLOCAL_PROGRAMME_KEY) return data;
  return {
    ...data,
    officialUrl: canonicalGlocalUrl(data.officialUrl, GLOCAL_OFFICIAL_URL),
    applicationUrl: canonicalGlocalUrl(data.applicationUrl, GLOCAL_APPLICATION_URL),
  };
}
