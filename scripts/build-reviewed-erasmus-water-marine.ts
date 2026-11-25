// Exact evidence contracts from bounded, robots-aware programme snapshots.
// No network requests, source activation or database writes.
import { readFile, writeFile } from "node:fs/promises";
import * as cheerio from "cheerio";
import { semanticHash } from "../src/server/scholarships/publish";
import { scholarshipDataSchema } from "../src/server/scholarships/schema";
import { extractDetail } from "../src/server/discovery/adapters";
import type { DetailMapping } from "../src/server/discovery/types";
const clean = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim();
async function snapshot(id: string) {
  const html = await readFile(`.local/growth/${id}-directory.html`, "utf8");
  const $ = cheerio.load(html);
  $("script,style,nav,header,footer,noscript,iframe").remove();
  if (id === "euconexus-marine") $("form").remove();
  const selector = $("main").length ? "main" : "body";
  return { html, selector, text: clean($(selector).text()) };
}
const rows: DetailMapping[] = JSON.parse(
  await readFile("src/data/erasmus-programme-contracts.json", "utf8"),
);
const configurations = [
  {
    id: "waves",
    url: "https://www.msc-waves.eu/",
    fundingId: "waves-funding",
    fundingUrl: "https://www.msc-waves.eu/fees-and-funding",
    key: "erasmus-waves-water-spatial-sciences",
    title: "MSc WAVES - Water Vulnerability Engineering in Spatial Sciences.",
    heading: "See water from space.Create solutions on the ground.",
    institution: "University of Twente, the University of Padova and the University of Ljubljana",
    institutionName: "WAVES consortium — Twente, Padova and Ljubljana",
    countries: ["NL", "IT", "SI"],
    destination: "Netherlands · Italy · Slovenia",
    cycle: "2027",
    cyclePassage: "There are 18 scholarships available for the 2027 intake.",
    levels: "Double MSc Degree, 120 ECTS",
    funding:
      "The scholarship runs for the full 24 months. It pays your tuition and participation costs in full, including the health and accident insurance the consortium arranges for you. You also receive a contribution to field work, and a monthly allowance of €1,400 for living costs.",
    fundingSummary:
      "Tuition and participation costs, consortium insurance, field-work contribution and a €1,400 monthly living allowance for 24 months. Confirm complete terms and exclusions.",
    summary:
      "WAVES joint master scholarships support water vulnerability and spatial sciences across its European teaching partners. Funding is explicitly offered for the 2027 intake; admission, mobility and complete award conditions require confirmation.",
    applicationUrl:
      "https://utwente.dreamapply.com/courses/course/23-msc-waves-water-vulnerability-engineering-spatial-sciences",
    fields: ["Water Vulnerability Engineering", "Spatial Water Sciences", "Water Governance"],
  },
  {
    id: "euconexus-marine",
    url: "https://www.eu-conexus.eu/en/marine-biotechnology/",
    fundingId: "euconexus-marine",
    fundingUrl: "https://www.eu-conexus.eu/en/marine-biotechnology/",
    key: "erasmus-euconexus-marine-biotechnology",
    title: "Joint Master Programme in Marine Biotechnology",
    heading: "Joint Master Programme in Marine Biotechnology",
    institution: "EU-CONEXUS",
    institutionName: "EU-CONEXUS Marine Biotechnology consortium",
    countries: ["ES", "FR"],
    destination: "Spain · France · additional consortium destinations",
    cycle: "2027/2028",
    cyclePassage: "Admission Procedure and Timeline 2027/2028",
    levels: "Joint Master Programme in Marine Biotechnology",
    funding: "EU-CONEXUS offers up to 15 places with a 100% tuition fee waiver.",
    fundingSummary:
      "Up to 15 tuition-fee waivers; living costs, travel, accommodation and visa procedures are excluded. Erasmus Mundus scholarships follow separate linked terms.",
    summary:
      "EU-CONEXUS offers a joint Marine Biotechnology master with Erasmus Mundus scholarship and tuition-waiver routes. The tuition waiver excludes accommodation, transport, travel, meals, books, visa procedures and other living costs. The packages are alternatives within one programme.",
    applicationUrl:
      "https://apply.eu-conexus.eu/courses/course/11-msc-joint-master-programe-marine-biotechnology",
    fields: ["Marine Biotechnology"],
  },
];
for (const config of configurations) {
  const p = await snapshot(config.id),
    f = await snapshot(config.fundingId);
  const passages = {
    title: config.title,
    institution: config.institution,
    destination: config.institution,
    levels: config.levels,
    funding: config.funding,
    cycle: config.cyclePassage,
  };
  for (const [field, passage] of Object.entries(passages)) {
    if (!(field === "funding" || field === "cycle" ? f.text : p.text).includes(passage))
      throw Error(`Missing ${config.id} ${field} evidence: ${passage}`);
  }
  const mapping = structuredClone(rows[0]);
  const support = config.fundingUrl !== config.url;
  Object.assign(mapping, {
    ...(config.id === "euconexus-marine" ? { ignoredSelectors: ["form"] } : {}),
    key: config.key,
    programme: config.title,
    url: config.url,
    heading: config.heading,
    provider: { key: config.key + "-consortium", name: config.institutionName, url: config.url },
    cycle: config.cycle,
    cycleConfirmed: true,
    passages,
    supportPages: support ? [config.fundingUrl] : [],
    sections: [{ selector: p.selector, hash: semanticHash(p.text) }],
    supportSections: support
      ? [{ url: config.fundingUrl, selector: f.selector, hash: semanticHash(f.text) }]
      : [],
  });
  const facts: Record<string, string> = {
    destinationScope:
      config.id === "euconexus-marine"
        ? "Spain and France are explicitly named semester locations. Other track/thesis locations require confirmation."
        : "Only the three European teaching countries are classified as destinations; associated research partners are not automatically study destinations.",
    applicationWindow:
      "Original date wording retained below. No closing instant or open status is inferred from a date lacking verified semantics.",
    packageScope: "One programme/cycle; alternative funding packages are not separate records.",
  };
  for (const [prefix, text] of [
    ["programme", p.text],
    ["fundingTerms", f.text],
  ])
    for (let n = 0; n < text.length; n += 8000)
      facts[prefix + (n / 8000 + 1)] = text.slice(n, n + 8000);
  mapping.data = scholarshipDataSchema.parse({
    ...mapping.data,
    title: config.title,
    summary: config.summary,
    institution: config.institutionName,
    destination: config.destination,
    studyLocations: { scope: "participating", countries: config.countries, institutions: [] },
    fields: config.fields,
    levels: ["master"],
    recordKind: "cycle",
    cycleStatus: "confirmed",
    officialUrl: config.url,
    applicationUrl: config.applicationUrl,
    fundingType: "unknown",
    funding: [{ component: "other", coverage: "unspecified", description: config.fundingSummary }],
    fundingSummary: config.fundingSummary,
    sourceFacts: facts,
    evidence: [
      ...Object.entries(passages).map(([field, passage]) => ({
        field,
        passage,
        url: ["funding", "cycle"].includes(field) ? config.fundingUrl : config.url,
        state: "verified",
        retrievedAt: new Date().toISOString(),
      })),
      ...["requirements", "availability", "deadline"].map((field) => ({
        field,
        passage:
          "Complete award conditions and the precise application window require provider confirmation.",
        url: config.url,
        state: "missing",
        retrievedAt: new Date().toISOString(),
      })),
    ],
  });
  const result = extractDetail(
    mapping,
    p.html,
    new Date(),
    support ? { [config.fundingUrl]: f.html } : {},
  );
  if (result.validation.codes.length) throw Error(JSON.stringify(result.validation.codes));
  const index = rows.findIndex((row) => row.key === mapping.key);
  if (index < 0) rows.push(mapping);
  else rows[index] = mapping;
}
await writeFile("src/data/erasmus-programme-contracts.json", JSON.stringify(rows, null, 2) + "\n");
