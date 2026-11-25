import * as cheerio from "cheerio";
import type { OpportunityAdapter } from "./adapter-registry";
import type { DirectoryDefinition, DetailMapping } from "./types";
import { scholarshipDataSchema, type ScholarshipData } from "@/server/scholarships/schema";
import { semanticHash } from "@/server/scholarships/publish";
import { extractStructuredMetadata } from "./structured-metadata";
import { interpretApplicationWindow, parseOfficialDate } from "./application-windows";
const clean = (value: string) => value.normalize("NFKC").replace(/\s+/g, " ").trim();
// JASSO sometimes indexes an entry route, degree band or funding component
// separately under the same provider/programme name. These need identity review.
export const jassoProgrammeName = (title: string) =>
  clean(
    title
      .replace(/\s*\[Pre-Arrival Admission\]\s*/gi, " ")
      .replace(/\s*\(Undergraduate\)\s*$/i, ""),
  ).toLowerCase();
export type FundingProfile = {
  id: string;
  host: string;
  path: RegExp;
  root: string;
  title: string;
  provider: DetailMapping["provider"];
  country: string;
  destination: string;
  levelLabel: string;
  valueLabel: string;
  cycleLabel?: string;
  requiredHeadings: string[];
  preserveHeaders?: string;
};
export const fundingProfiles: FundingProfile[] = [
  {
    id: "usask-funding-cms-1",
    host: "grad.usask.ca",
    path: /^\/funding\/award-search\.php$/,
    root: "#results",
    title: "#award-title",
    provider: {
      key: "saskatchewan",
      name: "University of Saskatchewan",
      url: "https://www.usask.ca",
      countryCode: "CA",
    },
    country: "CA",
    destination: "Canada",
    levelLabel: "Eligibility",
    valueLabel: "Value",
    requiredHeadings: [],
  },
  {
    id: "ubc-funding-cms-1",
    host: "www.grad.ubc.ca",
    path: /^\/awards\/(?!department-awards$|.*guidelines$|.*travel)[a-z0-9-]+$/,
    root: "body",
    title: "h1.page-title",
    preserveHeaders: "header.container",
    provider: {
      key: "ubc",
      name: "The University of British Columbia",
      url: "https://www.ubc.ca",
      countryCode: "CA",
    },
    country: "CA",
    destination: "Canada",
    levelLabel: "Degree Level",
    valueLabel: "Value",
    requiredHeadings: ["Eligibility", "Application Procedures"],
  },
  {
    id: "leeds-funding-cms-1",
    host: "www.leeds.ac.uk",
    path: /^\/scholarship\/\d+\/[a-z0-9-]+$/,
    root: ".uol-course",
    title: "h1.page-heading__title",
    preserveHeaders: "header.page-heading",
    provider: {
      key: "leeds",
      name: "University of Leeds",
      url: "https://www.leeds.ac.uk",
      countryCode: "GB",
    },
    country: "GB",
    destination: "United Kingdom",
    levelLabel: "Study level",
    valueLabel: "Value",
    requiredHeadings: ["Eligibility", "How to apply"],
  },
  {
    id: "jasso-scholarship-cms-1",
    host: "www.studyinjapan.go.jp",
    path: /^\/en\/search-for-scholarships\/detail\.php$/,
    root: "main",
    title: "main h1.mainTitle",
    provider: {
      key: "jasso-directory",
      name: "Study in Japan",
      url: "https://www.studyinjapan.go.jp",
      countryCode: "JP",
    },
    country: "JP",
    destination: "Japan",
    levelLabel: "Academic level",
    valueLabel: "Amount of scholarship (yen)",
    requiredHeadings: ["Basic information", "About recruitment"],
  },
  {
    id: "uq-funding-cms-1",
    host: "scholarships.uq.edu.au",
    path: /^\/scholarship\/(?!.*(?:prize|exchange|travel-grant))[a-zA-Z0-9%_-]+$/,
    root: "main",
    title: "main h1",
    provider: {
      key: "queensland",
      name: "The University of Queensland",
      url: "https://www.uq.edu.au",
      countryCode: "AU",
    },
    country: "AU",
    destination: "Australia",
    levelLabel: "Study level",
    valueLabel: "Scholarship value",
    requiredHeadings: ["Eligibility", "How to apply"],
  },
  {
    id: "auckland-funding-cms-1",
    host: "www.auckland.ac.nz",
    path: /^\/en\/study\/scholarships-and-awards\/find-a-scholarship\/(?!.*(?:prize|study-abroad|exchange|travel))[a-z0-9-]+\.html$/,
    root: "main",
    title: "h1[data-page-title]",
    provider: {
      key: "auckland",
      name: "University of Auckland",
      url: "https://www.auckland.ac.nz",
      countryCode: "NZ",
    },
    country: "NZ",
    destination: "New Zealand",
    levelLabel: "Applicable study",
    valueLabel: "Value",
    requiredHeadings: ["About the scholarship", "Regulations", "How to apply"],
  },
  {
    id: "cambridge-funding-cms-1",
    host: "www.student-funding.cam.ac.uk",
    path: /^\/fund\/[a-z0-9-]+$/,
    root: "#details",
    title: "h1.fdt-fund",
    provider: {
      key: "cambridge",
      name: "University of Cambridge",
      url: "https://www.cam.ac.uk",
      countryCode: "GB",
    },
    country: "GB",
    destination: "United Kingdom",
    levelLabel: "Level of study",
    valueLabel: "Award value",
    cycleLabel: "Award year",
    requiredHeadings: ["About", "Eligibility", "Application Process", "Key dates"],
  },
  {
    id: "imperial-funding-cms-1",
    host: "www.imperial.ac.uk",
    path: /^\/study\/fees-and-funding\/scholarships-search\/[a-z0-9-]+\.php$/,
    root: "main#page",
    title: "main h1",
    provider: {
      key: "imperial",
      name: "Imperial College London",
      url: "https://www.imperial.ac.uk",
      countryCode: "GB",
    },
    country: "GB",
    destination: "United Kingdom",
    levelLabel: "Degree level",
    valueLabel: "Value",
    cycleLabel: "Academic year",
    requiredHeadings: ["Scholarship overview", "Eligibility criteria", "Application process"],
  },
  {
    id: "anu-funding-cms-1",
    host: "study.anu.edu.au",
    path: /^\/scholarships\/find-scholarship\/(?!.*(?:travel|prize|exchange))[a-z0-9-]+$/,
    root: "main",
    title: "main h1",
    provider: {
      key: "anu",
      name: "Australian National University",
      url: "https://www.anu.edu.au",
      countryCode: "AU",
    },
    country: "AU",
    destination: "Australia",
    levelLabel: "Study level",
    valueLabel: "Value",
    requiredHeadings: ["Overview", "Eligibility", "How to apply"],
  },
];

export function fundingProgrammeKey(profile: FundingProfile, raw: string) {
  const url = new URL(raw);
  // Only these two CMSs put the year of the award in the route. Numeric
  // Auckland award identifiers are never removed or used as cycle evidence.
  const route = ["imperial-funding-cms-1", "cambridge-funding-cms-1"].includes(profile.id)
    ? url.pathname.replace(/-20\d{2}(?:20\d{2})?(?=\.php$|$)/, "")
    : url.pathname;
  return `${profile.provider.key}-${semanticHash(route + (["jasso-scholarship-cms-1", "usask-funding-cms-1"].includes(profile.id) ? url.search : "")).slice(0, 24)}`;
}

function labelValues(
  $: cheerio.CheerioAPI,
  root: cheerio.Cheerio<import("domhandler").AnyNode>,
  label: string,
) {
  const values: string[] = [];
  root.find("dt").each((_, el) => {
    if (clean($(el).text()).replace(/:$/, "").toLowerCase() === label.toLowerCase())
      values.push(clean($(el).next("dd").text()));
  });
  root.find("th").each((_, el) => {
    if (clean($(el).text()).replace(/:$/, "").toLowerCase() === label.toLowerCase())
      values.push(clean($(el).siblings("td").text()));
  });
  root.find(".lbl").each((_, el) => {
    if (clean($(el).text()).toLowerCase() === label.toLowerCase())
      values.push(clean($(el).siblings(".val").text()));
  });
  root.find("h3,h4").each((_, el) => {
    if (clean($(el).text()).toLowerCase() !== label.toLowerCase()) return;
    const next = $(el).next("p");
    if (next.length) values.push(clean(next.text()));
    else if ($(el).parent().is("td")) values.push(clean($(el).parent().next("td").text()));
    else if ($(el).parent().hasClass("field-content")) {
      const block = $(el).parent().clone();
      block.find("h3,h4").remove();
      values.push(clean(block.text()));
    }
  });
  const attribute = (
    { "Applicable study": "applicable-study", Value: "value" } as Record<string, string>
  )[label];
  if (attribute)
    root.find(`[data-scholarship-${attribute}]`).each((_, el) => {
      values.push(clean($(el).text()));
    });
  return [
    ...new Map(
      values.filter(Boolean).map((value) => [value.toLowerCase().replace(/[\s,]+/g, ""), value]),
    ).values(),
  ];
}

function paragraphsForPurpose(
  $: cheerio.CheerioAPI,
  root: cheerio.Cheerio<import("domhandler").AnyNode>,
) {
  return root
    .find("p,li")
    .map((_, el) => clean($(el).text()))
    .get()
    .filter((p) => p.length >= 20 && p.length <= 1400);
}
export function fundingLayoutReasons(definition: DirectoryDefinition, html: string): string[] {
  const profile = fundingProfiles.find((p) => p.id === definition.dynamicDetail);
  if (!profile) return [];
  const $ = cheerio.load(html);
  $("script,style,nav,footer,noscript,iframe").remove();
  (profile.preserveHeaders ? $("header").not(profile.preserveHeaders) : $("header")).remove();
  const root = $(profile.root);
  if (root.length !== 1) return ["DETAIL_ROOT_UNSUPPORTED"];
  if ($(profile.title).length !== 1 || clean($(profile.title).text()).length < 4)
    return ["PROGRAMME_TITLE_UNCONFIRMED"];
  const headings = root
    .find("h1,h2,h3,h4")
    .map((_, e) => clean($(e).text()).toLowerCase())
    .get();
  if (!profile.requiredHeadings.every((h) => headings.includes(h.toLowerCase())))
    return ["REQUIRED_AWARD_SECTION_MISSING"];
  const levels = labelValues($, root, profile.levelLabel);
  if (levels.length !== 1) return ["DEGREE_FIELD_MISSING_OR_CONFLICTING"];
  if (
    profile.cycleLabel &&
    labelValues($, root, profile.cycleLabel).some((v) => !/^20\d{2}\/\d{2,4}$/.test(v))
  )
    return ["APPLICATION_CYCLE_AMBIGUOUS"];
  if (!/bachelor|master|MSc|MPhil|\bMBA\b|doctor|PhD|DPhil/i.test(levels[0]))
    return ["FUNDED_DEGREE_UNCONFIRMED"];
  return ["AWARD_FIELD_SEMANTICS_REQUIRE_REVIEW"];
}
export function extractUniversityFunding(
  profile: FundingProfile,
  definition: DirectoryDefinition,
  url: string,
  html: string,
): DetailMapping | undefined {
  if (definition.dynamicDetail !== profile.id || !profile.path.test(new URL(url).pathname)) return;
  if (Buffer.byteLength(html) > 2_000_000) throw new Error("RESPONSE_TOO_LARGE");
  const $ = cheerio.load(html);
  $("script,style,nav,footer,noscript,iframe").remove();
  (profile.preserveHeaders ? $("header").not(profile.preserveHeaders) : $("header")).remove();
  const root = $(profile.root);
  if (profile.id === "jasso-scholarship-cms-1") {
    const providerName = clean(root.find(".school-name").text());
    if (
      providerName.length < 3 ||
      providerName.length > 150 ||
      !new URL(url).searchParams.get("mid")
    )
      return;
    profile = {
      ...profile,
      provider: {
        key: `japan-${semanticHash(providerName).slice(0, 24)}`,
        name: providerName,
        url,
        countryCode: "JP",
      },
    };
  }
  const title = clean($(profile.title).text());
  if (
    profile.id === "ubc-funding-cms-1" &&
    !/\bUBC\b|University of British Columbia/.test(
      clean(root.find(".views-field-field-summary").text()),
    )
  )
    return;
  const metadata = extractStructuredMetadata(html, url);
  if (metadata.opportunities.some((item) => clean(item.name).toLowerCase() !== title.toLowerCase()))
    return;
  if (
    root.length !== 1 ||
    $(profile.title).length !== 1 ||
    title.length < 4 ||
    title.length > 180 ||
    /\bprize\b|\bpost[ -]?doctoral\b/i.test(title)
  )
    return;
  const headings = root
    .find("h1,h2,h3,h4")
    .map((_, el) => clean($(el).text()).toLowerCase())
    .get();
  if (!profile.requiredHeadings.every((heading) => headings.includes(heading.toLowerCase())))
    return;
  // Remove unrelated course search results, related awards, contact/support and
  // rotating widgets before hashing the actual award's stable evidence.
  if (profile.id === "cambridge-funding-cms-1") root.find(".related-courses").remove();
  if (profile.id === "ubc-funding-cms-1")
    root.find(".block-views-blockgps-awards-block-7,.block-views-blockgps-awards-block-6").remove();
  const text = clean(root.text());
  if (text.length < 200 || text.length > 80000) return;
  // Student degree labels can describe the audience of a faculty project grant.
  // They do not establish a scholarship payable to an individual student.
  if (
    profile.id === "ubc-funding-cms-1" &&
    /lead applicant must be a UBC[^.]{0,30}faculty member|provides.{0,40}to enable UBC faculty to host/i.test(
      text,
    )
  )
    return;
  const levelValues = labelValues($, root, profile.levelLabel);
  if (levelValues.length !== 1) return;
  const levelText = levelValues[0];
  if (
    profile.id === "usask-funding-cms-1" &&
    (!labelValues($, root, "Apply").length ||
      !/\b(?:enrolled|registered|pursuing|entering|undertaking|in a|in the|open to)\b.{0,100}(?:master|doctoral|PhD|M\.Ed\.|M\.C\.Ed\.)/i.test(
        levelText,
      ) ||
      /bachelor|previous|completed|already hold|must hold/i.test(levelText))
  )
    return;
  let courseLevelEvidence: string | undefined;
  const levels: ScholarshipData["levels"] = [];
  if (
    /bachelor|\b(?:BA|BSc|BCom|BProp|BE|LLB|BNurs|BHSc|BFA|BMus|BEd|BEng|BPharm|BOptom|BDes|BSportHPE)\b/i.test(
      levelText,
    ) ||
    (/undergraduate/i.test(levelText) && !/diploma|certificate/i.test(levelText))
  )
    levels.push("bachelor");
  if (
    /\bmaster|MPhil|MSc|M\.Ed\.|M\.C\.Ed\.|\bMA\b|\bMCom|\bMBA\b|\bLLM\b|\bME\b|\bMPH\b/i.test(
      levelText,
    )
  )
    levels.push("master");
  if (/doctor|PhD|DPhil|DMedSc|DClinPsy|DocFA|\bEdD\b|DHSc/i.test(levelText))
    levels.push("doctorate");
  if (/postgraduate/i.test(levelText) && !/certificate|diploma/i.test(levelText)) {
    if (/\bmasters?\b/i.test(title) && !levels.includes("master")) {
      levels.push("master");
      courseLevelEvidence = title;
    }
    if (/\bPhD\b|doctoral/i.test(title) && !levels.includes("doctorate")) {
      levels.push("doctorate");
      courseLevelEvidence = title;
    }
  }
  if (profile.id === "imperial-funding-cms-1" && /postgraduate taught/i.test(levelText)) {
    const course = clean(
      root
        .find("h2,h3")
        .filter((_, el) => clean($(el).text()).toLowerCase() === "course specific information")
        .nextUntil("h2,h3")
        .text(),
    );
    if (
      course.length <= 1400 &&
      !/exclu|except|not eligib|does not/i.test(course) &&
      /\bMSc\b|\bMBA\b|\bMRes\b|Master of/i.test(course) &&
      !levels.includes("master")
    ) {
      levels.push("master");
      courseLevelEvidence = course;
    }
  }
  // Use only an explicitly named funded course, never the applicant's previous
  // qualification. These CMS fields can say only "Postgraduate" or "Honours".
  if (
    ["leeds-funding-cms-1", "auckland-funding-cms-1"].includes(profile.id) &&
    /postgraduate/i.test(levelText)
  ) {
    const purpose = paragraphsForPurpose($, root);
    const passage = purpose.find(
      (p) =>
        /(?:offer for|studying|enrolled|taught|study|applicants).{0,100}(?:\bMasters?\b|\bMSc\b|\bMA\b|\bMBA\b)|(?:\bMasters?\b|\bMSc\b|\bMBA\b).{0,70}(?:course|programme|degree)/i.test(
          p,
        ) && !/not eligible|exclud|previous|already hold|completed/i.test(p),
    );
    if (passage && !levels.includes("master")) {
      levels.push("master");
      courseLevelEvidence = passage;
    }
  }
  if (profile.id === "uq-funding-cms-1" && /^honours$/i.test(levelText)) {
    const passage = paragraphsForPurpose($, root).find(
      (p) =>
        /(?:enrolled|enrol|commencing).{0,140}Bachelor.{0,100}Honours/i.test(p) &&
        !/completed the requirements|completed a bachelor/i.test(p),
    );
    if (passage && !levels.includes("bachelor")) {
      levels.push("bachelor");
      courseLevelEvidence = passage;
    }
  }
  // Broad HDR/coursework categories are not individual degree qualifications.
  if (profile.id === "uq-funding-cms-1" && /research|coursework/i.test(levelText)) {
    const about = root
      .find("h2")
      .filter((_, el) => clean($(el).text()).toLowerCase() === "about this scholarship")
      .nextUntil("h2")
      .text();
    if (
      /Master of Philosophy|\bMPhil\b|\bmaster['’]?s?\b/i.test(about) &&
      !levels.includes("master")
    )
      levels.push("master");
    if (/Doctor of Philosophy|\bPhD\b|doctorate/i.test(about) && !levels.includes("doctorate"))
      levels.push("doctorate");
  }
  if (!levels.length) return;
  const cycleValues = profile.cycleLabel ? labelValues($, root, profile.cycleLabel) : [];
  if (cycleValues.length > 1) return;
  const academicCycle = cycleValues[0];
  if (academicCycle) {
    const cycle = academicCycle.match(/^(20\d{2})\/(20\d{2}|\d{2})$/);
    if (
      !cycle ||
      Number(cycle[2].length === 2 ? cycle[1].slice(0, 2) + cycle[2] : cycle[2]) !==
        Number(cycle[1]) + 1
    )
      return;
  }
  const roundOpening =
    profile.id === "auckland-funding-cms-1"
      ? clean(root.find("[data-scholarship-opening-date]").text())
      : profile.id === "uq-funding-cms-1"
        ? labelValues($, root, "Applications open")[0]
        : undefined;
  const roundClosing =
    profile.id === "auckland-funding-cms-1"
      ? clean(root.find("[data-scholarship-closing-date]").text())
      : profile.id === "uq-funding-cms-1"
        ? labelValues($, root, "Applications close")[0]
        : undefined;
  const roundStatus =
    profile.id === "auckland-funding-cms-1"
      ? clean(root.find("[data-scholarship-application-status]").text())
      : undefined;
  const opensOn = roundOpening && parseOfficialDate(roundOpening),
    closesOn = roundClosing && parseOfficialDate(roundClosing);
  let roundEvidence: string | undefined;
  if (definition.discoverApplicationRounds && opensOn && closesOn && opensOn < closesOn) {
    const start = text.indexOf(roundOpening!),
      end = text.indexOf(roundClosing!, start + roundOpening!.length);
    if (start >= 0 && end > start && end - start < 500)
      roundEvidence = text.slice(start, end + roundClosing!.length);
    const window = interpretApplicationWindow(
      { opening: roundOpening, closing: roundClosing },
      true,
    );
    if (
      (window.availability === "open" && /not currently open|closed/i.test(roundStatus || "")) ||
      (window.availability === "upcoming" && /^Apply now$/i.test(roundStatus || ""))
    )
      return;
  }
  const applicationRound =
    !academicCycle && roundEvidence ? `Application round ${opensOn} to ${closesOn}` : undefined;
  const cycleConfirmed = !!(academicCycle || applicationRound);
  const institutionPassage = (text + " " + clean($("title").text())).includes(profile.provider.name)
    ? profile.provider.name
    : profile.id === "uq-funding-cms-1"
      ? text.match(/(?:at UQ|UQ student|UQ scholarships)/)?.[0]
      : profile.id === "cambridge-funding-cms-1"
        ? clean(root.find(".fdt-funder").text())
        : profile.id === "imperial-funding-cms-1"
          ? text.match(/Imperial/)?.[0]
          : undefined;
  if (!institutionPassage || institutionPassage.length < 3) return;
  const paragraphs = root
    .find("p,li")
    .map((_, el) => clean($(el).text()))
    .get()
    .filter((p) => p.length >= 20 && p.length <= 1400);
  const intro =
    paragraphs.find(
      (p) => /scholarship|studentship|award|bursary|fund/i.test(p) && p.length <= 900,
    ) || `${title}. Official award guidance from ${profile.provider.name}.`;
  const value = labelValues($, root, profile.valueLabel)[0];
  const passages: Record<string, string> = {
    title,
    institution: institutionPassage,
    destination: institutionPassage,
    levels: levelText,
    ...(academicCycle ? { cycle: academicCycle } : {}),
    ...(applicationRound ? { cycle: roundEvidence! } : {}),
  };
  if (value && value.length >= 3 && value.length <= 1400) passages.funding = value;
  for (const [index, passage] of paragraphs
    .filter((p) =>
      /eligible|must|citizen|residen|domicil|fee|fund|scholarship|award|apply|national|language|age|admission/i.test(
        p,
      ),
    )
    .slice(0, 50)
    .entries())
    passages[`conditions${index + 1}`] = passage;
  // Preserve restriction labels even when conditions live in a PDF or cannot
  // yet be safely mapped to executable eligibility predicates.
  const facts: Record<string, string> = {
    contentHash: semanticHash(text),
    levelWording: levelText,
  };
  for (const label of [
    "Student type",
    "Fee status",
    "Tuition fee status",
    "Nationality",
    "Country of residence",
    "Department / School",
    "Field of study",
  ]) {
    const values = labelValues($, root, label);
    if (values.length) facts[label] = values.join(" | ").slice(0, 8000);
  }
  for (let start = 0; start < text.length; start += 8000)
    facts[`officialText${start / 8000 + 1}`] = text.slice(start, start + 8000);
  const documents = root
    .find('a[href$=".pdf"],a[href*=".pdf?"]')
    .map((_, el) => {
      try {
        const link = new URL($(el).attr("href")!, url);
        return link.protocol === "https:"
          ? { title: clean($(el).text()), url: link.href }
          : undefined;
      } catch {
        return undefined;
      }
    })
    .get()
    .filter(Boolean)
    .slice(0, 15);
  if (documents.length) facts.supportingDocuments = JSON.stringify(documents).slice(0, 8000);
  const fields = labelValues($, root, "Study area")[0];
  const institutionName =
    profile.id === "jasso-scholarship-cms-1" &&
    !/university|college|institute|school/i.test(profile.provider.name)
      ? `Institutions designated by ${profile.provider.name}`
      : profile.provider.name;
  const data = scholarshipDataSchema.parse({
    title,
    summary: `${intro} Complete eligibility, funding exclusions and current application procedure require provider confirmation.`,
    institution: institutionName,
    destination: profile.destination,
    studyLocations: {
      scope: "single",
      countries: [profile.country],
      institutions: [{ name: institutionName, countryCode: profile.country }],
    },
    levels,
    fields: fields && fields.length <= 100 ? [fields] : ["Fields require provider confirmation"],
    fundingType: "unknown",
    funding:
      value && value.length >= 3 && value.length <= 250
        ? [{ component: "other", coverage: "unspecified", description: value }]
        : [],
    fundingSummary:
      value && value.length >= 3 && value.length <= 300
        ? value
        : "Confirm award value, funding components and exclusions with the provider.",
    availability: "unknown",
    opensAt: null,
    deadline: null,
    deadlineState: "unknown",
    deadlineLabel: null,
    recordKind: cycleConfirmed ? "cycle" : "overview",
    cycleStatus: cycleConfirmed ? "confirmed" : "unconfirmed",
    ...(applicationRound
      ? {
          cycleBasis: "application_round",
          programmeUrl: url,
        }
      : {}),
    officialUrl: url,
    applicationUrl: url,
    sourceFacts: facts,
    requirements: {
      kind: "all",
      id: "official-conditions",
      label: "Official award conditions",
      rules: [
        {
          kind: "requirement",
          id: "funded-level",
          label: "Supported study level",
          field: "targetLevel",
          op: "in",
          values: levels,
          verified: true,
          evidenceKey: "levels",
        },
        {
          kind: "requirement",
          id: "provider-confirmation",
          label:
            "Confirm the retained nationality, residence, fee status, subject, admission, academic, language and award-specific restrictions, including linked regulations. This is not a statement of eligibility.",
          field: "providerConfirmation",
          op: "confirmed",
          verified: false,
          evidenceKey: "requirements",
        },
      ],
    },
    evidence: [
      ...(courseLevelEvidence
        ? [
            {
              field: "levels",
              passage: courseLevelEvidence,
              url,
              state: "verified",
              retrievedAt: new Date().toISOString(),
            },
          ]
        : []),
      ...Object.entries(passages).map(([field, passage]) => ({
        field,
        passage,
        url,
        state: "verified",
        retrievedAt: new Date().toISOString(),
      })),
      ...[...(passages.funding ? [] : ["funding"]), "requirements", "availability", "deadline"].map(
        (field) => ({
          field,
          passage:
            "This adapter does not establish complete conditions, complete funding coverage or a current application window. Consult the retained official guidance and linked regulations.",
          url,
          state: "missing",
          retrievedAt: new Date().toISOString(),
        }),
      ),
    ],
  });
  return {
    key: fundingProgrammeKey(profile, url),
    provider: profile.provider,
    programme: title,
    url,
    cycle: academicCycle || applicationRound || "Scheme overview — cycle unconfirmed",
    cycleConfirmed,
    heading: title,
    requirementsComplete: false,
    data,
    passages,
    ...(applicationRound
      ? { applicationWindow: { opening: roundOpening, closing: roundClosing } }
      : {}),
    ...(profile.id === "imperial-funding-cms-1" || profile.id === "cambridge-funding-cms-1"
      ? {
          applicationWindow: {
            closing: labelValues($, root, "Application deadline")[0],
            dayFirst: profile.id === "imperial-funding-cms-1",
          },
        }
      : profile.id === "auckland-funding-cms-1"
        ? {
            applicationWindow: {
              opening: clean(root.find("[data-scholarship-opening-date]").text()),
              closing: clean(root.find("[data-scholarship-closing-date]").text()),
            },
          }
        : {}),
    ...(profile.id === "imperial-funding-cms-1"
      ? { reviewedCanonicalFallback: "https://www.imperial.ac.uk/" }
      : profile.id === "usask-funding-cms-1"
        ? { reviewedCanonicalFallback: "https://grad.usask.ca/funding/award-search.php" }
        : {}),
    sections: [{ selector: profile.root, hash: semanticHash(text) }],
    ...(profile.preserveHeaders
      ? { preserveHeaders: profile.preserveHeaders, contentSelector: profile.root }
      : {}),
  };
}

export const universityFundingAdapters: OpportunityAdapter[] = fundingProfiles.map((profile) => ({
  id: profile.id,
  media: ["html"],
  supports: (url) => url.hostname === profile.host && profile.path.test(url.pathname),
  extract: (definition, url, document) =>
    extractUniversityFunding(profile, definition, url, document.text),
}));
