import type { ScholarshipData } from "@/server/scholarships/schema";
import type { Requirement, Rule } from "@/server/eligibility/rules";
// Official pages were inspected on 24 October 2026. These reviewed seed facts are
// immutable input, not a runtime mock. `db:seed` persists them through publication.
const checkedAt = "2026-10-24T10:15:11.000Z";
type Entry = {
  slug: string;
  provider: string;
  providerSlug: string;
  providerUrl: string;
  cycle: string;
  adapter?: string;
  data: ScholarshipData;
};
const oxford = "https://www.ox.ac.uk";
const az = `${oxford}/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search/scholarships-a-z-listing`;
const warwick = "https://warwick.ac.uk/services/dc/schols_fund/applicants/competitions/";
type Spec = {
  slug: string;
  title: string;
  provider: string;
  providerSlug: string;
  url: string;
  cycle: string;
  destination?: string;
  recordKind?: ScholarshipData["recordKind"];
  levels: ScholarshipData["levels"];
  field?: string;
  fundingType: ScholarshipData["fundingType"];
  funding: string;
  living?: boolean;
  tuitionFull?: boolean;
  availability?: ScholarshipData["availability"];
  deadline?: string;
  deadlineLabel?: string;
  deadlineState?: ScholarshipData["deadlineState"];
  summary: string;
  passage: string;
  levelPassage?: string;
  deadlinePassage?: string;
  requirements?: Requirement[];
  adapter?: string;
  extraEvidence?: ScholarshipData["evidence"];
};
const requirement = (
  id: string,
  field: Requirement["field"],
  op: Requirement["op"],
  label: string,
  values?: string[],
): Requirement => ({
  kind: "requirement",
  id,
  field,
  op,
  label,
  values,
  verified: true,
  evidenceKey: "levels",
});
function make(s: Spec): Entry {
  const evidence: ScholarshipData["evidence"] = [
    {
      field: "funding",
      url: s.url,
      passage:
        s.fundingType === "unknown"
          ? "Funding components need further official-source confirmation; no complete package has been accepted."
          : s.passage,
      state: s.fundingType === "unknown" ? "missing" : "verified",
      retrievedAt: checkedAt,
    },
    {
      field: "levels",
      url: s.url,
      passage: s.levelPassage || s.passage,
      state: "verified",
      retrievedAt: checkedAt,
    },
    {
      field: "availability",
      url: s.url,
      passage:
        s.deadlinePassage || "Application availability has not been confirmed for this cycle.",
      state: s.availability && s.deadlinePassage ? "verified" : "missing",
      retrievedAt: checkedAt,
    },
    {
      field: "deadline",
      url: s.url,
      passage:
        s.deadlinePassage ||
        "A single closing instant is not confirmed; inspect the provider’s course or country guidance.",
      state:
        s.deadlineState === "conflicting"
          ? "conflicting"
          : s.deadlineLabel && s.deadlinePassage
            ? "verified"
            : "missing",
      retrievedAt: checkedAt,
    },
    ...(s.extraEvidence || []),
  ];
  const rules: Rule[] = [
    requirement(
      "target-level",
      "targetLevel",
      "in",
      `Intended study: ${s.levels.join(" or ")}`,
      s.levels,
    ),
    ...(s.requirements || []),
    {
      kind: "requirement",
      id: "provider-confirmation",
      label:
        "Confirm provider-specific admissions, selection and award conditions in the official guidance.",
      field: "providerConfirmation",
      op: "confirmed",
      verified: false,
      evidenceKey: "levels",
    },
  ];
  return {
    slug: s.slug,
    provider: s.provider,
    providerSlug: s.providerSlug,
    providerUrl: new URL(s.url).origin,
    cycle: s.cycle,
    adapter: s.adapter,
    data: {
      title: s.title,
      summary: s.summary,
      destination: s.destination || "United Kingdom",
      ...(s.recordKind ? { recordKind: s.recordKind, cycleStatus: "unconfirmed" as const } : {}),
      institution: s.provider,
      levels: s.levels,
      fields: [s.field || "Various fields"],
      fundingType: s.fundingType,
      funding:
        s.fundingType === "unknown"
          ? []
          : [
              {
                component: s.fundingType === "partial" ? "other" : "tuition",
                coverage: s.tuitionFull
                  ? "full"
                  : s.fundingType === "tuition" || s.fundingType === "partial"
                    ? "partial"
                    : "unspecified",
                description: s.funding,
              },
              ...(s.living
                ? [
                    {
                      component: "living" as const,
                      coverage: "unspecified" as const,
                      description:
                        "Living-cost support; see the provider for award-specific terms.",
                    },
                  ]
                : []),
            ],
      fundingSummary: s.funding,
      availability: s.availability || "unknown",
      opensAt: null,
      deadline: s.deadline || null,
      deadlineLabel: s.deadlineLabel || null,
      deadlineState: s.deadlineState || "unknown",
      officialUrl: s.url,
      applicationUrl: s.url,
      requirements: { kind: "all", id: "requirements", label: "Mandatory conditions", rules },
      evidence,
    },
  };
}
const specs: Spec[] = [
  {
    slug: "clarendon-2027",
    title: "Clarendon Scholarships",
    provider: "University of Oxford",
    providerSlug: "oxford",
    url: `${oxford}/admissions/graduate/fees-and-funding/funding/clarendon/applicants`,
    cycle: "2027/28",
    levels: ["master", "doctorate"],
    fundingType: "comprehensive",
    funding: "Full course fees and a living-cost grant; part-time support differs.",
    living: true,
    tuitionFull: true,
    summary:
      "Automatic consideration with an eligible Oxford graduate application. Apply by the relevant course funding deadline; no separate scholarship form.",
    passage: "Clarendon scholarships cover course fees in full.",
    levelPassage: "new Master's or DPhil course",
    deadlineLabel: "Course-specific December or January funding deadline",
    deadlineState: "date_only",
    adapter: "oxford-clarendon",
  },
  {
    slug: "weidenfeld-hoffmann-2027",
    title: "Weidenfeld-Hoffmann Scholarships",
    provider: "University of Oxford",
    providerSlug: "oxford",
    url: `${oxford}/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search/weidenfeld-hoffmann-scholarships-and-leadership-programme`,
    cycle: "2027/28",
    levels: ["master"],
    fundingType: "comprehensive",
    funding: "Full course fees plus living-cost grant of at least £21,805.",
    living: true,
    tuitionFull: true,
    summary:
      "Leadership development alongside selected Oxford graduate courses. Ordinary residence, course and return-home conditions require individual confirmation.",
    passage: "100% of course fees and a grant for living costs",
    levelPassage: "start a new full-time graduate course at Oxford",
    deadlineLabel: "Relevant course deadline; additional statement required",
    deadlineState: "date_only",
  },
  {
    slug: "reach-oxford-2027",
    title: "Reach Oxford Scholarship",
    provider: "University of Oxford",
    providerSlug: "oxford",
    url: `${oxford}/admissions/undergraduate/fees-and-funding/oxford-bursaries-and-scholarships/reach-oxford`,
    cycle: "2027",
    levels: ["bachelor"],
    fundingType: "comprehensive",
    funding: "Course fees, living-cost grant and one return airfare each year.",
    living: true,
    tuitionFull: true,
    availability: "upcoming",
    summary:
      "For eligible applicants unable to study in their home country. An Oxford offer is required; medicine is excluded. Application details are due in January 2027.",
    passage: "Course fees, a grant for living costs and one return air fare per year",
    levelPassage: "Level of study: Undergraduate",
    deadlineLabel: "26 January 2027; closing time not confirmed",
    deadlineState: "date_only",
    deadlinePassage: "26 January 2027 scholarship deadline",
  },
  {
    slug: "ertegun-2027",
    title: "Ertegun Graduate Scholarships",
    provider: "University of Oxford",
    providerSlug: "oxford",
    url: az,
    cycle: "2027/28",
    levels: ["master", "doctorate"],
    field: "Humanities",
    fundingType: "comprehensive",
    funding: "Course fees and a grant for living costs.",
    living: true,
    tuitionFull: true,
    summary:
      "Humanities graduate funding with an additional supporting statement. Course deadlines and eligible subjects need checking.",
    passage: "cover course fees and a grant for living costs",
    levelPassage: "funds full-time graduate degrees in various subjects within the Humanities",
    deadlineLabel: "Relevant January course deadline",
    deadlineState: "date_only",
  },
  {
    slug: "academic-futures-2027",
    title: "Academic Futures Scholarships",
    provider: "University of Oxford",
    providerSlug: "oxford",
    url: az,
    cycle: "2027/28",
    levels: ["master", "doctorate"],
    fundingType: "comprehensive",
    funding: "Course fees and a living-cost grant.",
    living: true,
    tuitionFull: true,
    summary:
      "Graduate support for disadvantaged or underrepresented applicants. Multiple contextual routes and additional application conditions apply.",
    passage: "The scholarship covers course fees and provides a grant for living costs.",
    levelPassage: "submit your application for graduate study",
    deadlineLabel: "Relevant December or January course deadline",
    deadlineState: "date_only",
  },
  {
    slug: "jardine-oxford-2027",
    title: "Jardine-Oxford Graduate Scholarships",
    provider: "University of Oxford",
    providerSlug: "oxford",
    url: az,
    cycle: "2027/28",
    levels: ["master", "doctorate"],
    fundingType: "comprehensive",
    funding: "Course fees and a living-cost grant.",
    living: true,
    tuitionFull: true,
    summary:
      "Selected full-time graduate courses for residents of specified Asian countries. Partner-college and shortlist application conditions apply.",
    passage: "The scholarship covers course fees and a grant for living costs.",
    levelPassage: "full-time masters or DPhil courses at Oxford",
    deadlineLabel: "Relevant December or January course deadline",
    deadlineState: "date_only",
  },
  {
    slug: "commonwealth-masters-2027",
    title: "Commonwealth Master’s Scholarships",
    provider: "Commonwealth Scholarship Commission",
    providerSlug: "commonwealth",
    url: "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-masters-scholarships/",
    cycle: "2027/28",
    levels: ["master"],
    fundingType: "unknown",
    funding: "See the CSC’s financial assistance terms for the award package.",
    availability: "closed",
    deadline: "2026-10-20T15:00:00.000Z",
    deadlineLabel: "20 October 2026, 16:00 BST",
    deadlineState: "confirmed",
    deadlinePassage:
      "Applications for Commonwealth Master’s Scholarships for the 2027/28 academic year are now closed.",
    passage: "full-time taught Master’s study at a UK university",
    summary:
      "Agency-nominated study for eligible Commonwealth applicants. The 2027/28 CSC application window has closed; nominators have their own requirements.",
    adapter: "csc-masters",
  },
  {
    slug: "chevening-2027",
    title: "Chevening Scholarships",
    provider: "UK Government · Chevening",
    providerSlug: "chevening",
    url: "https://www.chevening.org/scholarships/",
    cycle: "2027/28",
    levels: ["master"],
    fundingType: "unknown",
    funding:
      "Provider describes a fully funded award; itemised package needs country-specific confirmation.",
    summary:
      "One-year UK master’s awards. Eligibility includes citizenship, residence, post-graduation work experience and returning home. Check the country-specific closing date.",
    passage: "one-year master’s degrees in the UK",
    deadlineLabel: "Country-specific October 2026 deadline; confirm with provider",
    deadlineState: "date_only",
  },
  {
    slug: "ucl-global-masters-2026",
    title: "UCL Global Master’s Scholarship",
    provider: "University College London",
    providerSlug: "ucl",
    url: "https://www.ucl.ac.uk/scholarships/ucl-global-masters-scholarship",
    cycle: "2026/27",
    levels: ["master"],
    fundingType: "partial",
    funding: "£15,000 bursary, applied to tuition first and then maintenance.",
    availability: "closed",
    deadline: "2026-05-07T16:00:00.000Z",
    deadlineLabel: "7 May 2026, 17:00 BST",
    deadlineState: "confirmed",
    summary:
      "Need-based support for overseas-fee applicants to full-time taught UCL master’s courses. Distance-learning courses are excluded.",
    passage: "Value: £15,000 (for one year)",
    levelPassage: "Eligible programmes: All postgraduate taught",
    deadlinePassage: "Deadline: 5pm BST, Thursday 7 May 2026",
    adapter: "ucl-scholarship",
  },
  {
    slug: "ucl-global-undergraduate-2026",
    title: "UCL Global Undergraduate Scholarship",
    provider: "University College London",
    providerSlug: "ucl",
    url: "https://www.ucl.ac.uk/scholarships/ucl-global-undergraduate-scholarship",
    cycle: "2026/27",
    levels: ["bachelor"],
    fundingType: "tuition",
    tuitionFull: true,
    funding: "Full tuition awards; only some awards also include maintenance support.",
    availability: "closed",
    deadline: "2026-04-27T16:00:00.000Z",
    deadlineLabel: "27 April 2026, 17:00 BST",
    deadlineState: "confirmed",
    summary:
      "Support for low-income overseas-fee students applying to UCL undergraduate courses. Living support varies by award and is not guaranteed.",
    passage: "23 awards of full tuition fees",
    levelPassage: "Eligible programmes: All Undergraduate degrees",
    deadlinePassage: "Deadline: 5pm BST, Monday 27 April 2026",
    adapter: "ucl-scholarship",
  },
  {
    slug: "bristol-think-big-2026",
    title: "Think Big Scholarships",
    provider: "University of Bristol",
    providerSlug: "bristol",
    url: "https://www.bristol.ac.uk/students/support/finances/scholarships/think-big-scholarships/",
    cycle: "2026 entry",
    levels: ["bachelor", "master"],
    fundingType: "tuition",
    funding: "Contribution towards tuition fees; amount depends on award.",
    summary:
      "For overseas-fee applicants to eligible Bristol courses starting September 2026. Having applied for a course is required; an offer is not required to apply for funding.",
    passage:
      "funding towards tuition fees for international students studying eligible undergraduate or postgraduate courses",
    deadlineLabel: "2026 entry; scholarship closing date not confirmed",
    deadlineState: "unknown",
  },
  {
    slug: "eth-esop-2027",
    title: "ETH Excellence Scholarship & Opportunity Programme",
    provider: "ETH Zurich",
    providerSlug: "eth",
    url: "https://ethz.ch/students/en/studies/financial/scholarships/excellencescholarship.html",
    cycle: "2027/28",
    destination: "Switzerland",
    levels: ["master"],
    fundingType: "comprehensive",
    funding: "Tuition waiver and CHF 13,500 per semester from autumn 2027.",
    living: true,
    tuitionFull: true,
    availability: "upcoming",
    summary:
      "For outstanding incoming regular master’s students. Existing ETH master’s students and holders of a master’s degree are excluded. The provider’s closing-time wording needs clarification.",
    passage: "scholarship covering living and study expenses ... as well as a tuition fee waiver",
    levelPassage: "supports excellent Master's students",
    deadlineLabel: "30 November 2026; provider closing-time wording conflicts",
    deadlineState: "conflicting",
    deadlinePassage: "Nov, 1 - Nov, 30 2026, 11.59h, MEZ",
    requirements: [
      {
        ...requirement(
          "no-existing-master",
          "qualification",
          "notIn",
          "Must not already hold a master’s degree",
          ["master"],
        ),
        evidenceKey: "existing-degree",
      },
    ],
    extraEvidence: [
      {
        field: "existing-degree",
        url: "https://ethz.ch/students/en/studies/financial/scholarships/excellencescholarship.html",
        passage: "hold a Master degree, you are not eligible",
        state: "verified",
        retrievedAt: checkedAt,
      },
    ],
  },
  ...[
    [
      "faculty-chancellors",
      "Faculty Chancellors Scholarships",
      "Any nationality; current postgraduate research students are excluded.",
      "Be of any nationality or fee status",
    ],
    [
      "interdisciplinary-chancellors",
      "Interdisciplinary Chancellors Scholarships",
      "An interdisciplinary proposal aligned to a Warwick research theme is required.",
      "Propose an interdisciplinary research project",
    ],
    [
      "ahrc-doctoral",
      "AHRC Doctoral Scholarships",
      "For projects within the Arts and Humanities Research Council remit.",
      "Arts and Humanities Research Council remit",
    ],
    [
      "china-scholarship-council",
      "Warwick China Scholarship Council",
      "PRC passport and CSC conditions apply, including residence or overseas-study restrictions.",
      "Hold a Peoples Republic of China Passport",
    ],
  ].map(([slug, title, summary, passage]): Spec => ({
    slug: `warwick-${slug}-2027`,
    title,
    provider: "University of Warwick",
    providerSlug: "warwick",
    url: warwick,
    cycle: "2027/28",
    levels: ["doctorate"],
    field: slug === "ahrc-doctoral" ? "Arts and humanities" : "Various fields",
    fundingType: "comprehensive",
    funding: "Academic fees and maintenance stipend; stream-specific duration and conditions.",
    living: true,
    tuitionFull: true,
    availability: "open",
    deadline: "2026-12-10T16:59:00.000Z",
    deadlineLabel: "10 December 2026, 16:59 GMT",
    deadlineState: "confirmed",
    summary,
    passage:
      "Full payment of your academic fees ... A tax-free maintenance stipend to support living costs",
    levelPassage: "Eligible courses include: PhD, MPhil/PhD, EngD",
    deadlinePassage: "Scholarship Applications 10 December 2026",
    ...(slug === "china-scholarship-council"
      ? {
          requirements: [
            {
              ...requirement(
                "citizenship",
                "citizenships",
                "in",
                "Hold a People’s Republic of China passport",
                ["China"],
              ),
              evidenceKey: "citizenship",
            },
          ],
          extraEvidence: [
            {
              field: "citizenship",
              url: warwick,
              passage,
              state: "verified" as const,
              retrievedAt: checkedAt,
            },
          ],
        }
      : {}),
  })),
  {
    slug: "twente-uts-2027",
    title: "University of Twente Scholarship",
    provider: "University of Twente",
    providerSlug: "twente",
    url: "https://www.utwente.nl/en/education/scholarship-finder/university-of-twente-scholarship/",
    cycle: "2027/28",
    destination: "Netherlands",
    levels: ["master"],
    fundingType: "partial",
    funding: "€3,000–€22,000 for one year; renewal conditions apply.",
    availability: "open",
    deadline: "2027-04-01T15:00:00.000Z",
    deadlineLabel: "1 April 2027, 16:00 CET (as stated by provider)",
    deadlineState: "confirmed",
    summary:
      "For excellent incoming non-EU/EEA MSc students with provisional admission. Language subscores, class ranking and programme exclusions require confirmation.",
    passage: "€ 3,000 - € 22,000 for one year",
    levelPassage: "applying for a graduate programme (MSc)",
    deadlinePassage: "1 April 2027, 16.00 CET",
    adapter: "twente-uts",
  },
  {
    slug: "leiden-lexs-december-2026",
    title: "Leiden University Excellence Scholarship",
    provider: "Leiden University",
    providerSlug: "leiden",
    url: "https://www.universiteitleiden.nl/en/scholarships/sea/leiden-university-excellence-scholarship-lexs",
    cycle: "December 2026 selection",
    destination: "Netherlands",
    levels: ["master"],
    fundingType: "tuition",
    funding: "Partial tuition awards from €10,000 to €19,000; no full living-cost coverage.",
    summary:
      "For excellent applicants to eligible September-start master’s courses. Non-EEA/EFTA citizenship rules have programme-specific exceptions; confirm intended intake.",
    passage: "The LExS is not a full scholarship",
    levelPassage: "Target group Master",
    deadlineLabel: "1 December 2026; closing time not stated",
    deadlineState: "date_only",
    deadlinePassage: "Deadline 1 December 2026",
  },
  {
    slug: "nl-scholarship-2026",
    title: "NL Scholarship",
    provider: "Nuffic · Study in NL",
    providerSlug: "nuffic",
    url: "https://www.studyinnl.org/finances/nl-scholarship",
    cycle: "2026/27",
    destination: "Netherlands",
    levels: ["bachelor", "master"],
    fundingType: "partial",
    funding: "€5,000 in the first year; not a full tuition scholarship.",
    summary:
      "A participating-institution scheme for non-EEA applicants. Institution-specific eligibility and closing dates vary; this record describes the scheme, not a separate university award.",
    passage: "The scholarship amounts to € 5,000.",
    levelPassage: "full-time bachelor’s or master’s programme",
    deadlineLabel: "Institution-specific; consult participating university",
    deadlineState: "unknown",
  },
  {
    slug: "australia-awards-cycle-unconfirmed",
    title: "Australia Awards Scholarships",
    provider: "Australian Government · DFAT",
    providerSlug: "dfat",
    url: "https://www.dfat.gov.au/people-to-people/australia-awards/australia-awards-scholarships",
    cycle: "Programme overview · cycle unconfirmed",
    recordKind: "overview",
    destination: "Australia",
    levels: ["bachelor", "master", "doctorate"],
    fundingType: "comprehensive",
    funding:
      "Full tuition, living contribution, return travel and health cover; country terms apply.",
    living: true,
    tuitionFull: true,
    summary:
      "Development awards for participating partner countries. Study levels, country eligibility and closing dates must be checked against the relevant country guidance.",
    passage: "full tuition fees",
    levelPassage: "full time undergraduate or postgraduate study",
    deadlineLabel: "Country-specific; application cycle not confirmed",
    deadlineState: "unknown",
  },
];
export const reviewedCatalogue: Entry[] = specs.map(make);
