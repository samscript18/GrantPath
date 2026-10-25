import sourceRetrievals from "../../docs/evidence/global-source-retrievals.json" with { type: "json" };
import type { DirectoryDefinition, DetailMapping } from "@/server/discovery/types";
import type { ScholarshipData } from "@/server/scholarships/schema";
import { countryName } from "@/lib/countries";
// Reviewed mappings are semantic contracts, not mock source responses. Live extraction
// must find these official passages before any automatic publication can succeed.
const reviewedAt = sourceRetrievals.recordedAt;
const retrievalTime = (url: string) =>
  sourceRetrievals.observations.find((o) => o.url === url && "retrievedAt" in o)?.retrievedAt ||
  reviewedAt;
type MappingInput = {
  key: string;
  provider: string;
  providerKey: string;
  providerUrl: string;
  providerCountry?: string;
  programme: string;
  url: string;
  heading: string;
  countries: string[];
  institutions: { name: string; countryCode: string }[];
  levels: ScholarshipData["levels"];
  summary: string;
  passages: Record<string, string>;
  cycle?: string;
  scope?: NonNullable<ScholarshipData["studyLocations"]>["scope"];
  fields?: string[];
  overrides?: Partial<ScholarshipData>;
  evidenceUrls?: Record<string, string>;
  supportPages?: string[];
};
function overview(v: MappingInput): DetailMapping {
  const evidence: ScholarshipData["evidence"] = Object.entries(v.passages).map(
    ([field, passage]) => ({
      field,
      passage,
      url: v.evidenceUrls?.[field] || v.url,
      state: "verified" as const,
      retrievedAt: retrievalTime(v.evidenceUrls?.[field] || v.url),
    }),
  );
  for (const field of ["funding", "availability", "requirements"])
    if (!evidence.some((e) => e.field === field))
      evidence.push({
        field,
        passage:
          "This page does not establish the current application cycle or complete funding package.",
        url: v.url,
        state: "missing",
        retrievedAt: reviewedAt,
      });
  return {
    key: v.key,
    provider: {
      key: v.providerKey,
      name: v.provider,
      url: v.providerUrl,
      countryCode: v.providerCountry,
    },
    programme: v.programme,
    url: v.url,
    cycle: v.cycle || "Scheme overview — cycle unconfirmed",
    cycleConfirmed: !!v.cycle,
    heading: v.heading,
    requirementsComplete: false,
    passages: v.passages,
    supportPages: v.supportPages,
    data: {
      title: v.programme,
      summary: v.summary,
      destination: v.countries.map((code) => countryName(code)).join(" · "),
      studyLocations: {
        scope: v.scope || (v.countries.length === 1 ? "single" : "participating"),
        countries: v.countries,
        institutions: v.institutions,
      },
      institution: v.institutions
        .map((i) => i.name)
        .join("; ")
        .slice(0, 160),
      levels: v.levels,
      fields: v.fields || ["Provider-approved fields"],
      fundingType: "unknown",
      funding: [],
      fundingSummary: "Confirm funding components and exclusions with the provider.",
      availability: "unknown",
      opensAt: null,
      deadline: null,
      deadlineLabel: null,
      deadlineState: "unknown",
      officialUrl: v.url,
      applicationUrl: v.url,
      recordKind: v.cycle ? "cycle" : "overview",
      cycleStatus: v.cycle ? "confirmed" : "unconfirmed",
      requirements: {
        kind: "all",
        id: "official-requirements",
        label: "Provider conditions",
        rules: [
          {
            kind: "requirement",
            id: "target-level",
            label: "Supported intended level",
            field: "targetLevel",
            op: "in",
            values: v.levels,
            verified: true,
            evidenceKey: "levels",
          },
          {
            kind: "requirement",
            id: "unmapped-provider-conditions",
            label:
              "Confirm nationality, residence, admission, qualifications, language and programme-specific conditions against the official guidance; these are not fully mapped.",
            field: "providerConfirmation",
            op: "confirmed",
            verified: false,
            evidenceKey: "requirements",
          },
        ],
      },
      evidence,
      ...v.overrides,
    },
  };
}
const glocalUrl = "https://globallocal-erasmusmundus.eu/about-glocal/programme-overview/";
const glocalFunding = "https://globallocal-erasmusmundus.eu/erasmus-mundus-scholarship/";
const glocalApply = "https://globallocal-erasmusmundus.eu/how-to-apply/";
const glocal = overview({
  key: "erasmus-glocal",
  provider: "GLOCAL Consortium",
  providerKey: "glocal-consortium",
  providerUrl: "https://globallocal-erasmusmundus.eu",
  programme: "GLOCAL — Erasmus Mundus Joint Master scholarship",
  url: glocalUrl,
  heading: "Programme Overview",
  countries: ["GB", "DE", "ES", "SE", "CO", "JP", "NL"],
  institutions: [
    { name: "University of Glasgow", countryCode: "GB" },
    { name: "Georg-August-Universität Göttingen", countryCode: "DE" },
    { name: "Universitat de Barcelona", countryCode: "ES" },
    { name: "Uppsala Universitet", countryCode: "SE" },
    { name: "Universidad de Los Andes", countryCode: "CO" },
    { name: "Kyoto University", countryCode: "JP" },
    { name: "Erasmus University Rotterdam", countryCode: "NL" },
  ],
  levels: ["master"],
  fields: ["Business", "Economics", "History"],
  cycle: "September 2027 entry",
  summary:
    "A two-year joint master's with eight study tracks across seven partner universities. Your track determines three study locations; Track H is not recruiting for 2027. Admission, English, prior EMJM funding and track-specific academic conditions need confirmation.",
  passages: {
    title: "Erasmus Mundus International Master in Global Markets, Local Creativities",
    destination: "Glasgow or Göttingen",
    institution: "University of Glasgow; Universitat de Barcelona; Erasmus University Rotterdam",
    levels: "International Masters Degree",
    funding: "Full coverage of tuition fees",
    availability: "Applications are now open!",
    deadline: "14th January 2027, 1300 (UK time)",
    cycle: "2027",
  },
  evidenceUrls: {
    title: glocalFunding,
    funding: glocalFunding,
    availability: glocalApply,
    deadline: glocalApply,
    cycle: glocalApply,
  },
  supportPages: [glocalFunding, glocalApply],
  overrides: {
    availability: "open",
    deadlineLabel: "14 January 2027, 13:00 UK time; exact closing instant needs confirmation.",
    deadlineState: "date_only",
    fundingType: "comprehensive",
    funding: [
      {
        component: "tuition",
        coverage: "full",
        description: "Tuition fees covered jointly by the EMJM scholarship and consortium.",
      },
      {
        component: "living",
        coverage: "full",
        description:
          "Monthly subsistence allowance; advance travel payments reduce monthly instalments.",
      },
      { component: "insurance", coverage: "full", description: "Insurance coverage is included." },
    ],
    fundingSummary:
      "Tuition, monthly subsistence and insurance; travel/installation payment options affect instalments.",
    applicationUrl: glocalApply,
  },
});
const mcgillUrl = "https://www.mcgill.ca/mastercardfdn-scholars/apply";
const mcgill = overview({
  key: "mcgill-mastercard",
  provider: "McGill University",
  providerKey: "mcgill",
  providerCountry: "CA",
  providerUrl: "https://www.mcgill.ca",
  programme: "McGill Mastercard Foundation Scholars Program",
  url: mcgillUrl,
  heading: "Apply",
  countries: ["CA"],
  institutions: [{ name: "McGill University", countryCode: "CA" }],
  levels: ["master"],
  cycle: "Fall 2027",
  summary:
    "A partner-specific master's scholarship for leaders from Africa in nutrition, public health, public policy and sustainable agriculture. Scholarship pre-screening precedes the invitation to apply for McGill admission. Fall 2027 recruitment is closed; next-cycle information is expected in Spring 2027.",
  passages: {
    title: "Mastercard Foundation Scholars Program at McGill University",
    destination: "Montréal, Quebec",
    institution: "McGill University",
    levels: "graduate (master’s) level",
    availability: "The application period for the Fall 2027 cohort is now closed.",
    cycle: "Fall 2027",
  },
  evidenceUrls: { levels: "https://www.mcgill.ca/mastercardfdn-scholars/" },
  supportPages: ["https://www.mcgill.ca/mastercardfdn-scholars/"],
  overrides: { availability: "closed" },
});
const stanford = overview({
  key: "stanford-knight-hennessy",
  provider: "Stanford University",
  providerKey: "stanford",
  providerCountry: "US",
  providerUrl: "https://www.stanford.edu",
  programme: "Knight-Hennessy Scholars — graduate funding",
  url: "https://knight-hennessy.stanford.edu/program-overview/funding",
  heading: "Funding",
  countries: ["US"],
  institutions: [{ name: "Stanford University", countryCode: "US" }],
  levels: ["master", "doctorate"],
  summary:
    "Graduate funding at Stanford for up to three years. Longer degrees depend on their department's standard funding commitment. Separate scholarship and degree admission conditions, degree-recency rules and cycle dates must be checked.",
  passages: {
    title: "Knight-Hennessy scholars receive funding",
    destination: "at Stanford",
    institution: "at Stanford",
    levels: "graduate degree(s)",
    funding: "A fellowship applied directly to cover tuition and associated fees",
  },
  overrides: {
    fundingType: "comprehensive",
    funding: [
      {
        component: "tuition",
        coverage: "full",
        description: "Fellowship covers tuition and associated fees within the funding duration.",
      },
      {
        component: "living",
        coverage: "unspecified",
        description: "Stipend for living and academic expenses.",
      },
      {
        component: "travel",
        coverage: "partial",
        description: "One annual economy-class trip; provider conditions apply.",
      },
    ],
    fundingSummary:
      "Tuition, living/academic stipend and annual travel for up to three years; longer-degree funding varies.",
  },
});
const makerere = overview({
  key: "makerere-mastercard-masters",
  provider: "Makerere University",
  providerKey: "makerere",
  providerCountry: "UG",
  providerUrl: "https://www.mak.ac.ug",
  programme: "Makerere Mastercard Foundation — master's scholarships",
  url: "https://apply.mastercardfoundation.mak.ac.ug/announcements/30",
  heading: "Scholarships for Masters Programmes 2026/2027",
  countries: ["UG"],
  institutions: [{ name: "Makerere University main campus", countryCode: "UG" }],
  levels: ["master"],
  cycle: "2026/2027",
  summary:
    "Master's awards for academically talented applicants facing financial barriers. Main-campus admission, prior education in Africa, priority programmes and age/category conditions apply. This 2026/27 call has a past deadline; it is retained as historical information.",
  passages: {
    title: "Mastercard Foundation Scholars Program at Makerere University",
    destination: "Makerere University Main Campus",
    institution: "Makerere University",
    levels: "Master’s scholarships",
    deadline: "5th June 2026",
    availability: "5th June 2026",
    cycle: "2026/2027",
  },
  overrides: {
    availability: "closed",
    deadlineState: "date_only",
    deadlineLabel:
      "5 June 2026 — historical closing date; no current application call established.",
  },
});
const korea = overview({
  key: "gks-degree",
  provider: "National Institute for International Education",
  providerKey: "niied",
  providerCountry: "KR",
  providerUrl: "https://www.niied.go.kr",
  programme: "Global Korea Scholarship — degree programmes",
  url: "https://www.niied.go.kr/web/niied/contents/niiedEng/eng_gksDegree",
  heading: "GKS Degree Program",
  countries: ["KR"],
  institutions: [{ name: "GKS-designated higher education institutions", countryCode: "KR" }],
  levels: ["bachelor", "master", "doctorate"],
  scope: "institution_dependent",
  summary:
    "Korean government degree scholarships administered through distinct undergraduate and graduate routes. Invited citizenships, dual nationality restrictions, age exceptions, qualifications and embassy/university nomination conditions vary. Consult the current route guidelines before applying.",
  passages: {
    title: "Global Korea Scholarship (GKS)",
    destination: "higher education institutions in Korea",
    institution: "higher education institutions in Korea",
    levels: "both undergraduate and graduate level",
  },
});
const japan = overview({
  key: "mext-research",
  provider: "Japan Student Services Organization",
  providerKey: "jasso",
  providerCountry: "JP",
  providerUrl: "https://www.studyinjapan.go.jp",
  programme: "MEXT — research student scholarship route",
  url: "https://www.studyinjapan.go.jp/en/planning/scholarships/mext-scholarships/",
  heading: "Japanese Government (MEXT) Scholarship",
  countries: ["JP"],
  institutions: [
    { name: "Japanese universities with an eligible recommendation route", countryCode: "JP" },
  ],
  levels: ["master", "doctorate"],
  scope: "institution_dependent",
  summary:
    "Government scholarship research-student route at graduate-school level. Embassy and university recommendation procedures differ; not every university has a recommendation quota. Nationality, age, qualifications, research field and local submission dates require current route guidance.",
  passages: {
    title: "Japanese Government (MEXT) Scholarship",
    destination: "study abroad",
    institution: "university recommendation",
    levels: "Graduate school level",
  },
});
const daad = overview({
  key: "daad-epos-overview",
  provider: "German Academic Exchange Service (DAAD)",
  providerKey: "daad",
  providerCountry: "DE",
  providerUrl: "https://www.daad.de",
  programme: "DAAD EPOS — development-related postgraduate courses",
  url: "https://www.daad.de/en/information-services-for-higher-education-institutions/further-information-on-daad-programmes/epos/",
  heading: "Programme objectives",
  countries: ["DE"],
  institutions: [{ name: "Selected German universities offering EPOS courses", countryCode: "DE" }],
  levels: ["master"],
  scope: "institution_dependent",
  summary:
    "DAAD funding for selected development-related postgraduate courses in Germany. This is a scheme overview, not one common award or deadline. Applicants must check the eligible-country list, course-specific professional experience, qualification and language conditions and individual application dates.",
  passages: {
    title: "development-related postgraduate courses",
    destination: "selected universities in Germany",
    institution: "selected universities in Germany",
    levels: "postgraduate courses",
  },
});
const ashesi = overview({
  key: "ashesi-mastercard",
  provider: "Ashesi University",
  providerKey: "ashesi",
  providerCountry: "GH",
  providerUrl: "https://ashesi.edu.gh",
  programme: "Ashesi Mastercard Foundation Scholars Program",
  url: "https://ashesi.edu.gh/the-mastercard-foundation-scholars-programme/",
  heading: "The Mastercard Foundation Scholars Program at Ashesi",
  countries: ["GH"],
  institutions: [{ name: "Ashesi University", countryCode: "GH" }],
  levels: ["bachelor"],
  summary:
    "Need-based support at Ashesi. Applicants submit a general scholarship application; the university determines the named award rather than applicants selecting Mastercard funding directly. Leadership, financial need, admission and community contribution are assessed separately. Current-cycle dates need confirmation.",
  passages: {
    title: "The Mastercard Foundation Scholars Program at Ashesi",
    destination: "Ashesi University",
    institution: "Ashesi University",
    levels: "undergraduate and master’s degrees",
    funding: "covering all fees and costs for room and board as well as learning resources",
  },
  overrides: {
    fundingType: "comprehensive",
    funding: [
      {
        component: "tuition",
        coverage: "full",
        description: "All fees covered under the Mastercard Foundation award.",
      },
      {
        component: "living",
        coverage: "full",
        description: "Room, board and learning resources are included.",
      },
    ],
    fundingSummary:
      "Mastercard award covers fees, room, board and learning resources; general Ashesi aid may differ.",
  },
});
const capeApply = "https://uct.ac.za/mastercardfdn/how-apply";
const cape = overview({
  key: "uct-mastercard-postgraduate",
  provider: "University of Cape Town",
  providerKey: "uct",
  providerCountry: "ZA",
  providerUrl: "https://uct.ac.za",
  programme: "UCT Mastercard Foundation — postgraduate scholarships",
  url: capeApply,
  heading: "Apply",
  countries: ["ZA"],
  institutions: [{ name: "University of Cape Town", countryCode: "ZA" }],
  levels: ["master"],
  cycle: "2027 intake",
  summary:
    "Postgraduate support for academically talented young Africans facing financial barriers. Apply separately for UCT academic admission and the scholarship; faculty-specific admission conditions apply. The undergraduate scholarship deadline is separate and has already passed.",
  passages: {
    title: "Mastercard Foundation Scholars Program",
    destination: "University of Cape Town",
    institution: "University of Cape Town",
    levels: "postgraduate studies",
    availability: "postgraduate applications remain open",
    cycle: "2027 intake",
    deadline: "31 October 2026 (Postgraduate)",
  },
  supportPages: ["https://uct.ac.za/mastercardfdn"],
  evidenceUrls: { deadline: "https://uct.ac.za/mastercardfdn" },
  overrides: {
    availability: "open",
    deadlineState: "date_only",
    deadlineLabel: "31 October 2026 — postgraduate; closing time and time zone not stated.",
  },
});
const turkiye = overview({
  key: "turkiye-graduate",
  provider: "Presidency for Turks Abroad and Related Communities",
  providerKey: "ytb",
  providerCountry: "TR",
  providerUrl: "https://www.turkiyeburslari.gov.tr",
  programme: "Türkiye Scholarships — graduate programme",
  url: "https://www.turkiyeburslari.gov.tr/fulltimeprograms",
  heading: "Full-Time Scholarships",
  countries: ["TR"],
  institutions: [{ name: "Universities and departments offered in TBBS", countryCode: "TR" }],
  levels: ["master", "doctorate"],
  scope: "institution_dependent",
  summary:
    "Government graduate funding in social sciences, humanities, natural sciences and engineering. Graduate health-science awards are excluded. Applicants can choose only the departments offered for their background in TBBS. The recurring January–February window is guidance, not a confirmed next-cycle deadline; merit awards have separate criteria.",
  passages: {
    title: "Graduate Scholarship Program",
    destination: "universities in Türkiye",
    institution: "University and Department Placement",
    levels: "master’s and PhD levels",
    funding: "Monthly Stipend",
  },
  overrides: {
    fundingType: "unknown",
    funding: [
      {
        component: "tuition",
        coverage: "unspecified",
        description: "Tuition fee support is listed; confirm the applicable programme package.",
      },
      {
        component: "living",
        coverage: "unspecified",
        description: "Monthly stipend and accommodation are listed.",
      },
      {
        component: "insurance",
        coverage: "unspecified",
        description: "Health insurance is listed.",
      },
    ],
    fundingSummary:
      "Provider lists tuition, stipend, accommodation, insurance and flight support; confirm route conditions.",
  },
});
const fulbright = overview({
  key: "fulbright-foreign-student",
  provider: "U.S. Department of State / Fulbright",
  providerKey: "fulbright",
  providerCountry: "US",
  providerUrl: "https://foreign.fulbrightonline.org",
  programme: "Fulbright Foreign Student Program — country-administered routes",
  url: "https://foreign.fulbrightonline.org/about/foreign-student-program",
  heading: "Fulbright Foreign Student Program",
  countries: ["US"],
  institutions: [
    {
      name: "U.S. institutions determined through the administering country programme",
      countryCode: "US",
    },
  ],
  levels: ["master", "doctorate"],
  scope: "institution_dependent",
  summary:
    "An overview of country-administered Fulbright routes to study or research in the United States. Citizenship, residence, degree eligibility, nomination, placement and application windows are set by the relevant commission or U.S. embassy. This is not a universal open scholarship or deadline.",
  passages: {
    title: "Fulbright Foreign Student Program",
    destination: "United States",
    institution: "United States",
    levels: "graduate students",
  },
});
const manaaki = overview({
  key: "manaaki-tertiary",
  provider: "Education New Zealand / New Zealand Government",
  providerKey: "manaaki",
  providerCountry: "NZ",
  providerUrl: "https://www.nzscholarships.govt.nz",
  programme: "Manaaki New Zealand — tertiary scholarship routes",
  url: "https://www.nzscholarships.govt.nz/check-eligible-countries/",
  heading: "Check eligible countries",
  countries: ["NZ"],
  institutions: [{ name: "Eligible New Zealand tertiary institutions", countryCode: "NZ" }],
  levels: ["bachelor", "master", "doctorate"],
  scope: "institution_dependent",
  summary:
    "New Zealand tertiary scholarships for citizens of specified eligible countries. Offered levels and preferred subjects depend on the applicant's country. The separate Pacific-university option is not included here. The provider currently states tertiary applications are closed; next-cycle dates are unconfirmed.",
  passages: {
    title: "Manaaki New Zealand Scholarships",
    destination: "Scholarships to study in New Zealand",
    institution: "New Zealand",
    levels: "Master’s Degree",
    availability:
      "Tertiary applications for the Manaaki New Zealand Scholarship Programme have now closed.",
  },
});
// Supporting package passages must also be present on the fetched official page.
for (const [mapping, passage] of [
  [glocal, "A monthly subsistence allowance for the entire duration"],
  [glocal, "Full insurance coverage"],
  [stanford, "A stipend for living and academic expenses"],
] as const) {
  mapping.data.evidence.push({
    field: "funding",
    passage,
    url: mapping === glocal ? glocalFunding : mapping.url,
    state: "verified",
    retrievedAt: retrievalTime(mapping === glocal ? glocalFunding : mapping.url),
  });
}
function directory(
  id: string,
  url: string,
  heading: string,
  mappings: DetailMapping[],
  extraPaths: string[] = [],
): DirectoryDefinition {
  const urls = [...mappings.flatMap((m) => [m.url, ...(m.supportPages || [])]), ...extraPaths];
  return {
    id,
    url,
    heading,
    linkSelector: "a[href]",
    allowedDetails: urls.map((raw) => {
      const u = new URL(raw);
      return { host: u.hostname, pathPrefix: u.pathname };
    }),
    mappings,
  };
}
export const globalDirectories: DirectoryDefinition[] = [
  directory("glocal-programmes", glocalApply, "How To Apply", [glocal]),
  directory(
    "makerere-scholarships",
    "https://apply.mastercardfoundation.mak.ac.ug/scholarships",
    "Scholarships",
    [makerere],
    ["https://apply.mastercardfoundation.mak.ac.ug/announcements/"],
  ),
  directory(
    "mcgill-scholars",
    "https://www.mcgill.ca/mastercardfdn-scholars/",
    "Mastercard Foundation Scholars Program",
    [mcgill],
  ),
  directory("stanford-funding", stanford.url, "Funding", [stanford]),
  directory("niied-programmes", korea.url, "Core Business", [korea]),
  directory(
    "jasso-scholarships",
    "https://www.studyinjapan.go.jp/en/planning/scholarships/",
    "Scholarships",
    [japan],
  ),
  directory("daad-epos", daad.url, "Programme objectives", [daad]),
  directory(
    "ashesi-scholarships",
    "https://ashesi.edu.gh/scholarships/",
    "Scholarships Make an Ashesi Education Affordable",
    [ashesi],
  ),
  directory(
    "uct-scholarships",
    "https://uct.ac.za/mastercardfdn",
    "Mastercard Foundation Scholars Program",
    [cape],
  ),
  directory("turkiye-programmes", "https://www.turkiyeburslari.gov.tr/", "TürkiyeScholarships", [
    turkiye,
  ]),
  directory("fulbright-routes", fulbright.url, "Fulbright Foreign Student Program", [fulbright]),
  directory("manaaki-routes", manaaki.url, "Check eligible countries", [manaaki]),
];
globalDirectories.find((source) => source.id === "makerere-scholarships")!.dynamicDetail =
  "makerere-announcement-1";
