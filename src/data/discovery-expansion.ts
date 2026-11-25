import type { DirectoryDefinition } from "@/server/discovery/types";

// Code review makes a source available for onboarding. It does not register,
// enable, schedule or automatically approve it in any database.
export const expansionDirectories: DirectoryDefinition[] = [
  {
    id: "csc-degree-directory",
    url: "https://cscuk.fcdo.gov.uk/scholarships/",
    heading: "Scholarships",
    linkSelector: "article h2.entry-title a[href]",
    allowedDetails: [{ host: "cscuk.fcdo.gov.uk", pathPrefix: "/scholarships/" }],
    pagination: {
      selector: ".pagination a[href],a.next.page-numbers[href]",
      pathPrefix: "/scholarships/page/",
      queryKeys: [],
    },
    mappings: [],
    restrictToSupportedDetails: true,
    dynamicDetail: "csc-opportunity-1",
    review: {
      reviewedAt: "2026-11-24",
      rationale:
        "Official UK government FCDO scholarship commission host; server-rendered scholarship archive links and degree-detail headings inspected. Robots returned 200 and permits these paths for GrantPath.",
      limitations: [
        "Master’s route remains with the existing legacy adapter to preserve its identity.",
        "Fellowships and host guidance excluded.",
        "Funding prose and conditions retained; complete eligibility and application windows remain unconfirmed.",
        "Pagination policy is bounded; no second page was advertised in the inspected listing.",
      ],
    },
  },
  {
    id: "sheffield-postgraduate-directory",
    url: "https://sheffield.ac.uk/international/fees-and-funding/scholarships/postgraduate",
    heading: "Postgraduate scholarships",
    linkSelector: "main article a[href]",
    allowedDetails: [
      {
        host: "sheffield.ac.uk",
        pathPrefix: "/international/fees-and-funding/scholarships/postgraduate/",
      },
    ],
    mappings: [],
    restrictToSupportedDetails: true,
    dynamicDetail: "sheffield-postgraduate-1",
    review: {
      reviewedAt: "2026-11-24",
      rationale:
        "University-owned Sheffield domain; directory and Ferguson scholarship HTML inspected. Robots returned 200 and permits these paths. Supported detail template requires eligibility, application and terms sections plus explicit institution/level evidence.",
      limitations: [
        "No pagination advertised.",
        "Chevening route excluded to avoid duplicating the existing government scheme.",
        "Other layouts are candidates for review, not assumed compatible.",
        "Funding and conditions retained as original prose; no inferred full-funding label or application instant.",
      ],
    },
  },
  {
    id: "mandela-rhodes-directory",
    url: "https://www.mandelarhodes.org/scholarship/",
    heading: "The Scholarship",
    linkSelector: "main a[href]",
    allowedDetails: [{ host: "www.mandelarhodes.org", pathPrefix: "/scholarship/apply/" }],
    mappings: [],
    restrictToSupportedDetails: true,
    dynamicDetail: "mandela-rhodes-1",
    review: {
      reviewedAt: "2026-11-24",
      rationale:
        "Foundation-owned domain identifies the Mandela Rhodes Scholarship and links directly to its application guidance. Robots returned 200; GrantPath routes permitted. Financial support and application sections inspected.",
      limitations: [
        "Current application page mixes Applications for 2027 closed and Applications for 2028; held for review.",
        "Honours is retained in prose and never mapped to an unsupported degree enum.",
        "A single scheme, not a separate scholarship for each participating university.",
      ],
    },
  },
];
