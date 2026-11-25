// Individually reviewed intake contract; snapshots were retrieved with robots,
// URL allowlisting and bounded network checks. No fetching or database writes.
import { readFile, writeFile } from "node:fs/promises";
import * as cheerio from "cheerio";
import { semanticHash } from "../src/server/scholarships/publish";
import { scholarshipDataSchema } from "../src/server/scholarships/schema";
const clean = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim();
async function snapshot(id: string) {
  const $ = cheerio.load(await readFile(`.local/growth/${id}-directory.html`, "utf8"));
  $("script,style,nav,header,footer,noscript,iframe").remove();
  const selector = $("main").length ? "main" : "body";
  return { selector, text: clean($(selector).text()) };
}
const contracts = JSON.parse(await readFile("src/data/erasmus-programme-contracts.json", "utf8")),
  p = await snapshot("ediss"),
  programme = await snapshot("ediss-programme"),
  fund = await snapshot("ediss-funding");
const url = "https://www.master-ediss.eu/",
  programmeUrl = url + "programme/",
  fundingUrl = url + "scholarship/";
const funding =
  "The EMJM scholarship includes a waiver of the participation costs, a monthly contribution to subsistence costs (1400€ per month) and health insurance coverage.";
const cycle = "EDISS intake 7 students, academic years 2027-29, studies starting in August 2027";
for (const text of [funding, cycle])
  if (!fund.text.includes(text)) throw Error("Missing current EDISS funding evidence");
if (
  !programme.text.includes("double master’s degree") ||
  !programme.text.includes("Åbo Akademi University")
)
  throw Error("Missing EDISS degree identity");
const m = structuredClone(contracts[0]);
Object.assign(m, {
  key: "erasmus-ediss-data-intensive-software",
  programme: "EDISS Master’s programme scholarships",
  url,
  cycle: "2027/29",
  cycleConfirmed: true,
  heading: "News",
  provider: { key: "ediss-consortium", name: "EDISS consortium", url },
  supportPages: [programmeUrl, fundingUrl],
  sections: [{ selector: p.selector, hash: semanticHash(p.text) }],
  supportSections: [
    { url: programmeUrl, selector: programme.selector, hash: semanticHash(programme.text) },
    { url: fundingUrl, selector: fund.selector, hash: semanticHash(fund.text) },
  ],
  passages: {
    title: "EDISS Master’s programme",
    institution: "Åbo Akademi University",
    destination: "Åbo Akademi University",
    levels: "double master’s degree",
    cycle,
    funding,
  },
});
const facts: Record<string, string> = {
  cycleScope:
    "Only the explicitly stated intake 7 (2027–2029) funding terms are used. Earlier intake terms on the funding page are historical.",
  studyDestinations:
    "Finland is a supported participating destination via Åbo Akademi University; second-year mobility destinations require confirmation.",
  fundingOptions:
    "EMJM, EDISS and tuition-waiver packages are alternatives within one programme, not separate records.",
};
for (const [prefix, text] of [
  ["programme", programme.text],
  ["fundingTerms", fund.text],
])
  for (let i = 0; i < text.length; i += 8000)
    facts[prefix + (i / 8000 + 1)] = text.slice(i, i + 8000);
Object.assign(m.data, {
  title: m.programme,
  summary:
    "EDISS intake 7 supports a two-year joint master starting in August 2027. EMJM, EDISS and tuition-waiver packages differ; prior scholarship, language, academic and mobility conditions require confirmation.",
  institution: "Åbo Akademi University and EDISS consortium partners",
  destination: "Finland · additional mobility destinations require confirmation",
  studyLocations: {
    scope: "participating",
    countries: ["FI"],
    institutions: [{ name: "Åbo Akademi University", countryCode: "FI" }],
  },
  recordKind: "cycle",
  cycleStatus: "confirmed",
  officialUrl: url,
  applicationUrl: url + "admission/",
  sourceFacts: facts,
  funding: [{ component: "other", coverage: "unspecified", description: funding }],
  fundingSummary: funding,
  evidence: [
    ...Object.entries(m.passages).map(([field, passage]) => ({
      field,
      passage,
      url: ["title", "cycle", "funding"].includes(field) ? fundingUrl : programmeUrl,
      state: "verified",
      retrievedAt: new Date().toISOString(),
    })),
    ...["requirements", "availability", "deadline"].map((field) => ({
      field,
      passage:
        "Complete eligibility and the precise application window require provider confirmation.",
      url,
      state: "missing",
      retrievedAt: new Date().toISOString(),
    })),
  ],
});
m.data = scholarshipDataSchema.parse(m.data);
const rows = contracts.filter((c: { key: string }) => c.key !== m.key);
rows.push(m);
await writeFile("src/data/erasmus-programme-contracts.json", JSON.stringify(rows, null, 2) + "\n");
