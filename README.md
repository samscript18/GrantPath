# GrantPath

A scholarship discovery, evidence, eligibility and application workspace built with Next.js App Router, strict TypeScript, PostgreSQL/Prisma, Better Auth, Brevo and Cloudinary.

**[GrantPath](https://grantpath-lake.vercel.app)** · [Original release PR](https://github.com/samscript18/GrantPath/pull/1)

## Project status — 7 November 2026

The hackathon has ended. GrantPath continues as an independent project, with `main` as its production branch. It explains scholarship eligibility with official evidence, keeps unknown requirements explicit, supports global and joint-programme destinations, and saves private application progress.

GitHub Actions runs bounded scholarship discovery and detail fetching at **06:23 and 18:23 Africa/Lagos** (05:23 and 17:23 UTC), with up to six due directories/details/sources per stage. Approved source policies, robots checks, host pacing and evidence validation still apply. Unsupported or conflicting changes go to operator review. The separate application worker runs hourly at **:41** to process matching, notifications and account work. GitHub schedules are best effort; inspect actual runs in [Actions](https://github.com/samscript18/GrantPath/actions). See [operations](docs/OPERATIONS_HANDOFF.md) for bindings and verification.

Paid TestSprite PR jobs and merge requirements are retired with the owner's approval. Typecheck, lint, unit tests, PostgreSQL integration tests and production-browser journeys remain in CI, including local execution of the reusable Python assertions. Security scanning remains enabled. Historical TestSprite evidence is retained in [the hackathon handoff](docs/FINAL_HANDOFF.md); it is not a claim about current CI.

The **27 October catalogue snapshot** contained 32 real records from 23 providers across 17 destination countries and six regions: seven open, two upcoming, five closed and eighteen with availability unknown. It contained 23 cycle records and nine scheme overviews, not 32 open calls. These counts change as sources are checked. [Coverage and limits](docs/SOURCE_COVERAGE.md).

Semantic **Field of study** search uses Vertex Gemini 3.8 Flash on public accepted scholarship content. Shared caching, validated results, global call limits and a text-only fallback bound its use. Mandatory eligibility and ranking remain separate. [Setup](docs/FIELD_OF_STUDY.md).

[Demo guide](docs/DEMO.md)

## Run locally

Use Node 24 LTS, npm and PostgreSQL 18. Dependencies and lockfile are pinned.

1. Copy `.env.example` to ignored `.env`. Set `DATABASE_URL` and migration `DIRECT_URL`. Use separate databases containing `test` for `TEST_DATABASE_URL` and `E2E_DATABASE_URL`. Never use a student account database for browser setup.
2. Generate `BETTER_AUTH_SECRET` using `openssl rand -base64 32`. Align `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` and `TRUSTED_ORIGINS` with the exact origin you open. `localhost` and `127.0.0.1` are different origins. Keep `APP_ENV=development`, `EMAIL_MODE=sink` locally.
3. Install and initialise:

```sh
npm ci
npm run setup:check
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The seed persists 32 reviewed records idempotently and never overwrites an accepted later version. Migration 007 preserves legacy IDs/versions and backfills the former single-country locations. Register locally, inspect the recipient's captured verification mail in `EmailSink` through Prisma Studio and open its private link. Never publish captured tokens.

Neon runtime connections support `DATABASE_TRANSPORT=tcp` (default) or `neon-ws` (TLS WebSocket 443 for official Neon hosts). The latter was added after TCP 5432 became unreachable from this machine. Migration tooling still uses `DIRECT_URL` over TCP. Hosted TCP settings use `sslmode=verify-full`; the runtime makes pg's existing verified alias behaviour explicit. It does not disable certificate verification.

Grant a verified administrator with `npm run operator:grant -- administrator@example.org`. Registration/profile requests cannot supply roles. See [Google OAuth](docs/GOOGLE_OAUTH.md), [Brevo](docs/BREVO.md) and [account controls](docs/ACCOUNT_CONTROLS.md) for provider setup. Google and email identities remain distinct. In-app password changes require the current password and an emailed six-digit code before revoking sessions. Private exports are encrypted/one-time; account deletion has a cancellable seven-day grace period.

## Sources and automatic publication

Source roles are distinct: approved directory URLs discover candidates, programme/detail URLs supply facts, and application URLs direct students to providers. Source fetching runs outside Vercel:

```sh
npm run sources:discover -- --limit 1
npm run sources:discover -- --details --limit 1
npm run sources:ingest -- --limit 1
```

Only reviewed registry hosts/paths are accepted. Fetches enforce public-network DNS, HTTPS, manual redirect rejection, robots, response/time limits, persisted host pacing, leases, retry limits, pagination and run quotas. A 403 or inaccessible robots endpoint defers the source; it never closes an award or advances successful verification.

Directory definitions and semantic contracts live in `src/data/global-sources.ts` and `src/server/discovery`. Candidate selection distinguishes opportunity pages from navigation and evidence-only links. Unsupported selected detail layouts enter review. The Twente directory has a structured award template; explicit academic cycles and unconfirmed scheme overviews remain separate. Operators can pause fetching and automatic publication separately, retry exhausted work, inspect evidence/reason codes and accept/reject exceptions. CLI policy registration requires an explanatory reason; `--register-details DIRECTORY_ID` is a transparent manual fallback, not a claim of automatic discovery. Existing legacy source adapters retain their review flow.

Each observation stores adapter/schema versions, content/mapping fingerprints, evidence and validation. Decisions retain policy version, actor, before/after values, accepted version and downstream event IDs. Advisory locks and unique programme/cycle identities prevent duplicate publication. A new cycle creates a new record; a reversal appends a new version. Missing extracted material does not erase accepted requirements or funding.

## Durable application work and mail

```sh
npm run jobs:run -- --limit 20
npm run email:check
```

Profile saves and accepted publications atomically enqueue durable matching/notification events. Evaluations retain profile, scholarship and engine versions; stale jobs cannot replace current results. Preference ranking is separate from eligibility and uses actual country identities/participating institutions. Engine 1.3.0 retains deterministic pass/fail/unknown, AND/OR/exemptions, original academic scales and provider-specific equivalences. Unknown alternatives cannot silently fail or pass.

GitHub `application-jobs.yml` is the chosen routine application scheduler, separate from `ingestion.yml` source work. Both workers use the existing app database, also bound to the main deployment. Its historical name is `grantpath_pr_1_test`; existing accounts and accepted history are preserved. Controlled fixture operations are disabled in production. GitHub schedules execute default-branch workflows and are best effort.

Optional Inngest uses the hosting runtime and is not simultaneously activated. No source fetch occurs inside the Vercel/Inngest application handler. Set `EMAIL_MODE=brevo`, `BREVO_API_KEY` and active verified `EMAIL_FROM` for live mail. Current preferences/relevance and provider idempotency are checked at delivery. Provider acceptance is not recipient receipt. Test mail remains isolated; `.test` recipients never receive external messages.

Cloudinary stores signed, bounded account/provider images. Existing identities without reviewed assets retain initials. The actual disposable upload/read/remove/cleanup smoke is [recorded separately](docs/evidence/cloudinary-account-smoke.json).

## Verification and release evidence

```sh
npm run db:test-migrate
npm run check
npm run test:integration
npm run build
npx playwright install chromium
PLAYWRIGHT_PRODUCTION=1 npm run test:e2e
npm run format:check
```

The production browser suite uses a separate database and sink mail on port 3100. It also executes the exact nine reusable TestSprite Python scripts locally; install Python Playwright 1.60.0 first. This is **local Playwright evidence, never a TestSprite pass**. Clearly labelled controlled source fixtures require explicit enablement, a test-named database and an authenticated operator. No unauthenticated reset or role-escalation route exists. They exercise the production publication/eligibility/notification services.

[Coverage matrix](docs/COVERAGE_MATRIX.md), [eligibility matrix](docs/ELIGIBILITY_MATRIX.md), [test evidence](docs/TEST_EVIDENCE.md), [focused TestSprite suite](docs/TESTSPRITE_SUITE.md), [credit ledger](docs/TESTSPRITE_CREDITS.md). Main requires the software correctness check from GitHub Actions, including administrators. The TestSprite results in these documents describe historical executions; paid external TestSprite runs are no longer required for merges.

Catalogue growth follow-up: [diagnosis, actual source scope, verification and activation](docs/DISCOVERY_GROWTH.md). Source commands now distinguish new candidates from newly published scholarships and append outcome counts to the GitHub step summary.

Development catalogue expansion uses `scripts/grow-development-catalogue.ts` and the [measured source ledger](docs/evidence/catalogue-growth-ledger.json). It requires an explicit `GROWTH_DATABASE_URL` pointing to a local database named `grantpath_growth_test`; it refuses other database targets and does not load `.env`. Migrate and seed a fresh, isolated database before its first run. Existing catalogue data is preserved on subsequent runs.

```sh
GROWTH_DATABASE_URL=postgresql://mac@127.0.0.1:55434/grantpath_growth_test \
  node --import tsx scripts/grow-development-catalogue.ts \
  --sources uq-scholarships,auckland-scholarships --details 30
```

Each run explicitly enables only the selected reviewed policies in this isolated database, checks bounded directories, processes pending candidates, verifies a published-record replay, reads the catalogue back and pauses those policies when finished. Keep runs for the same source sequential. `--phase directory` queues without extracting; `--phase details` processes the existing pending queue. Failed candidates require explicit `--retry-failed`. The ledger can be refreshed without source access using the same environment variable and `scripts/growth-ledger.ts`. `--rounds 1..5` performs finite sequential sweeps using saved pagination cursors. `--include-review` retries eligible review records only in the first round, without clearing attempt limits or identity holds; `--review-only` targets review records. Inspect the cause before any explicit retry. Interrupting the runner with SIGINT/SIGTERM pauses selected policies after its current bounded operation. New batches for the same directory must not overlap.

Apply additive migration `202611240009_discovery_pagination_cursor` to the intended isolated database before using continuation cursors. Never reset an existing catalogue. Run `scripts/verify-development-catalogue.ts` with the same explicit local environment for read-only record/filter/eligibility/event validation. It writes `docs/evidence/catalogue-growth-validation.json`. `GET /api/matches?page=2` continues current matching results in 50-record pages; summary counts cover the whole catalogue.

To browse this separate catalogue, start the application with `DATABASE_URL` and `DIRECT_URL` explicitly set to that local database, `DATABASE_TRANSPORT=tcp`, `APP_ENV=development`, `EMAIL_MODE=sink`, and local authentication/origin URLs. The API readback is `/api/scholarships?availability=all`; the page is `/scholarships?availability=all`. The current isolated catalogue backup is `.local/growth/grantpath_growth_test.dump` (ignored by Git). Default development commands continue to use your existing environment configuration.

Application-window enrichment uses additive migration `202611250010_application_windows`. The optional window metadata preserves calendar-only dates and distinguishes rolling consideration and unannounced cycles without claiming they are open. New catalogue filters are `availability=unannounced`, `rolling`, and `confirmation`; `unknown` includes all three categories.

For the isolated catalogue, `scripts/reprocess-development-windows.ts` previews retained-evidence reinterpretation by default; `--apply` uses the existing publication policy and transactional immutable publisher. It never invents a cycle or fetch timestamp, changes eligibility/funding, creates future annual deadlines, or activates schedules. Review the saved initial analysis before applying. `scripts/verify-development-support-windows.ts` performs at most three existing-programme checks against approved primary/support URLs and pauses the isolated policy in `finally`. Unsupported/missing supporting evidence stays in review. Date-only opening boundaries and funding availability still require fresh source checks; they do not generate instant-based reminders.

`src/data/source-onboarding.json` is a proposed-source backlog, not crawler authorization. Resolve institutional targets to actual funding directories, inspect robots and page structures, implement and test an extraction contract, and record the approval rationale before adding a policy to `growth-sources.ts`. External partner links remain unapproved leads. Production onboarding still requires explicit operator registration/activation through the existing source tools; these scripts never enable production schedules.
