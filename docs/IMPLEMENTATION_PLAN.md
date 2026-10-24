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
