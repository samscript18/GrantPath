# Release review — 24 October 2026

[Live public preview](https://grantpath-git-release-hosted-verification-lammysam8-7688.vercel.app) · [Release PR 1](https://github.com/samscript18/GrantPath/pull/1)

GrantPath is implemented across all eight workstreams. The public Vercel preview uses a separate Neon database. Hosted student journeys and GitHub CI passed. TestSprite's first authentic App execution passed both cases, and its App-specific status is required on main. Remaining production setup is listed below.

## Implemented and verified

- Better Auth registration, verification, password recovery, sessions/logout/return and server ownership/operator permissions; versioned staged profiles. Actual hosted registration/verification used captured test mail. Production recipient delivery is not inferred.
- Twenty persisted real catalogue records with official evidence, immutable programme/cycle versions, search/filter/pagination and protected curation. Historical/uncertain cycles are labelled. Neon migration, accepted publication and zero-duplicate replay were checked.
- Independent deterministic eligibility engine 1.1.0: unknowns, alternatives/exemptions, original GPA scales, final-year completion conditions, separate preferences and stale-job protection. Bounded generated/reference comparisons and domain outcome matrix passed.
- Private saves, notes, checklists, seven personal progress states/history, dashboard and exact historical assessments. Hosted save/profile/return persistence passed.
- Four scoped source adapters, bounded standalone ingestion, durable attempts/reviews/publication/timelines/outbox and interruption recovery. Operator acceptance separately confirms cycle identity and checked operational evidence. One successful real extraction, two access-blocked source checks; no policy bypass.
- Durable inbox/delivery preferences, deduplication, retries and confirmed-instant reminders. Controlled PostgreSQL and browser change/outage/replay/suppression checks passed using sink mail.
- Latest local checks: 56 unit tests, 14 PostgreSQL tests, five production-browser journeys, typecheck/lint and production build passed. Actual hosted browser assertions covered catalogue/evidence, test-only signup restriction, captured-email verification, staged profile, explained matches, saved plan, permissions, return and 360px layout. Screenshots were inspected.
- Full [GitHub CI run 40098799050](https://github.com/samscript18/GrantPath/actions/runs/40098799050) passed after the preserved build-environment failure/fix. Main requires its exact correctness check from github-actions App 15368, strict and including administrators. Blocked merge state was observed while pending, clean after success. This is not TestSprite gate evidence.

## Implemented but externally unverified

Real Resend acceptance/retry/recipient delivery, signed Inngest execution, scheduled source/application workflows, automatic Neon branch lifecycle and an actual failing TestSprite regression/blocked-red/fix sequence. Read-only Resend access works but no custom sender domain is verified. TestSprite native V3 project and two cases exist; the user reported App/trigger connected and an authentic terminal PR status/comment reported both cases passed. The required context is TestSprite V3 from App 2756476, read back from GitHub protection. Balance after execution: 149, debit 1. See TESTSPRITE_CREDITS.md for subsequent results.

## Remaining setup and acceptance

| Dependency        | Precise remaining work                                                                                                                                                                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resend            | Verify a sender domain and configure EMAIL_FROM before public real-email registration. Observe provider acceptance separately from recipient receipt. Preview remains labelled development/sink with test-only signup.                                                                                            |
| TestSprite        | First execution passed both cases and its authentic App status is required. Verify automatic execution at the final documentation head. A failing TestSprite regression/blocked-red/fix sequence has not been performed; preserved GitHub CI failure/fix evidence is separate.                                    |
| Preview isolation | PR 1 has a dedicated database on existing compute. Neon API key/project/baseline branch are absent, so automated per-PR branch creation/cleanup remains unverified. Dedicated DB does not isolate compute or the owner role.                                                                                      |
| Scheduler         | Choose/configure one application scheduler; Inngest keys and GitHub job-environment secrets remain absent. Durable jobs wait until processed; bounded on-demand matching works.                                                                                                                                   |
| Sources           | Review terms/robots and activate supported sources individually. UCL/Oxford checks were HTTP 403; CSC live extraction is unverified. All source cadences stay paused.                                                                                                                                             |
| Submission        | Add final authentic App result and gate evidence to PR/README. The hackathon page lists project submissions closing 22 October 2026 Pacific; the current date is 24 October. Organiser confirmation is required before claiming eligibility/extension. Do not send a Discord submission without user instruction. |

## Limits

Provider rules deliberately retain confirmation clauses for unmapped conditions. This is not twenty open, completely machine-mapped opportunities. New cycles require separate operator records; adapters do not invent them. Confirmed instants require explicit supported dates/zones; ambiguous wording remains uncertain. Source and application schedules are best effort. Email acceptance is not recipient receipt. Chromium desktop/360px checks are not a comprehensive assistive-technology, cross-browser or load audit. Local throttled measurements are not hosted field performance.

No paid plan, credit purchase, source-policy bypass, production data reset or weakened merge gate was used. No currently known failing local assertions remain after the recorded fixes. TestSprite is reported separately from local/browser/CI checks.
