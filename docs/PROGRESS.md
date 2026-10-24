# Progress

## Inspection

- Read the source PRD and user requirements. Initial repository contained only the PRD; no existing code, package configuration, Git repository, credentials or remote.
- Local Node and PostgreSQL tools exist. No running PostgreSQL server was discovered at default socket.
- No ancestor AGENTS.md was found in the inspected project ancestry.

## Phase status

| Phase           | State       | Remaining acceptance                                                                                |
| --------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| 1 Foundation    | In progress | Implementation and local persistence/ownership journey; external preview/auth mail/TestSprite gates |
| 2 Catalogue     | Pending     | Official evidence and persistent catalogue                                                          |
| 3 Eligibility   | Pending     | Rules, matrix and independent verification                                                          |
| 4 Experience    | Pending     | Connected private journey                                                                           |
| 5 Monitoring    | Pending     | Adapters and recovery verification                                                                  |
| 6 Notifications | Pending     | Durable delivery and replay verification                                                            |
| 7 Protection    | Pending     | Local suites and external merge-gate evidence                                                       |
| 8 Polish        | Pending     | Browser review and release docs                                                                     |

## External setup pending

No project secrets are configured: Neon database/project, Resend API key and verified sender, Vercel project/account, GitHub repository/remote and permissions, Inngest keys, TestSprite portal/GitHub App and actual credit balance. Independent work continues using isolated local PostgreSQL and email sink where possible. No deployed URL or remote results exist.

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
