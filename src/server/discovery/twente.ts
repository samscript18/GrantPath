import * as cheerio from "cheerio";
import { scholarshipDataSchema } from "@/server/scholarships/schema";
import { semanticHash } from "@/server/scholarships/publish";
import type { DetailMapping, DirectoryDefinition } from "./types";
import { supportsCandidate } from "./candidates";

const normal = (value: string) => value.normalize("NFKC").replace(/\s+/g, " ").trim();
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Explicit university-managed award template. No external awards/loans, generic
// AI extraction, guessed application window, GPA conversion or complete eligibility.
export function twenteAward(
  definition: DirectoryDefinition,
  url: string,
  html: string,
): DetailMapping | undefined {
  if (definition.dynamicDetail !== "twente-award-1" || !supportsCandidate(definition, url)) return;
  const $ = cheerio.load(html);
  $("script,style,nav,header,footer,noscript").remove();
  const main = $("main.page-main");
  const content = main.find(".page-content").first();
  const title = normal(main.find("h1").text());
  const intro = normal(content.children("p").first().text());
  const text = normal(content.text());
  const section = (label: string) =>
    content
      .children("h2")
      .filter((_, el) => normal($(el).text()).toLowerCase() === label.toLowerCase());
  const valueHeading = section("Scholarship value");
  const dateHeading = section("Application deadline");
  const requirementsHeading = section("Application requirements");
  if (
    main.length !== 1 ||
    !content.length ||
    !title.toLowerCase().includes("scholarship") ||
    title.length > 180 ||
    intro.length < 20 ||
    !text.includes("University of Twente") ||
    valueHeading.length !== 1 ||
    dateHeading.length !== 1 ||
    requirementsHeading.length !== 1
  )
    return;
  const deadlineLabel = normal(dateHeading.nextUntil("h2").text());
  const date = deadlineLabel.match(
    /^(\d{1,2}) (January|February|March|April|May|June|July|August|September|October|November|December) (20\d{2})$/,
  );
  if (!date) return;
  const month = months.indexOf(date[2]);
  const check = new Date(Date.UTC(Number(date[3]), month, Number(date[1])));
  if (check.getUTCMonth() !== month || check.getUTCDate() !== Number(date[1])) return;
  const study = content.find(".grantfinder__scholarship__programmes .title").first();
  if (!/^Master['’]s programmes$/i.test(normal(study.text()))) return;
  const fields = [
    ...new Set(
      content
        .find(".programme__title")
        .map((_, el) => normal($(el).text()))
        .get(),
    ),
  ];
  if (
    fields.length < 1 ||
    fields.length > 30 ||
    fields.some((field) => field.length < 2 || field.length > 100)
  )
    return;
  const benefits = valueHeading.nextUntil("h2").not(".grantfinder__scholarship__programmes");
  const fundingPassage = normal(
    benefits.filter("ul").first().find("li").first().text() || benefits.filter("p").first().text(),
  );
  if (!fundingPassage || fundingPassage.length > 250 || !/€\s*[\d,.]+/.test(fundingPassage)) return;
  const conditions = normal(requirementsHeading.nextUntil("h2").text());
  if (conditions.length < 30 || conditions.length > 8000) return;
  // A deadline is not an intake identity. Unconfirmed schemes retain one stable
  // overview, so changing a closing date cannot create a duplicate programme.
  const academicCycles = [
    ...new Set(
      [...text.matchAll(/academic year\s+(20\d{2})\/(20\d{2})/gi)].map((m) => `${m[1]}/${m[2]}`),
    ),
  ];
  if (academicCycles.length > 1) return;
  const academicCycle = academicCycles[0];
  if (academicCycle && Number(academicCycle.slice(5)) !== Number(academicCycle.slice(0, 4)) + 1)
    return;
  const cycle = academicCycle || "Scheme overview — cycle unconfirmed";
  const passages = {
    title,
    destination: "University of Twente",
    institution: "University of Twente",
    levels: normal(study.text()),
    funding: fundingPassage,
    deadline: deadlineLabel,
    ...(academicCycle ? { cycle: academicCycle } : {}),
    requirements: conditions.slice(0, 1200),
  };
  const evidence = Object.entries(passages).map(([field, passage]) => ({
    field,
    passage,
    url,
    state: "verified" as const,
    retrievedAt: new Date().toISOString(),
  }));
  const data = scholarshipDataSchema.parse({
    title,
    summary: `${intro.slice(0, 950)} Provider-specific conditions and nomination requirements must be confirmed before applying.`,
    destination: "Netherlands",
    institution: "University of Twente",
    studyLocations: {
      scope: "single",
      countries: ["NL"],
      institutions: [{ name: "University of Twente", countryCode: "NL" }],
    },
    levels: ["master"],
    fields,
    recordKind: academicCycle ? "cycle" : "overview",
    cycleStatus: academicCycle ? "confirmed" : "unconfirmed",
    fundingType: text.includes(
      "This scholarship is meant as a compensation for study related costs",
    )
      ? "partial"
      : "unknown",
    funding: [{ component: "other", coverage: "unspecified", description: fundingPassage }],
    fundingSummary:
      `${fundingPassage} Confirm conditions and whether other funding is required.`.slice(0, 300),
    availability: "unknown",
    opensAt: null,
    deadline: null,
    deadlineLabel: academicCycle
      ? deadlineLabel
      : `${deadlineLabel}; application cycle and closing time need confirmation.`,
    deadlineState: academicCycle ? "date_only" : "unknown",
    sourceFacts: { conditions, pageContentHash: semanticHash(text) },
    officialUrl: url,
    applicationUrl: url,
    requirements: {
      kind: "all",
      id: "official-requirements",
      label: "Provider conditions",
      rules: [
        {
          kind: "requirement",
          id: "target-level",
          label: "Intended study level",
          field: "targetLevel",
          op: "in",
          values: ["master"],
          verified: true,
          evidenceKey: "levels",
        },
        {
          kind: "requirement",
          id: "provider-conditions",
          label:
            "Confirm the official citizenship, prior award, nomination, academic and programme conditions; these are not fully mapped.",
          field: "providerConfirmation",
          op: "confirmed",
          verified: false,
          evidenceKey: "requirements",
        },
      ],
    },
    evidence: [
      ...evidence,
      {
        field: "availability",
        passage:
          "A closing date alone does not establish whether applications or nominations are open. Confirm the current window and procedure with the university.",
        url,
        state: "missing",
        retrievedAt: new Date().toISOString(),
      },
    ],
  });
  return {
    key: `twente-${new URL(url).pathname.split("/").filter(Boolean).at(-1)}`,
    provider: {
      key: "twente",
      name: "University of Twente",
      url: "https://www.utwente.nl",
      countryCode: "NL",
    },
    programme: title,
    url,
    cycle,
    cycleConfirmed: !!academicCycle,
    heading: title,
    requirementsComplete: false,
    passages,
    data,
    // Added/removed conditions are preserved in the content hash and policy review.
    sections: [{ selector: "main.page-main .page-content", hash: semanticHash(text) }],
  };
}
