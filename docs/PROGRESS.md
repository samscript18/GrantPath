# Progress

## Inspection

- Read the source PRD and user requirements. Initial repository contained only the PRD; no existing code, package configuration, Git repository, credentials or remote.
- Local Node and PostgreSQL tools exist. No running PostgreSQL server was discovered at default socket.
- No ancestor AGENTS.md was found in the inspected project ancestry.

## Phase status

| Phase           | State                                                      | Remaining acceptance                                                                                           |
| --------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1 Foundation    | Implemented; local and hosted preview journey verified     | Production sender and authentic TestSprite gate pending                                                        |
| 2 Catalogue     | Implemented; locally verified                              | Bounded catalogue and evidence; unresolved provider conditions explicit                                        |
| 3 Eligibility   | Implemented; locally verified                              | Engine 1.1.0; independent comparisons and domain matrix pass                                                   |
| 4 Experience    | Implemented; locally verified                              | Connected account, profile, evidence and application browser journeys pass                                     |
| 5 Monitoring    | Implemented; locally verified                              | 4 adapter contracts; 1 successful live extraction, 2 access-blocked smoke checks; scheduled activation pending |
| 6 Notifications | Implemented; locally verified                              | Durable sink/inbox/preference/reminder checks pass; Resend/Inngest remote verification pending                 |
| 7 Protection    | Local checks and GitHub correctness gate verified          | Two real TestSprite cases passed; authentic App gate required; final-head rerun pending                        |
| 8 Polish        | Local/hosted design inspected; public preview and PR exist | Final-head automatic check and submission timing/remaining provider setup                                      |

## External setup pending

Neon pooled/direct database access, Resend API access, Vercel Hobby access and TestSprite API access are now configured in ignored .env. Neon migration and 20 accepted catalogue records are verified, with an idempotent zero-publication replay. TestSprite account inspection reports 150 credits and no projects. A Vercel Next.js project exists; deployment and Git linkage are underway. Resend has no verified custom domain, so mail stays in isolated sink mode. Neon branch API, Inngest signing keys, native TestSprite 3.0 suite/App trigger and authentic merge gate remain pending. The live public preview and PR exist. Hosted browser checks and GitHub CI passed, as did the first two-case authentic TestSprite execution (balance 149). Main requires the exact TestSprite App status. See REMOTE_RELEASE.md for the current continuation state.

## Phase 1 local increment

Implemented strict Next.js/Tailwind/shadcn-style primitives, responsive navigation and account screens, Better Auth verification/recovery/session flow, private versioned staged profiles, PostgreSQL migration and transactional profile outbox, local CI configuration, preview isolation instructions/helper, and focused TestSprite setup/journey specification. Local typecheck, validation tests, two PostgreSQL account/ownership/recovery journeys and production build pass. Browser inspection and release-wide verification continue in later phases. Remote acceptance (Neon/Vercel/Resend/TestSprite/authentic merge blocking) remains pending access; it is not marked complete.

## Phase 2 local increment

20 source-backed catalogue records have been persisted through the accepted-version service. This includes historical closed cycles, four Warwick streams, and explicitly labelled scheme/uncertain-cycle overviews; it is not a claim of 20 currently open fully verified applications. Official pages were inspected; unknown deadlines, unitemised funding and additional provider conditions remain uncertain. Search, filters, pagination, public details, field evidence, accepted history, protected JSON rule/evidence authoring and duplicate-cycle protection are implemented. Unit checks pass; PostgreSQL catalogue tests and browser review are in progress. Supported registry sources are disabled pending access-policy review, not falsely shown as successfully monitored.

## Phase 3 local increment

Implemented a standalone three-valued rule engine, AND/OR alternatives and exemptions, citizenship/residence separation, present and completed qualifications distinct from future study, final-year completion boundaries, original-scale GPA/provider equivalences, language score/validity, declared experience units and provider-reference date conditions. Ranking cannot override ineligibility. Immutable evaluation records use exact profile/scholarship/engine versions, with stale-job rejection and explicit historical/updating UI. Added readable assessment breakdowns and rule/profile/outcome matrix. Local 24 unit tests pass; version/concurrency PostgreSQL tests are running. Initial real catalogue retains provider-confirmation clauses for unmapped conditions rather than claiming complete eligibility coverage.

## Phase 4 local increment

Implemented profile-driven dashboard and current/historical assessment states, private idempotent saves, preserved records on unsave, personal notes/checklists, all seven statuses with history, board/list views, saved collection and confirmed-deadline priorities. Private mutations have persistent per-user throttles and origin checks. Local typecheck/lint and 5 PostgreSQL tests pass; focused Playwright rerun is in progress after fixing save confirmation persistence. Source fetching and notification processing remain separate upcoming workers.

Phase 4 browser acceptance now passes locally: 3 focused Playwright journeys, with a separate browser-test PostgreSQL database. The app is connected through account/profile → assessment/evidence → save → application plan → sign out/return. Browser and integration databases are isolated from the development catalogue. TestSprite and hosted acceptance remain externally unverified.

## Phase 5 local increment

Implemented registry/cadence/manual requests, four explicit adapters, bounded allowlisted fetching with robots policy and persistent host pacing, observation/review/history, old/new timeline, operator acceptance/rejection with reasons, transactional publication, durable paginated matching fan-out and leased outbox recovery. Standalone CLI and scheduled/manual GitHub ingestion workflow are provided; ingestion does not run inside Vercel or share the matching worker. Controlled change/outage/replay integration passes. Live smoke coverage is one successful Twente extraction plus UCL/Oxford access blocks; schedules remain paused pending policy review. GitHub workflow activation is externally unverified.

## Phase 6 local increment

Implemented private paginated inbox/read states, topic/channel preferences, relevant new-match and accepted-change alerts, exact-version/evaluation links, seven-/one-day confirmed-instant reminders, durable deduplication and delivery leases/attempts/backoff, suppression using current preferences and saved/current-match relevance, email sink isolation, Resend idempotency and accepted-versus-captured diagnostics. Added optional signed Inngest steps and separate GitHub application-jobs scheduler; neither fetches sources. 35 unit and 11 PostgreSQL tests plus production build pass. Real Resend/Inngest account operation, hosted schedules and TestSprite remain externally unverified.

## Phase 7 local increment

50 local unit tests and 12 PostgreSQL integration tests pass. Independent logical reference comparison covers 2,000 generated and 882 exhaustive small-grammar cases. Exact reason codes, unknown alternatives, country identity, complete qualification history, stale work, ownership, interruption and exhausted leases are checked. Input is bounded before recursive rule parsing. Engine changes are versioned at 1.1.0. Final connected browser/operator/notification review continues. No remote TestSprite or merge-block evidence is claimed.

## Phase 8 local release increment

Added live database-backed landing examples, source-interpretation corrections with preserved history, mobile/editorial refinements, explicit source timestamps, readable error recovery, profile idempotence and final publication/cycle/reminder safeguards. Reviewed actual desktop/360px screenshots across the main product. Five connected Chromium journeys passed against development and the local production server; exact final runs are in TEST_EVIDENCE.md. A separate unavailable-database error/retry smoke passed. Setup, architecture, coverage, release, demonstration and submission documents are prepared. External acceptance and submission remain blocked by the precisely recorded account/configuration gaps.

Final domain checks: 54 unit tests and 14 PostgreSQL integration tests pass, including bounded reminder progress and delayed-window suppression. Source application-link changes are reviewed rather than guessed. Preserved local failure/fix evidence is separate from the unavailable authentic remote gate.

Final production Chromium run: 5 passed in 38.7s. Local release implementation committed as 7e2b2d7. GitHub admin/push access is now verified; publication remains pending TestSprite account/trigger/cost inspection (including possible branch-push/draft triggers) and hosting setup. The user reconfirmed a 150-credit allowance but does not know the App settings. No credited operation, push, PR or deployment occurred; no configured automatic gate was disabled.
