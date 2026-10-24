# GrantPath

A connected scholarship discovery, evidence, eligibility and application workspace. Next.js App Router, strict TypeScript, Tailwind and shadcn-style accessible primitives, PostgreSQL/Prisma, Better Auth, Resend and optional Inngest.

**Live URL: not deployed.** Hosted services, GitHub PR protection and TestSprite are pending account configuration. Local tests are not TestSprite results.

## Run locally

Use Node 24 LTS (24.11+), npm, and PostgreSQL 18. Versions are pinned in `package-lock.json`; run `npm ci`.

1. Copy `.env.example` to `.env`. Set `DATABASE_URL` and `DIRECT_URL` to your development PostgreSQL database. Neon uses pooled runtime and unpooled migration endpoints. Create separate databases containing `test` for `TEST_DATABASE_URL` and `E2E_DATABASE_URL`.
2. Generate a private secret with `openssl rand -base64 32`. Set `BETTER_AUTH_SECRET`. Set `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` and `TRUSTED_ORIGINS` to the same exact local origin, for example `http://127.0.0.1:3000`. Keep `APP_ENV=development` and `EMAIL_MODE=sink` locally.
3. Run:

```sh
npm ci
npm run setup:check
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open the local origin you configured. Register, then inspect the newest matching recipient in the development `EmailSink` table using `npx prisma studio`. Open its verification URL privately. Sink mail is captured, never sent. Authentication recovery uses the same sink. Do not publish captured tokens.

The seed persists 20 real source-backed records. It never overwrites accepted operator changes. Existing installations created before the final funding corrections can inspect `npm run catalogue:corrections`, then apply with `-- --apply`; this helper is restricted to local/test environments and preserves history.

Grant a verified administrator access with `npm run operator:grant -- administrator@example.org`. Roles cannot be supplied by registration or profile requests. Operator bootstrap is an explicit database administrator command with an audit entry.

## Workflows

Profile saves and accepted scholarship changes atomically queue durable events. Run `npm run jobs:run -- --limit 25` repeatedly to process bounded matching, notification and delivery work. The dashboard also offers bounded on-demand recalculation. Outbox/delivery leases, attempts, deduplication and failures are persisted in PostgreSQL. Inspect diagnostics and retry failed application events in the operator studio.

Fetching is a separate process: `npm run sources:ingest -- --limit 3`, or `--source REGISTERED_SOURCE_ID` for an explicit manual check. A manual check still enforces URL, robots, pacing and size/time policies. Failed checks exit unsuccessfully, retain accepted information and keep the prior successful timestamp. HTML extraction creates a review candidate; an operator must confirm evidence and accept it. Never enable a source until its policies and adapter coverage have been reviewed.

`.github/workflows/ingestion.yml` supports daily best-effort scheduling and manual dispatch, bounded to six sources. `.github/workflows/application-jobs.yml` separately handles matching/delivery hourly. Configure their named GitHub environments and secrets before enabling use. Schedules are not punctual guarantees; the UI reports actual attempts and successes. Failed/interrupted jobs can be rerun safely.

Alternatively, register the signed `/api/inngest` endpoint with `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY`. It performs bounded application work on the hosting runtime; **it does not move computation off Vercel**. Choose one routine application scheduler after checking free usage allowances. No source fetches execute in the Inngest/Vercel handler.

For real mail set `EMAIL_MODE=resend`, `RESEND_API_KEY` and a verified `EMAIL_FROM`; production also requires `APP_ENV=production` and HTTPS. Test recipients are isolated from live delivery. A provider-accepted response is not recipient receipt. Ambiguous acceptance beyond the safe retry window is held for investigation.

## Verification

```sh
npm run db:test-migrate
npm run check
npm run test:integration
npx playwright install chromium
npm run test:e2e
npm run build
npm run format:check
```

After building, use `PLAYWRIGHT_PRODUCTION=1 npm run test:e2e` to exercise the production server with the same isolated browser database and sink mail. CI uses this production-server variant.

Integration tests require the isolated `TEST_DATABASE_URL`. Browser tests migrate/seed a separate `E2E_DATABASE_URL`, use sink mail and repeatable `student@example.test`, `other@example.test` and `operator@example.test` accounts. Their default password exists only in guarded test tooling; optionally set `TEST_ACCOUNT_PASSWORD` before first creation. Synthetic records are labelled `[TEST ONLY]` and never seeded into development/production. Previous browser fixtures are archived, preserving test history. Browser setup changes its configured test database; never point it at a shared account database.

Playwright starts its own server on port 3100. Stop an existing Next development process in this checkout first. The suite captures screenshots after page content renders, tests the connected journeys and checks mobile overflow and keyboard skip navigation. See [actual run evidence](docs/TEST_EVIDENCE.md), [coverage](docs/COVERAGE_MATRIX.md) and [release review](docs/RELEASE_REVIEW.md). Local CI YAML is prepared; its hosted execution is unverified.

## Architecture and domain scope

`src/server` contains independent accounts, profiles, scholarships, evidence, eligibility, applications, monitoring, notifications, operator and job modules. Routes/components call those services. Immutable profile and scholarship versions, evaluations, source observations, review decisions, application history and delivery attempts support explanation and recovery. PostgreSQL transactions, advisory locks, unique keys and leased outbox rows protect concurrent work.

Eligibility engine 1.1.0 evaluates deterministic requirements with pass/fail/unknown and AND/OR groups. Exemptions are alternatives. Missing information cannot pass; unknown OR alternatives cannot become a premature failure. Current study, held qualifications, intended study, citizenship and residence remain separate. Original GPA scales and explicit provider equivalences are retained. Preference ranking cannot override a mandatory failure. Evaluations retain exact input/engine versions and evidence; obsolete jobs cannot overwrite current results.

Official availability is independent of personal application progress. Only confirmed closing instants create reminders. Tuition-only awards are labelled accordingly. Programmes and application cycles have separate identities and history.

The initial catalogue contains historical cycles and explicitly uncertain scheme overviews, not 20 currently open applications. Unmapped provider conditions remain explicit confirmation requirements. Four HTML adapters have fixture coverage; one has observed live extraction success and two smoke checks were access-blocked. Source schedules remain paused. See [source coverage and official links](docs/SOURCE_COVERAGE.md).

## Hosting, PRs and submission

Use [isolated Neon/Vercel preview setup](docs/PREVIEW_SETUP.md). Provision a separate database branch and auth secret for each trusted PR; never use production data in previews. No account, paid plan, deployment or remote repository has been created by this implementation.

The configured origin is `samscript18/GrantPath`; authenticated read inspection confirms an empty repository with admin/push access and no rulesets/workflows. Before publishing a PR, establish TestSprite trigger/cost configuration, deploy a healthy isolated preview, install/configure the TestSprite GitHub App and use its 3.0 portal. Inspect the actual credit balance and displayed estimate before a small [focused suite](docs/TESTSPRITE_SUITE.md). Configure the authentic App check as required without bypassing it. Preserve real failed-check/blocked-merge/fix/rerun evidence. The user-reported allowance is 150 credits; actual balance remains unobserved and no credited operation was initiated. [Credit ledger](docs/TESTSPRITE_CREDITS.md).

Follow [the demonstration outline](docs/DEMO.md) and [submission PR draft](docs/SUBMISSION_PR.md). Missing external credentials, remote verification, access-limited sources, time-zone/DST provider ambiguity and incomplete provider-rule mapping remain explicit release limitations.
