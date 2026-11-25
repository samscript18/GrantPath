import * as cheerio from "cheerio";
import type { OpportunityAdapter } from "./adapter-registry";
import type { DetailMapping, DirectoryDefinition } from "./types";
import { scholarshipDataSchema, type ScholarshipData } from "@/server/scholarships/schema";
import { semanticHash } from "@/server/scholarships/publish";
import { extractStructuredMetadata } from "./structured-metadata";

const clean = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim();
type HtmlTemplate = {
  id: string;
  host: string;
  path: RegExp;
  root: string;
  title: string;
  provider: DetailMapping["provider"];
  institution: string;
  country: string;
  destination: string;
  institutionEvidence: RegExp;
  requiredHeadings: RegExp[];
  levels: { level: ScholarshipData["levels"][number]; pattern: RegExp }[];
};

const templates: HtmlTemplate[] = [
  {
    id: "csc-opportunity-1",
    host: "cscuk.fcdo.gov.uk",
    // Master's is already maintained by the legacy adapter; fellowships,
    // host guidance and country navigation are not degree opportunities.
    path: /^\/scholarships\/commonwealth-(?!masters-scholarships\/)[a-z-]*scholarships(?:-[a-z-]+)?\/$/,
    root: "article.type-cscukscholarship",
    title: "article.type-cscukscholarship h1.entry-title",
    provider: {
      key: "commonwealth",
      name: "Commonwealth Scholarship Commission",
      url: "https://cscuk.fcdo.gov.uk",
      countryCode: "GB",
    },
    institution: "Participating UK universities",
    country: "GB",
    destination: "United Kingdom",
    institutionEvidence: /(?:a UK university|UK universities)/i,
    requiredHeadings: [/^Applicant eligibility$/i, /^Financial assistance$/i, /^How to apply$/i],
    levels: [
      { level: "doctorate", pattern: /(?:doctoral study|PhD study)/i },
      { level: "master", pattern: /Master[’']?s (?:study|degree|courses)/i },
    ],
  },
  {
    id: "sheffield-postgraduate-1",
    host: "sheffield.ac.uk",
    path: /^\/international\/fees-and-funding\/scholarships\/postgraduate\/(?!chevening-scholars$)[a-z0-9-]+$/,
    root: "main article",
    title: "main h1.page-title",
    provider: {
      key: "sheffield",
      name: "University of Sheffield",
      url: "https://sheffield.ac.uk",
      countryCode: "GB",
    },
    institution: "University of Sheffield",
    country: "GB",
    destination: "United Kingdom",
    institutionEvidence: /University of Sheffield/,
    requiredHeadings: [/^Eligibility$/i, /^How to apply$/i, /^Terms and conditions$/i],
    levels: [
      {
        level: "master",
        pattern: /(?:Masters degree|masters scholarships|taught masters programme)/i,
      },
    ],
  },
  {
    id: "mandela-rhodes-1",
    host: "www.mandelarhodes.org",
    path: /^\/scholarship\/apply\/$/,
    root: "main",
    title: "main h1",
    provider: {
      key: "mandela-rhodes",
      name: "The Mandela Rhodes Foundation",
      url: "https://www.mandelarhodes.org",
      countryCode: "ZA",
    },
    institution: "Recognised South African institutions of higher education",
    country: "ZA",
    destination: "South Africa",
    institutionEvidence:
      /(?:South African institution of higher education|South African university)/i,
    requiredHeadings: [/^Financial support$/i, /^How to apply$/i],
    // Honours is retained in source facts; it is not converted to bachelor/master.
    levels: [{ level: "master", pattern: /Masters degree/i }],
  },
];

function extract(
  template: HtmlTemplate,
  definition: DirectoryDefinition,
  url: string,
  html: string,
): DetailMapping | undefined {
  if (Buffer.byteLength(html) > 2_000_000) throw new Error("RESPONSE_TOO_LARGE");
  if (definition.dynamicDetail !== template.id) return;
  const $ = cheerio.load(html);
  $("script,style,nav,header,footer,noscript,iframe").remove();
  const root = $(template.root);
  const heading = clean($(template.title).text());
  const text = clean(root.text());
  const headings = root
    .find("h1,h2,h3,h4")
    .map((_, el) => clean($(el).text()))
    .get();
  if (
    (template.root.includes("main") && $("main").length !== 1) ||
    root.length !== 1 ||
    $(template.title).length !== 1 ||
    !/scholarship/i.test(heading) ||
    heading.length > 180 ||
    text.length < 200 ||
    text.length > 80000 ||
    !template.requiredHeadings.every((pattern) => headings.some((h) => pattern.test(h)))
  )
    return;
  const institution = text.match(template.institutionEvidence)?.[0];
  // Qualifications required for admission are not the degree being funded.
  const levelText =
    template.id === "csc-opportunity-1"
      ? clean(root.find(".entry-content p").first().text())
      : text;
  const levels = template.levels
    .map(({ level, pattern }) => ({ level, passage: levelText.match(pattern)?.[0] }))
    .filter((item) => item.passage);
  if (!institution || levels.length !== 1) return;
  const cycles = new Set<string>();
  for (const match of text.matchAll(
    /(?:academic year\s+)?(20\d{2})[/-](20\d{2}|\d{2})(?:\s+academic year)?/gi,
  )) {
    // A slash in a URL/date is not an academic cycle statement.
    if (!/academic year/i.test(match[0])) continue;
    const end = match[2].length === 2 ? Number(match[1].slice(0, 2) + match[2]) : Number(match[2]);
    if (end !== Number(match[1]) + 1) return;
    cycles.add(`${match[1]}/${match[2]}`);
  }
  for (const match of text.matchAll(/Class of (20\d{2})/g)) cycles.add(match[1]);
  if (cycles.size > 1) return;
  // Mixed prior/current application calls cannot inherit one another's dates.
  const applicationYears = new Set(
    [...text.matchAll(/Applications for (20\d{2})/gi)].map((m) => m[1]),
  );
  if (applicationYears.size > 1) return;
  const academicCycle = [...cycles][0];
  const title = template.id === "mandela-rhodes-1" ? "The Mandela Rhodes Scholarship" : heading;
  const metadata = extractStructuredMetadata(html, url);
  if (metadata.opportunities.some((item) => clean(item.name).toLowerCase() !== title.toLowerCase()))
    return;
  const paragraphs = root
    .find("p,li")
    .map((_, el) => clean($(el).text()))
    .get()
    .filter((p) => p.length >= 20 && p.length <= 1400);
  const summary = paragraphs.find((p) => /scholarship/i.test(p) && p.length < 1000);
  if (!summary) return;
  const passages: Record<string, string> = {
    title: heading,
    institution,
    destination: institution,
    levels: levels[0].passage!,
  };
  const fundingPassage = paragraphs.find(
    (passage) => /tuition|stipend|allowance/i.test(passage) && passage.length <= 250,
  );
  if (fundingPassage) passages.funding = fundingPassage;
  // Preserve prose rather than pretending that unencoded conditions are rules.
  const facts: Record<string, string> = { contentHash: semanticHash(text) };
  if (metadata.opportunities.length)
    facts.structuredMetadata = JSON.stringify(metadata.opportunities).slice(0, 8000);
  for (let start = 0; start < text.length; start += 8000)
    facts[`officialText${start / 8000 + 1}`] = text.slice(start, start + 8000);
  const cyclePassage = academicCycle
    ? [
        ...text.matchAll(
          /(?:academic year\s+)?20\d{2}[/-](?:20\d{2}|\d{2})\s+academic year|academic year\s+20\d{2}[/-](?:20\d{2}|\d{2})|Class of 20\d{2}/gi,
        ),
      ][0]?.[0]
    : undefined;
  if (academicCycle && !cyclePassage) return;
  if (cyclePassage) passages.cycle = cyclePassage;
  const evidence = Object.entries(passages).map(([field, passage]) => ({
    field,
    passage,
    url,
    state: "verified" as const,
    retrievedAt: new Date().toISOString(),
  }));
  for (const [index, passage] of paragraphs
    .filter((p) =>
      /tuition|stipend|allowance|eligible|must |apply|deadline|national|citizen|domicil|language|English|years of age/i.test(
        p,
      ),
    )
    .slice(0, 75)
    .entries()) {
    passages[`sourcePassage${index + 1}`] = passage;
    evidence.push({
      field: `sourcePassage${index + 1}`,
      passage,
      url,
      state: "verified",
      retrievedAt: new Date().toISOString(),
    });
  }
  const data = scholarshipDataSchema.parse({
    title,
    summary: `${summary} Confirm complete provider conditions before applying.`,
    destination: template.destination,
    institution: template.institution,
    studyLocations: {
      scope: "institution_dependent",
      countries: [template.country],
      institutions: [{ name: template.institution, countryCode: template.country }],
    },
    levels: levels.map((v) => v.level),
    fields: ["Fields require provider confirmation"],
    fundingType: "unknown",
    funding: fundingPassage
      ? [{ component: "other", coverage: "unspecified", description: fundingPassage }]
      : [],
    fundingSummary:
      fundingPassage || "Confirm funding components, limits and exclusions with the provider.",
    availability: "unknown",
    opensAt: null,
    deadline: null,
    deadlineLabel: null,
    deadlineState: "unknown",
    recordKind: academicCycle ? "cycle" : "overview",
    cycleStatus: academicCycle ? "confirmed" : "unconfirmed",
    officialUrl: url,
    applicationUrl: url,
    sourceFacts: facts,
    requirements: {
      kind: "all",
      id: "provider-conditions",
      label: "Official provider conditions",
      rules: [
        {
          kind: "requirement",
          id: "intended-level",
          label: "Intended study level",
          field: "targetLevel",
          op: "in",
          values: levels.map((v) => v.level),
          verified: true,
          evidenceKey: "levels",
        },
        {
          kind: "requirement",
          id: "provider-confirmation",
          label:
            "Confirm nationality, residence, academic, professional, age, language, nomination and other provider conditions in the official guidance.",
          field: "providerConfirmation",
          op: "confirmed",
          verified: false,
          evidenceKey: "requirements",
        },
      ],
    },
    evidence: [
      ...evidence,
      ...[...(fundingPassage ? [] : ["funding"]), "requirements", "availability", "deadline"].map(
        (field) => ({
          field,
          passage:
            "Complete conditions, funding classification and application window remain unconfirmed; consult the retained official passages.",
          url,
          state: "missing",
          retrievedAt: new Date().toISOString(),
        }),
      ),
    ],
  });
  const path = new URL(url).pathname.replace(/-?20\d{2}(?:[-/]\d{2,4})?/g, "").replace(/\/+$/, "");
  return {
    key: `${template.provider.key}-${path.split("/").filter(Boolean).slice(-2).join("-")}`,
    provider: template.provider,
    programme: title.replace(/\b20\d{2}(?:[-/]\d{2,4})?\b/g, "").trim(),
    url,
    cycle: academicCycle || "Scheme overview — cycle unconfirmed",
    cycleConfirmed: !!academicCycle,
    heading,
    passages,
    requirementsComplete: false,
    data,
    sections: [{ selector: template.root, hash: semanticHash(text) }],
  };
}

export const reviewedHtmlAdapter: OpportunityAdapter[] = templates.map((template) => ({
  id: template.id,
  media: ["html"],
  supports: (url) => url.hostname === template.host && template.path.test(url.pathname),
  extract: (definition, url, document) => extract(template, definition, url, document.text),
}));
