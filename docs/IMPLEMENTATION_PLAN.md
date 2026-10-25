# GrantPath implementation plan

The source PRD is `docs/GrantPath_PRD.docx` (read 24 October 2026). Implement phases in order, with acceptance evidence and honest external gates tracked separately.

1. **Foundation and first journey:** strict Next.js, PostgreSQL/Prisma migrations, Better Auth, email verification/recovery, ownership, versioned profile, design system, CI, repeatable isolated accounts, preview configuration, initial TestSprite journey specification.
2. **Real catalogue and evidence:** provider/programme/cycle identities, immutable accepted versions and field evidence, official-source research, search/filter/pagination, operator curation, duplicate protection.
3. **Explainable eligibility:** independent three-valued deterministic rule engine, alternatives/exemptions/date/GPA handling, complete profiles, ranking, versioned evaluations, outcome matrix.
4. **Personal experience:** dashboard, explained details, saved applications, private notes/checklists/status history, persisted navigation and recalculation state.
5. **Monitoring:** explicit adapters, bounded standalone ingestion, durable checks/candidates/reviews, semantic comparison, transactional publication/outbox, historical changes, GitHub scheduled/manual jobs.
6. **Notifications:** inbox/preferences, durable event fan-out and delivery, deduplication, confirmed-instant reminders, current preference suppression, Resend idempotency and diagnostics.
7. **Release protection:** independent reference evaluator, generated/exhaustive cases, ownership/concurrency/stale-work/recovery tests, focused browser journeys; authentic TestSprite and merge-gate verification only when accounts are available.
8. **Polish and submission:** rendered browser review/mobile/accessibility, all view states, README/coverage/run evidence/credit ledger/known limitations/demo outline, final release review.

## Verification policy

Run local typecheck, lint, Vitest and PostgreSQL integration tests before browser verification or remote paid checks. Do not buy services or activate paid plans. Do not invent verification, deadlines, deployments, TestSprite balances or results. Preserve approximately 50 of the user-reported 150 TestSprite credits for final verification; inspect actual balance and displayed cost before credited operations.

## Requested follow-up — 24 October 2026

Add optional Google OAuth through Better Auth, shared accounts and safe verified-email linking; persistent System/Light/Dark appearance across the connected product; password confirmation, independent visibility controls and live automatic requirements for signup/reset, enforced by shared server rules. Verify locally before one meaningful preview release; preserve the automatic App gate and record real Google consent separately from fixture/redirect checks.

## Current follow-up and UI priority

The subsequent user request replaces same-email account linking with separate original sign-in methods. Implement durable two-minute verification resend limits and countdowns, searchable original profile choices, a focused official academic reference library, notification switches, branded loading, and a settings hub.

The latest instruction explicitly pauses testing and GitHub publication. Focus on the reload experience and visual design: persistent workspace layout, client-side search navigation, inline preference saves, page-level loading/error states, refined forest navigation, editorial settings, appearance previews and clearer profile stages. Resume checks and publication only when the user requests it; do not treat these latest UI edits as verified.

## Account controls follow-up

Implement reference-inspired password/session and privacy/data screens with real domain services; add six-digit email confirmation before in-app password changes, owned session revocation, encrypted one-time export and cancellable seven-day deletion. Move new photos to server-signed Cloudinary with durable cleanup. Inline time-zone editing and standalone reference navigation complete the settings changes. Migration004 is applied locally; provider/security journeys, private screenshots, preview migration and publication remain pending while the user's testing/GitHub pause is active. See ACCOUNT_CONTROLS.md.

## Onboarding and institutional imagery follow-up

Use two-column session rows and an automatically presented, resumable study-profile modal for unfinished student sign-ins. Separate persisted onboarding completion from actual eligibility. Add source-attributed institutional images on Provider, protected Cloudinary upload/edit controls, standalone policy-aware discovery/reviewed publication, compact accessible bookmark controls and shared editorial polish. Migrations005/006 and six real provider image imports are applied to development only. Commit all repository changes as explicitly requested, keeping ignored secrets local; tests, private browser journeys, preview updates and GitHub pushes remain paused.

## Second editorial design pass

Refine every page through shared navigation, typography, surfaces, forms and recovery layouts, plus distinct landing/catalogue/dashboard/application/inbox/profile/settings/reference/operator compositions. Keep current fonts/colors and deterministic domain behaviour. Use actual browser screenshots to refine public desktop/mobile/dark presentation; record private views as unreviewed where authenticated access is unavailable. Keep automated checks and GitHub publication paused; retain the user's preference for complete local commits.

## Continuation — 25 October 2026: global discovery and release

The user resumed verification/publication and requested three connected outcomes. Preserve the existing application and data.

1. Establish baseline: refresh PR/deployment/protection/TestSprite; run existing local checks; record stale generated-type recovery.
2. Add country-code/multiple-destination modelling with additive backfill, preserving IDs, versions and profiles; update filters/ranking/presentation.
3. Implement approved-directory discovery, persisted candidate jobs/observations, bounded network policies and deterministic publication decisions. Reuse the transactional publisher/outbox, retain exception review and pause controls.
4. Research official opportunities across five regions/fifteen countries (three African destinations); import only retrieved, supported facts through the publication pipeline. Record actual coverage/blocked sources, distinguish overviews/cycles.
5. Extend operator transparency and focused production-path unit/PostgreSQL/browser tests; complete existing unpublished account/UI verification.
6. Configure one application scheduler and separate bounded source discovery, verify authorised manual runs; keep preview isolated and never copy private student data.
7. Inspect saved TestSprite assertions/trigger, validate focused scripts locally, obtain authentic controlled-regression failure/blocked gate/fix/pass evidence within actual credits (50 reserve).
8. Batch reviewable release pushes, reconcile PR/docs and verify final-head CI/deployment/App checks. Do not merge or submit externally.
