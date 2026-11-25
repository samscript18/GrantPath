import type { DirectoryDefinition } from "../server/discovery/types";
export const currentCallDirectories: DirectoryDefinition[] = [
  {
    id: "csc-current-calls",
    url: "https://cscuk.fcdo.gov.uk/scholarships/",
    heading: "Scholarships",
    linkSelector: "article h2.entry-title a[href]",
    directoryAdapter: "official-recent-call-links-1",
    dynamicDetail: "official-government-call-1",
    allowedDetails: [
      {
        host: "cscuk.fcdo.gov.uk",
        pathPrefix: "/scholarships/commonwealth-shared-scholarships-applications/",
        exact: true,
      },
    ],
    mappings: [],
    restrictToSupportedDetails: true,
    bounds: { pages: 1, candidates: 10 },
    review: {
      reviewedAt: "2026-11-25",
      rationale:
        "Official FCDO archive and actual current Shared Scholarship call inspected. /shared/ redirects to the explicitly reviewed canonical scholarship route; robots permits the route. The call states 2027/28 applications are now open and gives 8 December 2026, 16:00 GMT as closing time.",
      limitations: [
        "University admission and scholarship applications are separate; unknown full eligibility remains mandatory confirmation.",
        "The archive publication date is not used to infer current availability.",
      ],
    },
  },
  {
    id: "ediss-current-calls",
    url: "https://www.master-ediss.eu/",
    heading: "News",
    linkSelector: ".news-content h3 a[href]",
    directoryAdapter: "official-recent-call-links-1",
    dynamicDetail: "official-programme-call-1",
    allowedDetails: [
      {
        host: "www.master-ediss.eu",
        pathPrefix: "/upcoming-application-rounds-ediss-intake-7/",
        exact: true,
      },
      { host: "www.master-ediss.eu", pathPrefix: "/programme/", exact: true },
      { host: "www.master-ediss.eu", pathPrefix: "/scholarship/", exact: true },
    ],
    mappings: [],
    restrictToSupportedDetails: true,
    bounds: { pages: 1, candidates: 20 },
    review: {
      reviewedAt: "2026-11-25",
      rationale:
        "Official programme home/news links to the intake application announcement. Robots permits inspected routes; article identifies the 2027–29 intake and explicitly separates scholarship and self-funded periods. Programme identity and funding remain validated against the two already reviewed supporting pages.",
      limitations: [
        "Only the reviewed intake route is fetch-authorised; later intake routes require source-policy review.",
        "Self-funded and waiver-only periods are not substituted for the EMJM/EDISS scholarship application period.",
      ],
    },
  },
];
