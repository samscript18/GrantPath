import type { DirectoryDefinition } from "@/server/discovery/types";
import { erasmusProgrammeMappings } from "./erasmus-programmes";
const reviewedAt = "2026-11-24";
const university = (
  id: string,
  url: string,
  heading: string,
  linkSelector: string,
  host: string,
  pathPrefix: string,
  adapter: string,
  pagination?: DirectoryDefinition["pagination"],
): DirectoryDefinition => ({
  id,
  url,
  heading,
  linkSelector,
  allowedDetails: [{ host, pathPrefix }],
  dynamicDetail: adapter,
  directoryAdapter: "university-funding-cards-1",
  mappings: [],
  restrictToSupportedDetails: true,
  pagination,
  resumePagination: !!pagination,
  discoverApplicationRounds: ["uq-funding-cms-1", "auckland-funding-cms-1"].includes(adapter),
  bounds: { pages: 10, candidates: 100 },
  review: {
    reviewedAt,
    rationale:
      "Official university-owned funding database. Actual directory links and structured award detail fields inspected; robots permits the reviewed paths (Cambridge robots returns 404). Only supported award routes and evidence-backed fields can publish under the existing policy.",
    limitations: [
      "Missing eligibility and linked regulation conditions remain mandatory unknowns; restricted and domestic awards are retained, not relabelled international.",
      "No application window inferred from catalogue membership or a year in a URL.",
      "At most ten listing pages and 100 candidate links per check; no unrestricted site traversal.",
    ],
  },
});
export const growthDirectories: DirectoryDefinition[] = [
  {
    ...university(
      "usask-graduate-awards",
      "https://grad.usask.ca/funding/award-search.php?type=Scholarship",
      "Award search",
      '#results a[href*="award="]',
      "grad.usask.ca",
      "/funding/award-search.php",
      "usask-funding-cms-1",
    ),
    allowedDetails: [
      {
        host: "grad.usask.ca",
        pathPrefix: "/funding/award-search.php",
        exact: true,
        query: {
          award: "[0-9]{6}(?:GS|CS)[0-9]{2}",
          keyword: "",
          department: "",
          category: "",
          type: "Scholarship",
          deadline: "",
        },
      },
    ],
    review: {
      reviewedAt,
      rationale:
        "Official USask Graduate Studies award search. Published GET scholarship filter returns 184 actual award links, with separate award identifiers and Eligibility, Value, Apply table fields. Robots permits the exact routes. Only internal numeric GS/CS award identifiers are authorised; external award codes remain excluded.",
      limitations: [
        "Generic graduate wording does not establish a funded master's or doctoral degree and remains in review.",
        "Two inspected award responses share the canonical https://grad.usask.ca/funding/award-search.php despite different award identifiers. Only this exact reviewed canonical defect is allowed; foreign hosts and other paths still reject.",
        "Previous degree requirements do not establish the funded degree level.",
        "Unknown dates and complete eligibility remain unknown; no direct application promise is made.",
      ],
    },
  },
  {
    ...university(
      "ubc-graduate-awards",
      "https://www.grad.ubc.ca/scholarships-awards-funding/award-opportunities?page=0",
      "Award Opportunities",
      'main table a[href^="/awards/"]',
      "www.grad.ubc.ca",
      "/awards/",
      "ubc-funding-cms-1",
      {
        selector: ".pager__item--next a[href]",
        pathPrefix: "/scholarships-awards-funding/award-opportunities",
        queryKeys: ["page"],
      },
    ),
    review: {
      reviewedAt,
      rationale:
        "Official UBC Graduate School award catalogue. Actual server-rendered award tables, six listing pages, degree/citizenship/value fields, eligibility and application sections inspected. Robots permits listed paths; one sample retrieval had a transient network failure, a second succeeded.",
      limitations: [
        "External awards can have destinations or institutions beyond UBC; only pages whose evidence supports UBC study can publish.",
        "Department gateways, guidelines, travel funds and unsupported layouts remain excluded or held.",
        "Degree fields and retained citizenship conditions do not establish complete personal eligibility; programme deadlines remain unknown unless supported.",
      ],
    },
  },
  {
    ...university(
      "leeds-scholarships",
      "https://www.leeds.ac.uk/scholarships",
      "Scholarships",
      'a[href^="https://leeds-search.funnelback.squiz.cloud/s/redirect?"]',
      "www.leeds.ac.uk",
      "/scholarship/",
      "leeds-funding-cms-1",
      {
        selector: ".uol-pagination a.uol-icon--mdiArrowRight[href]",
        pathPrefix: "/scholarships",
        queryKeys: ["query", "page"],
      },
    ),
    detailLinkWrapper: {
      host: "leeds-search.funnelback.squiz.cloud",
      path: "/s/redirect",
      queryKey: "url",
    },
    review: {
      reviewedAt,
      rationale:
        "Official central Leeds directory identified through the old faculty award redirect. Public results embed direct www.leeds.ac.uk/scholarship/ URLs inside a fixed search tracking wrapper. Only the embedded official URL is fetched, after ordinary path and robots validation; the tracking endpoint is never visited. Central detail key-facts, award heading, eligibility and application sections inspected.",
      limitations: [
        "Initial server-rendered result page only; no unreviewed search API or pagination.",
        "The page header contains the actual award title and is retained only under the reviewed .page-heading selector.",
        "Multiple deadline rounds and unsupported funding/eligibility conditions remain unknown or preserved as official text; domestic awards are retained.",
      ],
    },
  },
  {
    id: "educanada-government-feed",
    url: "https://www.educanada.ca/scholarships-bourses/assets/forms/data.json",
    directoryFormat: "json",
    directoryAdapter: "official-government-feed-1",
    dynamicDetail: "educanada-mobility-1",
    heading: "EduCanada scholarship search data",
    linkSelector: "a[href]",
    restrictToSupportedDetails: false,
    allowedDetails: [
      {
        host: "www.educanada.ca",
        pathPrefix: "/scholarships-bourses/non_can/",
        query: { lang: "eng" },
      },
      {
        host: "www.educanada.ca",
        pathPrefix: "/scholarships-bourses/can/",
        query: { lang: "eng" },
      },
    ],
    mappings: [],
    review: {
      reviewedAt,
      rationale:
        "Exact public JSON feed referenced by the official EduCanada search page script. Retrieved feed has 54 entries, including institution/faculty programmes and student scholarships; robots permits these routes.",
      limitations: [
        "Institution/faculty funding is excluded; student and researcher entries retain actual restrictions.",
        "External government/partner links remain unapproved leads, never automatically authorised.",
        "Canadian detail layouts require review until their precise extraction contracts are implemented.",
      ],
    },
  },
  {
    ...university(
      "jasso-scholarship-search",
      "https://www.studyinjapan.go.jp/en/search-for-scholarships/tuition-reduction_search.php?lang=en",
      "Scholarship",
      "a.school-result-item[href]",
      "www.studyinjapan.go.jp",
      "/en/search-for-scholarships/detail.php",
      "jasso-scholarship-cms-1",
      {
        selector: "a.list[onclick]",
        pathPrefix: "/en/search-for-scholarships/tuition-reduction_search.php",
        queryKeys: ["lang", "go", "offset", "limit", "narabikae", "school_name"],
      },
    ),
    directoryAdapter: "jasso-funding-cards-1",
    review: {
      reviewedAt,
      rationale:
        "Official Study in Japan directory operated by JASSO. Scholarship and tuition-reduction result cards, published pagination offsets, exact detail identifiers and institution/award fields inspected; robots permits the reviewed endpoints.",
      limitations: [
        "Nationality, residence, school, fee and academic restrictions are retained; an entry is not universally available to international applicants.",
        "At most ten listing pages and 100 candidates per directory check. Published onclick offsets are parsed as bounded numeric links; scripts are never executed.",
        "Unsupported degree levels and unclear identities require review; current windows and complete eligibility remain unknown unless evidenced.",
      ],
    },
    allowedDetails: [
      {
        host: "www.studyinjapan.go.jp",
        pathPrefix: "/en/search-for-scholarships/detail.php",
        query: { lang: "en", mid: "[0-9-]{1,24}" },
      },
    ],
  },
  university(
    "uq-scholarships",
    "https://scholarships.uq.edu.au/scholarships",
    "Find a scholarship",
    "a.card__link[href]",
    "scholarships.uq.edu.au",
    "/scholarship/",
    "uq-funding-cms-1",
    { selector: "a.uq-pagination__next[href]", pathPrefix: "/scholarships", queryKeys: ["page"] },
  ),
  university(
    "auckland-scholarships",
    "https://www.auckland.ac.nz/en/study/scholarships-and-awards/find-a-scholarship.html",
    "Find a scholarship",
    'a.subnav-overlay__links[href*="find-a-scholarship/"]',
    "www.auckland.ac.nz",
    "/en/study/scholarships-and-awards/find-a-scholarship/",
    "auckland-funding-cms-1",
  ),
  university(
    "cambridge-funding-search",
    "https://www.student-funding.cam.ac.uk/",
    "Postgraduate Funding Search",
    'a[href^="/fund/"]',
    "www.student-funding.cam.ac.uk",
    "/fund/",
    "cambridge-funding-cms-1",
  ),
  university(
    "imperial-scholarships",
    "https://www.imperial.ac.uk/study/fees-and-funding/scholarships-search/",
    "Search our scholarships",
    "h2.award-card__title a[href]",
    "www.imperial.ac.uk",
    "/study/fees-and-funding/scholarships-search/",
    "imperial-funding-cms-1",
  ),
  // ANU robots disallows all query URLs; only the unpaginated first page is approved.
  university(
    "anu-scholarships",
    "https://study.anu.edu.au/scholarships/find-scholarship",
    "Find a scholarship",
    "h4.anu-card-title a[href]",
    "study.anu.edu.au",
    "/scholarships/find-scholarship/",
    "anu-funding-cms-1",
  ),
  {
    id: "erasmus-mundus-catalogue",
    url: "https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en",
    heading: "Erasmus Mundus Catalogue",
    linkSelector: "article.ecl-card .ecl-content-block__title a[href]",
    allowedDetails: [
      { host: "www.quanteem.eu", pathPrefix: "/", exact: true },
      { host: "microscom.eu", pathPrefix: "/", exact: true },
      // Official catalogue leads inspected end-to-end but held for material
      // contradictions. Exact roots only; no extraction mapping is approved.
      { host: "emildai.eu", pathPrefix: "/", exact: true },
      { host: "www.master-egei.eu", pathPrefix: "/", exact: true },
      { host: "www.cybersure-master.eu", pathPrefix: "/", exact: true },
      ...erasmusProgrammeMappings.flatMap((mapping) =>
        [mapping.url, ...(mapping.supportPages || [])].map((raw) => {
          const url = new URL(raw);
          return { host: url.hostname, pathPrefix: url.pathname, exact: true };
        }),
      ),
    ],
    mappings: erasmusProgrammeMappings,
    restrictToSupportedDetails: false,
    directoryAdapter: "official-programme-network-1",
    bounds: { pages: 10, candidates: 100 },
    pagination: {
      selector: "a.ecl-pagination__link[aria-label=Next],a.ecl-pagination__link--next",
      pathPrefix: "/scholarships/erasmus-mundus-catalogue_en",
      queryKeys: ["page"],
    },
    review: {
      reviewedAt,
      rationale:
        "Official EACEA catalogue linked by the Erasmus+ student guidance. Server-rendered programme cards and next-page links inspected, robots permits catalogue access.",
      limitations: [
        "Programme membership is not evidence of an available scholarship: the catalogue explicitly includes schemes beyond their funding period.",
        "External programme links are retained as unapproved leads; no arbitrary consortium host is automatically allowlisted or published.",
        "EMILDAI has inconsistent full/partial package wording; EGEI lists conflicting 1,000/1,400 euro monthly amounts; CYBERSURE mixes 2026 scholarship terms with a 2027 application banner. Their exact roots enter review without approved mappings.",
        "WAVES and EU-CONEXUS Marine Biotechnology have individually reviewed exact programme/funding evidence; alternative package options count once per programme/cycle. Linked documents are references, not automatically approved fetch targets.",
      ],
    },
  },
];
