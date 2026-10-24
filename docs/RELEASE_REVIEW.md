# Release review — 24 October 2026

GrantPath is implemented as one persistent local application across all eight workstreams. Hosted and authentic PR-gate acceptance remain blocked by external configuration. This is not a claim of a deployed or fully remotely verified release.

## Implemented and locally verified

- Verified account creation, password recovery, logout/return, session and server permission enforcement; private versioned staged profiles.
- A persisted 20-record real catalogue with official field evidence, immutable programme/cycle versions, search/filter/pagination and protected curation. Historical and uncertain scheme records remain labelled.
- Deterministic eligibility engine 1.1.0, explicit unknowns/alternatives/exemptions, original GPA scales, final-year completion conditions, explainable ranking and stale-job protection.
- Private saves, notes, checklists, all seven personal progress states and history; dashboard and exact historical assessments.
- Four scoped source adapters, bounded standalone ingestion, durable observations/retries, review/publication, timelines, outbox fan-out and interruption recovery. Operator acceptance separately confirms cycle identity and checked operational evidence.
- In-app updates, preferences/read states, confirmed-instant reminders, channel deduplication, durable delivery retries/diagnostics, isolated mail capture and held uncertain provider acceptance.
- Independently authored rule reference, generated/exhaustive bounded cases, PostgreSQL ownership/concurrency/recovery checks, browser journeys and rendered editorial desktop/360px review. Actual commands/results are recorded in TEST_EVIDENCE.md.
- Local production build and throttled mobile smoke measurement. Measurement is local, not hosted or representative field data.

## Implemented, externally unverified

Neon-compatible Prisma schema/migrations; Vercel configuration; isolated-preview branch helper; Resend authentication/scholarship mail; signed Inngest application jobs; GitHub local CI, source-ingestion and application-job workflows; focused TestSprite journey and required-gate setup instructions.

## Exact blocking setup

| Dependency      | Required configuration / action                                                                                                 | Evidence still required                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| GitHub          | Intended repository/remote, trusted PR branch and permission to configure rulesets/environments                                 | Real PR URL; hosted CI; authentic App check required for exact PR head                                                   |
| Neon            | Project, free-allowance review, pooled DATABASE_URL and unpooled DIRECT_URL; API key/project/empty-baseline branch for previews | Migration, persistence and one isolated preview branch in the account                                                    |
| Vercel          | Project/account permissions, free usage review, project/org IDs/token where needed, exact deployment origins and unique secrets | Real preview/live URL and connected journey at the deployed head                                                         |
| Resend          | API key, verified sender/domain, production EMAIL_FROM/EMAIL_MODE                                                               | Actual provider acceptance and failure/retry diagnostics; receipt must be separately observed                            |
| Scheduler       | Choose GitHub application jobs or Inngest; configure environment secrets or signed endpoint keys                                | Actual scheduled/manual runs, recovery and runtime limits under permitted usage                                          |
| Source policies | Review provider terms/robots and supported extraction, enable individually                                                      | Live source success per adapter, without bypassing 403 restrictions                                                      |
| TestSprite 3.0  | Portal and GitHub App access, observed balance and displayed run estimate, exact isolated preview/head                          | Focused result, actual debit/balance, failed-check blocked merge, fix and successful rerun with authentic check required |

No credited TestSprite operation was initiated. The user-reported allowance is 150; actual remaining balance is unknown. No purchase, paid-plan activation, deployment, PR or remote gate demonstration occurred.

## Remaining limitations and defects

- Initial provider rules are deliberately incomplete: unmapped conditions retain confirmation requirements. The initial real catalogue does not assert fully automated eligibility for every provider.
- Programme/cycle creation is an operator task. Every source review must confirm the existing cycle; a new cycle gets a separate record. Adapters do not automatically open new cycles or infer country-specific windows.
- Four adapters are contract-tested; only Twente has observed successful standalone live extraction. UCL/Oxford smoke checks were blocked by source/robots HTTP 403; CSC live extraction is unverified. Scheduled toggles remain paused.
- Confirmed deadlines require a supported explicit year/time/zone. Ambiguous multi-date/time wording returns no instant. Delayed reminders are suppressed after their own window. Provider wording and DST conflicts may need human resolution.
- Source and application schedules are best effort and need activation. Without a running scheduler, durable jobs wait; users can request bounded match recalculation and operators can rerun workers.
- Email provider acceptance/recipient receipt and all hosted paths remain unverified. Old uncertain acceptance is held instead of blindly resent.
- Browser review covers Chromium at desktop and 360px, reduced motion, skip navigation and page-error capture. It is not a comprehensive assistive-technology, cross-browser or hosting-load audit. A separate controlled unavailable-database production smoke verified the shared mobile error/retry screen.
- Development browser runs logged request cancellation/stream errors during navigation while asserted journeys and page-error checks passed. Production-server verification is recorded separately in TEST_EVIDENCE.md; these development logs are not reported as a clean server-log result.

There are no currently known failing local assertions after the recorded fixes. External acceptance is pending, not passed. Consult PROGRESS.md before resuming and finish the blocking setup without weakening the merge gate or buying credits.

The user reconfirmed 150 credits but does not know the App configuration. No local TestSprite credential/profile or connected tool was found. Its documented branch-push and Include Draft PRs options mean neither pushing nor creating a draft is an established zero-credit workaround. Remote publication is pending portal trigger/cost inspection; existing automatic verification was not disabled. GitHub administrator access is available and is no longer the missing dependency.
