// Rebuild individually reviewed contracts from robots-aware local snapshots.
// This script never fetches a URL, registers a source or writes a database.
import { readFile, writeFile } from "node:fs/promises";
import * as cheerio from "cheerio";
import { semanticHash } from "../src/server/scholarships/publish";
import { scholarshipDataSchema } from "../src/server/scholarships/schema";
const clean = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim();
async function snapshot(id: string) {
  const $ = cheerio.load(await readFile(`.local/growth/${id}-directory.html`, "utf8"));
  $("script,style,nav,header,footer,noscript,iframe").remove();
  const selector = $("main").length ? "main" : "body";
  return { selector, text: clean($(selector).text()), $ };
}
const contracts = JSON.parse(await readFile("src/data/erasmus-programme-contracts.json", "utf8"));
const primary = await snapshot("deai"),
  fund = await snapshot("deai-funding");
const url = "https://deai.ulb.be/",
  fundingUrl = "https://deai.ulb.be/home/students/tuition-fees-scholarships/";
const title = "Erasmus Mundus Joint Master in Data Engineering and Artificial Intelligence (DEAI)";
const institution =
  "Université Libre de Bruxelles (ULB) in Belgium, Universitat Politècnica de Catalunya (UPC) in Spain, Technische Universität Wien (TUW) in Austria, Université Claude Bernard Lyon 1 (UCBL) in France and Università degli Studi di Padova (UniPD) in Italy";
const funding =
  "Living Expenses: A monthly grant of **€1,400** for the duration of the programme (up to 24 months).";
for (const passage of [title, institution])
  if (!primary.text.includes(passage))
    throw Error("Missing reviewed DEAI identity evidence: " + passage);
if (!fund.text.includes(funding)) throw Error("Missing reviewed DEAI funding evidence");
const template = structuredClone(contracts[0]);
Object.assign(template, {
  key: "erasmus-deai-data-engineering",
  programme: title,
  url,
  cycle: "Scheme overview — cycle unconfirmed",
  cycleConfirmed: false,
  heading: "Background & Objectives",
  provider: { key: "deai-consortium", name: "DEAI consortium", url },
  supportPages: [fundingUrl],
  sections: [{ selector: primary.selector, hash: semanticHash(primary.text) }],
  supportSections: [{ url: fundingUrl, selector: fund.selector, hash: semanticHash(fund.text) }],
  passages: { title, institution, destination: institution, levels: "Joint Master", funding },
});
const facts: Record<string, string> = {
  reviewedListing: "https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en",
  fundingOptions:
    "Full and partial scholarships are alternative awards under one programme, not separate scholarship records.",
  applicationProcedure:
    "Official programme admission guidance: https://deai.ulb.be/home/students/admission/",
};
for (const [prefix, text] of [
  ["programme", primary.text],
  ["fundingTerms", fund.text],
])
  for (let i = 0; i < text.length; i += 8000)
    facts[prefix + (i / 8000 + 1)] = text.slice(i, i + 8000);
Object.assign(template.data, {
  title,
  summary:
    "DEAI joint master scholarships support study across the named consortium institutions. Full and tuition-only options differ; partial scholarship holders cover living and travel costs. Prior EMJM scholarship restrictions and admission conditions require confirmation.",
  institution: "DEAI consortium institutions",
  destination: "Belgium · Spain · Austria · France · Italy",
  studyLocations: {
    scope: "participating",
    countries: ["BE", "ES", "AT", "FR", "IT"],
    institutions: [],
  },
  officialUrl: url,
  applicationUrl: "https://deai.ulb.be/home/students/admission/",
  fundingSummary:
    "Full scholarships include participation costs and up to 24 months of living support; partial awards cover participation costs only.",
  funding: [{ component: "other", coverage: "unspecified", description: funding }],
  sourceFacts: facts,
  evidence: [
    ...Object.entries(template.passages).map(([field, passage]) => ({
      field,
      passage,
      url: field === "funding" ? fundingUrl : url,
      state: "verified",
      retrievedAt: new Date().toISOString(),
    })),
    ...["requirements", "availability", "deadline"].map((field) => ({
      field,
      passage:
        "Complete eligibility and the current application window require provider confirmation.",
      url,
      state: "missing",
      retrievedAt: new Date().toISOString(),
    })),
  ],
});
template.data = scholarshipDataSchema.parse(template.data);
const rows = contracts.filter((c: { key: string }) => c.key !== template.key);
rows.push(template);
await writeFile("src/data/erasmus-programme-contracts.json", JSON.stringify(rows, null, 2) + "\n");
