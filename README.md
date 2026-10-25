# GrantPath

A connected scholarship discovery, evidence, eligibility and application workspace. Next.js App Router, strict TypeScript, Tailwind and shadcn-style accessible primitives, PostgreSQL/Prisma, Better Auth, Brevo and optional Inngest.

**[Open the live GrantPath preview](https://grantpath-git-release-hosted-verification-lammysam8-7688.vercel.app)** · **[Release PR #1](https://github.com/samscript18/GrantPath/pull/1)**

Anyone can browse the real catalogue and official evidence. The preview uses an isolated Neon database. Brevo is configured for live verification/recovery and scholarship email using the active verified sender; local test mail stays in the sink. Actual provider acceptance and duplicate suppression are verified; recipient receipt is a separate check. The connected hosted student journey passed Playwright checks. [GitHub CI](https://github.com/samscript18/GrantPath/actions/runs/40098799050) and [both authentic TestSprite cases](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094/execution/9e9aec5c-54f3-4e6f-84a0-d15e8ec68394) passed at head 81f2164. Main requires correctness CI and TestSprite V3 from their authentic Apps. Local checks remain separate from TestSprite results.

Latest follow-up release: **50570e1** adds Google login/signup, persistent System/Light/Dark appearance and guided password/confirmation forms. [GitHub CI](https://github.com/samscript18/GrantPath/actions/runs/40107749839) and the [existing two TestSprite journeys](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094/execution/e0d65db9-7c39-42f3-b1ff-4ce8f31f2234) passed. Local checks: 73 unit, 20 PostgreSQL and eight production Chromium journeys, typecheck/lint/build. Hosted feature smoke passed; the user confirmed real Google login after changing its audience to External and retrying. TestSprite balance146 after one-credit debit. GitGuardian's six synthetic checklist-string findings remain open for external review; configured secret-value scan found zero matches.

## Run locally

Use Node 24 LTS (24.11+), npm, and PostgreSQL 18. Versions are pinned in `package-lock.json`; run `npm ci`.

1. Copy `.env.example` to `.env`. Set `DATABASE_URL` and `DIRECT_URL` to your development PostgreSQL database. Neon uses pooled runtime and unpooled migration endpoints. Use `sslmode=verify-full` for hosted connections to verify the server certificate and hostname explicitly. The runtime normalises pg's legacy `prefer`, `require` and `verify-ca` aliases to `verify-full`, unless libpq compatibility is explicitly enabled; local URLs without SSL settings remain unchanged. Create separate databases containing `test` for `TEST_DATABASE_URL` and `E2E_DATABASE_URL`.
2. Generate a private secret with `openssl rand -base64 32`. Set `BETTER_AUTH_SECRET`. Set `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` and `TRUSTED_ORIGINS` to the same exact local origin, for example `http://localhost:3000`, matching `.env.example`. Keep `APP_ENV=development` and `EMAIL_MODE=sink` locally.
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

If Better Auth reports `Invalid origin`, compare the browser's full origin with those three settings. `localhost` and `127.0.0.1` are different origins, as are different ports or protocols. Align the settings with the URL you open, restart `npm run dev` after changes, and reload the page. Keep deployed settings on their exact HTTPS deployment origin; do not add local addresses or disable origin checks to fix local development.

The seed persists 20 real source-backed records. It never overwrites accepted operator changes. Existing installations created before the final funding corrections can inspect `npm run catalogue:corrections`, then apply with `-- --apply`; this helper is restricted to local/test environments and preserves history.

Grant a verified administrator access with `npm run operator:grant -- administrator@example.org`. Roles cannot be supplied by registration or profile requests. Operator bootstrap is an explicit database administrator command with an audit entry.

## Google sign-in and appearance

Google login and signup use Better Auth's Google provider. Set both server-only `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, and register the exact local/hosted callback URLs. See [Google setup, account linking and verification boundaries](docs/GOOGLE_OAUTH.md). Credentials are optional; email authentication works without them.

Choose **System**, **Light** or **Dark** using the Appearance control on public, authentication and workspace pages. The choice persists in your browser and syncs between tabs. System follows OS changes. Theme colours are applied before content paints; forms, status labels, evidence and application columns have matching palettes.

Signup and password reset include separate password/confirmation fields, independent show/hide buttons and a live automatic checklist. New passwords require 10–128 characters, lowercase, uppercase, a number and a symbol. The same policy runs on the server for signup/reset/change/set operations. Confirmation is checked in the form; only the chosen password is sent. Existing passwords continue to work at login without adopting new composition rules.

## Workflows

Profile saves and accepted scholarship changes atomically queue durable events. Run `npm run jobs:run -- --limit 25` repeatedly to process bounded matching, notification and delivery work. The dashboard also offers bounded on-demand recalculation. Outbox/delivery leases, attempts, deduplication and failures are persisted in PostgreSQL. Inspect diagnostics and retry failed application events in the operator studio.

Fetching is a separate process: `npm run sources:ingest -- --limit 3`, or `--source REGISTERED_SOURCE_ID` for an explicit manual check. A manual check still enforces URL, robots, pacing and size/time policies. Failed checks exit unsuccessfully, retain accepted information and keep the prior successful timestamp. HTML extraction creates a review candidate; an operator must confirm evidence and accept it. Never enable a source until its policies and adapter coverage have been reviewed.

`.github/workflows/ingestion.yml` supports daily best-effort scheduling and manual dispatch, bounded to six sources. `.github/workflows/application-jobs.yml` separately handles matching/delivery hourly. Configure their named GitHub environments and secrets before enabling use. Schedules are not punctual guarantees; the UI reports actual attempts and successes. Failed/interrupted jobs can be rerun safely.

Alternatively, register the signed `/api/inngest` endpoint with `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY`. It performs bounded application work on the hosting runtime; **it does not move computation off Vercel**. Choose one routine application scheduler after checking free usage allowances. No source fetches execute in the Inngest/Vercel handler.

For real mail set `EMAIL_MODE=brevo`, `BREVO_API_KEY` and an active verified Brevo `EMAIL_FROM`; production also requires `APP_ENV=production` and HTTPS. Run `npm run email:check` for a read-only account/sender check. See [Brevo setup and retry semantics](docs/BREVO.md). Test recipients are isolated from live delivery. A provider-accepted response is not recipient receipt. Ambiguous acceptance beyond the safe retry window is held for investigation.

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

Playwright starts its own server on port 3100. Stop an existing Next development process in this checkout first. The suite captures screenshots after page content renders, tests the connected journeys and checks mobile overflow and keyboard skip navigation. See [actual run evidence](docs/TEST_EVIDENCE.md), [coverage](docs/COVERAGE_MATRIX.md) and [release review](docs/RELEASE_REVIEW.md). Latest local checks: 62 unit tests, 15 PostgreSQL tests, five production-browser journeys and production build passed. The same CI workflow completed on GitHub after correcting its build-only environment; the first failure remains linked in the evidence.

## Architecture and domain scope

`src/server` contains independent accounts, profiles, scholarships, evidence, eligibility, applications, monitoring, notifications, operator and job modules. Routes/components call those services. Immutable profile and scholarship versions, evaluations, source observations, review decisions, application history and delivery attempts support explanation and recovery. PostgreSQL transactions, advisory locks, unique keys and leased outbox rows protect concurrent work.

Eligibility engine 1.1.0 evaluates deterministic requirements with pass/fail/unknown and AND/OR groups. Exemptions are alternatives. Missing information cannot pass; unknown OR alternatives cannot become a premature failure. Current study, held qualifications, intended study, citizenship and residence remain separate. Original GPA scales and explicit provider equivalences are retained. Preference ranking cannot override a mandatory failure. Evaluations retain exact input/engine versions and evidence; obsolete jobs cannot overwrite current results.

Official availability is independent of personal application progress. Only confirmed closing instants create reminders. Tuition-only awards are labelled accordingly. Programmes and application cycles have separate identities and history.

The initial catalogue contains historical cycles and explicitly uncertain scheme overviews, not 20 currently open applications. Unmapped provider conditions remain explicit confirmation requirements. Four HTML adapters have fixture coverage; one has observed live extraction success and two smoke checks were access-blocked. Source schedules remain paused. See [source coverage and official links](docs/SOURCE_COVERAGE.md).

## Hosting, PRs and submission

Use [isolated Neon/Vercel preview setup](docs/PREVIEW_SETUP.md). PR 1 uses a separate database on the existing Neon compute and a unique auth secret; Neon branch API automation is not configured. Vercel Hobby hosts the preview in iad1 with Node 24. No paid plan or extra compute was activated. Never use main catalogue/student data in preview tests.

The native [TestSprite 3.0 project](docs/testsprite/PROJECT.md) contains two focused cases for discovery/evidence and profile/application persistence. Both passed in the first real PR execution and the App posted its report on PR 1. A second automatic execution also passed both cases; total observed debit 2, balance 148. Review found gaps in the generated replay assertions, so both saved scripts now contain explicit checks and passed locally before the next automatic verification. New commits require their own actual result. [Credit ledger](docs/TESTSPRITE_CREDITS.md).

Follow [the demonstration outline](docs/DEMO.md) and [submission PR draft](docs/SUBMISSION_PR.md). Missing external credentials, remote verification, access-limited sources, time-zone/DST provider ambiguity and incomplete provider-rule mapping remain explicit release limitations.

Final published Brevo head: `6b6399f`. [GitHub CI](https://github.com/samscript18/GrantPath/actions/runs/40103723073) and [App execution](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094/execution/daa54b31-5049-41d8-b1c5-e50d30b00675) passed; observed credits147. The App timeline retains older recorded actions, so some exact assertions remain locally verified only. The supplemental strict replay was declined before execution. Final ledger/evidence changes are kept as local documentation updates to avoid another documentation-only automatic credited run; the deployed product remains at the published head.

The final PR-description update was declined before execution; it is not claimed as published. The deployed source/lockfile and authentic passing check results remain available on PR1.

Account security, time-zone editing, export/deletion and Cloudinary configuration are documented in [Account controls](docs/ACCOUNT_CONTROLS.md). These local follow-up changes are unpublished and unverified while testing and GitHub publication are paused.

Provider images are managed in Operator studio → University & foundation images and stored on Cloudinary. `npm run providers:images -- --discover` prepares bounded official-source candidates for review; mark only inspected candidates as reviewed before `--publish-reviewed`. `--report` records actual persisted metadata. See [provider image evidence](docs/evidence/provider-images.json) for current development coverage and access limits. Institutions without reviewed images display initials.
