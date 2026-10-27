# GrantPath

The owner subsequently requested a **30.5-credit API starting minimum**. The updated script preserves a **30-credit reserve** plus the conservative0.5-credit run allowance; authentication, exact-source verification and ownership assertions are unchanged. This coherent publication also carries the confirmed18-case manifest. Preflight balance48.1; one automatic18-case App run plus native API verification estimates9.2 total, leaving38.9. New-head results are pending; earlier budget-stop receipts remain historical.

A scholarship discovery, evidence, eligibility and application workspace built with Next.js App Router, strict TypeScript, PostgreSQL/Prisma, Better Auth, Brevo and Cloudinary. The existing off-white/forest/amber design and typography are preserved.

**[Public preview](https://grantpath-git-release-hosted-verification-lammysam8-7688.vercel.app)** · **[Release PR #1](https://github.com/samscript18/GrantPath/pull/1)**

## Submission candidate — 27 October 2026

GrantPath explains scholarship eligibility with official evidence, separates unknown requirements from eligibility, supports global and joint-programme destinations, and keeps private application progress. Approved directory/detail workers publish validated observations with immutable history, deterministic exception handling and durable notifications.

The catalogue currently has **32 real records from 23 providers across 17 destination countries and six regions**: seven open, two upcoming, five closed and eighteen with availability unknown. There are 23 cycle records and nine scheme overviews. These are not 32 open calls. [Coverage and limits](docs/SOURCE_COVERAGE.md).

Semantic **Field of study** search is included in this release branch with the owner's approval. Vertex Gemini 3.8 Flash relates subjects such as Chemistry and organic synthesis using public accepted scholarship content. Shared cached results, strict output validation, committed global call limits, bounded inputs/timeouts and an explicit text-only fallback protect the public filter. Ranking and mandatory eligibility stay separate. [Setup and verification](docs/FIELD_OF_STUDY.md).

The owner-approved required TestSprite manifest now contains **18 cases**: six original CLI, three manual portal companions and nine portal AI-generated cases. The owner retired the controlled eligibility/change-notification case and the generated notification/read-state case, removing those TestSprite requirements. Historical results remain preserved. Coverage includes discovery/evidence, profiles/applications, global/joint identity, publication/replay, exceptions, private notes, notification evidence and navigation. Native API ownership remains separately required.

The owner explored the live app and used **Add Tests with AI**; ten generated cases passed 10/10, with nine retained after the later retirement. [Generation evidence](docs/PORTAL_GENERATION.md). At published source `253e8df2fc0ca31c28112ad29449831bb21ab837`, all 18 retained cases have passing GitHub-triggered histories. The [whole App execution](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094/execution/9be2c6bb-6ba5-484c-966d-204a7c1ac2ba) still reports18/19 passed,1 blocked because it included the subsequently deleted case. No fresh18-case whole-suite success is claimed. CI software checks, GitGuardian and Vercel passed; the native API job stopped before execution at its 50-credit reserve guard. The second retirement/count update is local and has not triggered another paid run. [Current handoff](docs/FINAL_HANDOFF.md), [actual status](docs/evidence/notification-retirement-final-status.json).

An authentic [residence-clearing regression](docs/evidence/global-native-red-gate.json) failed TestSprite, blocked merge, was fixed and subsequently passed. Routine schedules remain disabled; optional Neon lifecycle and recipient email receipt remain separate limits. PR1 remains unmerged; no submission has been posted.

## Run locally

Use Node24 LTS, npm and PostgreSQL18. Dependencies and lockfile are pinned.

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

The seed persists32 reviewed records idempotently and never overwrites an accepted later version. Migration007 preserves legacy IDs/versions and backfills the former single-country locations. Register locally, inspect the recipient's captured verification mail in `EmailSink` through Prisma Studio and open its private link. Never publish captured tokens.

Neon runtime connections support `DATABASE_TRANSPORT=tcp` (default) or `neon-ws` (TLS WebSocket443 for official Neon hosts). The latter was added after TCP5432 became unreachable from this machine. Migration tooling still uses `DIRECT_URL` over TCP. Hosted TCP settings use `sslmode=verify-full`; the runtime makes pg's existing verified alias behaviour explicit. It does not disable certificate verification.

Grant a verified administrator with `npm run operator:grant -- administrator@example.org`. Registration/profile requests cannot supply roles. See [Google OAuth](docs/GOOGLE_OAUTH.md), [Brevo](docs/BREVO.md) and [account controls](docs/ACCOUNT_CONTROLS.md) for provider setup. Google and email identities remain distinct. In-app password changes require the current password and an emailed six-digit code before revoking sessions. Private exports are encrypted/one-time; account deletion has a cancellable seven-day grace period.

## Sources and automatic publication

Source roles are distinct: approved directory URLs discover candidates, programme/detail URLs supply facts, and application URLs direct students to providers. Source fetching runs outside Vercel:

```sh
npm run sources:discover -- --limit 1
npm run sources:discover -- --details --limit 1
npm run sources:ingest -- --limit 1
```

Only reviewed registry hosts/paths are accepted. Fetches enforce public-network DNS, HTTPS, manual redirect rejection, robots, response/time limits, persisted host pacing, leases, retry limits, pagination and run quotas. A403 or inaccessible robots endpoint defers the source; it never closes an award or advances successful verification.

Directory definitions and semantic contracts live in `src/data/global-sources.ts` and `src/server/discovery`. New unmapped links enter review. Operators can pause fetching and automatic publication separately, retry exhausted work, inspect evidence/reason codes and accept/reject exceptions. CLI policy registration requires an explanatory reason; `--register-details DIRECTORY_ID` is a transparent manual fallback, not a claim of automatic discovery. Existing legacy source adapters retain their review flow.

Each observation stores adapter/schema versions, content/mapping fingerprints, evidence and validation. Decisions retain policy version, actor, before/after values, accepted version and downstream event IDs. Advisory locks and unique programme/cycle identities prevent duplicate publication. A new cycle creates a new record; a reversal appends a new version. Missing extracted material does not erase accepted requirements or funding.

## Durable application work and mail

```sh
npm run jobs:run -- --limit 20
npm run email:check
```

Profile saves and accepted publications atomically enqueue durable matching/notification events. Evaluations retain profile, scholarship and engine versions; stale jobs cannot replace current results. Preference ranking is separate from eligibility and uses actual country identities/participating institutions. Engine1.3.0 retains deterministic pass/fail/unknown, AND/OR/exemptions, original academic scales and provider-specific equivalences. Unknown alternatives cannot silently fail or pass.

GitHub `application-jobs.yml` is the chosen routine application scheduler, separate from `ingestion.yml` source work. Encrypted named environments are configured against the isolated PR1 database; actual dispatch/schedule results are recorded in release evidence. GitHub schedules execute default-branch workflows and are best effort; unmerged branch configuration alone does not establish cron activation. No merge is performed to activate schedules.

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

The production browser suite uses a separate database and sink mail on port3100. It also executes the exact nine reusable TestSprite Python scripts locally; install Python Playwright1.60.0 first. This is **local Playwright evidence, never a TestSprite pass**. Clearly labelled controlled source fixtures require explicit enablement, a test-named database and an authenticated operator. No unauthenticated reset or role-escalation route exists. They exercise the production publication/eligibility/notification services.

[Coverage matrix](docs/COVERAGE_MATRIX.md), [eligibility matrix](docs/ELIGIBILITY_MATRIX.md), [test evidence](docs/TEST_EVIDENCE.md), [focused TestSprite suite](docs/TESTSPRITE_SUITE.md), [credit ledger](docs/TESTSPRITE_CREDITS.md). Main requires correctness from GitHub Actions App15368 and TestSprite V3 from App2756476, including administrators. New heads need their own results. Prior App replay history omitted some saved assertions; exact remote coverage is assessed from execution artifacts, not a natural-language pass summary.