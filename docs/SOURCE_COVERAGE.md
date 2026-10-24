# Source catalogue and supported scope

Research date: 24 October 2026. Initial collection: 20 real source-backed records across 11 provider identities. These include known closed cycles and labelled scheme overviews; this count is not an open-opportunity statistic. The database is the runtime catalogue. The researched bootstrap data lives in `src/data/catalogue.ts` and is persisted idempotently by `npm run db:seed`. Re-seeding never overwrites later operator versions.

| Official source | Records / scope | Important uncertainty |
|---|---|---|
| [Oxford Clarendon](https://www.ox.ac.uk/admissions/graduate/fees-and-funding/funding/clarendon/applicants) | Graduate programme, 2027/28 | Course-specific funding deadline; part-time grant differs |
| [Oxford Weidenfeld-Hoffmann](https://www.ox.ac.uk/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search/weidenfeld-hoffmann-scholarships-and-leadership-programme) | Selected graduate courses, 2027/28 | Country of ordinary residence, eligible course, return-home and statement conditions |
| [Reach Oxford](https://www.ox.ac.uk/admissions/undergraduate/fees-and-funding/oxford-bursaries-and-scholarships/reach-oxford) | Undergraduate, 2027 | Date published, closing time not stated; details due January |
| [Oxford A–Z](https://www.ox.ac.uk/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search/scholarships-a-z-listing) | Ertegun, Academic Futures, Jardine, 2027/28 | Course/context/ordinary-residence/partner-college requirements need individual review |
| [CSC Master’s](https://cscuk.fcdo.gov.uk/scholarships/commonwealth-masters-scholarships/) | 2027/28 cycle, closed | Country, refugee/protected-person alternatives and contextual qualifications must be reviewed; no GPA conversion |
| [Chevening](https://www.chevening.org/scholarships/) | 2027/28 scheme overview | Country-specific application timing and eligibility; global availability remains unknown |
| [UCL Global Master’s](https://www.ucl.ac.uk/scholarships/ucl-global-masters-scholarship) | 2026/27 closed cycle | Financial need, overseas fee status, complete admission application |
| [UCL Global Undergraduate](https://www.ucl.ac.uk/scholarships/ucl-global-undergraduate-scholarship) | 2026/27 closed cycle | Award packages differ: tuition-only awards do not guarantee maintenance |
| [Bristol Think Big](https://www.bristol.ac.uk/students/support/finances/scholarships/think-big-scholarships/) | 2026 entry | Page describes 2026 course eligibility; no guessed current window |
| [ETH ESOP](https://ethz.ch/students/en/studies/financial/scholarships/excellencescholarship.html) | Autumn 2027 | Published closing-time wording is inconsistent; no confirmed instant or countdown |
| [Warwick PGR](https://warwick.ac.uk/services/dc/schols_fund/applicants/competitions/) | Faculty, Interdisciplinary, AHRC, China Scholarship Council streams, 2027/28 | Stream-specific project/admission/current-student and CSC conditions |
| [Twente UTS](https://www.utwente.nl/en/education/scholarship-finder/university-of-twente-scholarship/) | 2027/28 | CET is preserved as the provider’s explicitly printed fixed offset; language subscores, fee status and exclusions need review |
| [Leiden LExS](https://www.universiteitleiden.nl/en/scholarships/sea/leiden-university-excellence-scholarship-lexs) | December 2026 selection | Study intake and closing time need confirmation; nationality has programme exemptions |
| [NL Scholarship](https://www.studyinnl.org/finances/nl-scholarship) | 2026/27 institution-administered scheme | Each institution has its own cycle deadline and requirements; not a separate university-level award |
| [Australia Awards](https://www.dfat.gov.au/people-to-people/australia-awards/australia-awards-scholarships) | Programme overview, cycle unconfirmed | Country programme determines actual study levels, requirements and dates |

## Evidence and matching scope

The initial rules check supported deterministic conditions and retain an explicit provider-confirmation requirement for unmapped conditions. A checked page is not an assertion that all admission/visa/financial/contextual conditions have been encoded. Public results therefore remain potential where provider review is necessary; provider confirmation cannot silently pass. Synthetic comprehensive rule scenarios belong only in isolated tests.

## Access limitations observed

Old Clarendon URL returned 404 and was replaced by the current Oxford page. Gates Cambridge URLs returned 410; Campus France and Swedish Institute retrieval returned 403; Cambridge Trust, DAAD and some Sheffield/Maastricht paths could not be retrieved in the research tool. Those unverified opportunities are not fabricated into the catalogue. Retrieval access through a search tool does not establish that standalone scheduled fetching is permitted. Adapters require separate policy and robots checks before enabling cadence.
