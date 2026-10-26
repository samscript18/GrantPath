# GrantPath

A scholarship discovery, evidence, eligibility and application workspace built with Next.js App Router, strict TypeScript, PostgreSQL/Prisma, Better Auth, Brevo and Cloudinary. The existing off-white/forest/amber design and typography are preserved.

**[Public preview](https://grantpath-git-release-hosted-verification-lammysam8-7688.vercel.app)** · **[Release PR #1](https://github.com/samscript18/GrantPath/pull/1)**

## Current release work — 26 October 2026

Current published release head is `2be6624def11fba477a5fcd41d85ab23bf193812`, Ready at [the immutable preview](https://grantpath-20cfsngip-lammysam8-7688.vercel.app). GLOCAL uses one server-normalized official URL across all seven actual destinations, catalogue links and metadata. Operator scenario buttons and scholarship-specific publication history make retained evidence inspectable.

Local89unit/32PostgreSQL/build/13production-browser checks pass, including nine exact scripts. The separate required native TestSprite API ownership check has passed automatically at this head with its exact saved codeVersion and actual404/403/unchanged-owner assertions. The original App suite reports6/7passed; its notification case found an undrained job batch. All correctness software steps passed, but the retained native guard correctly blocks merge. The queue-drain correction is being verified; do not infer full release readiness. The existing App/correctness requirements remain, with the API check added and strict/admin enforcement retained. Actual current receipts and remaining operational setup are in [release review](docs/RELEASE_REVIEW.md).

The expanded persisted catalogue contains **32 real source-backed records across17 actual destination countries**, six regions including Ghana, Uganda and South Africa. Counts exclude controlled fixtures and include scheme overviews and historical/closed cycles; they are not counts of open applications. GLOCAL is one joint programme spanning seven participating countries, rather than seven duplicate awards. [Actual coverage and access limits](docs/SOURCE_COVERAGE.md), [public metadata readback](docs/evidence/global-coverage.json).

Approved directory discovery now queues bounded official detail retrieval. Explicit adapter contracts and deterministic publication policies publish validated records through the same transactional service used by operators. Unsupported layouts, missing conditions, conflicting evidence and ambiguous dates remain visible exceptions. Published incomplete records carry mandatory confirmation conditions; a missing requirement cannot produce a definitive eligible outcome.

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

The production browser suite uses a separate database and sink mail on port3100. It also executes the exact seven reusable TestSprite Python scripts locally; install Python Playwright1.60.0 first. This is **local Playwright evidence, never a TestSprite pass**. Clearly labelled controlled source fixtures require explicit enablement, a test-named database and an authenticated operator. No unauthenticated reset or role-escalation route exists. They exercise the production publication/eligibility/notification services.

[Coverage matrix](docs/COVERAGE_MATRIX.md), [eligibility matrix](docs/ELIGIBILITY_MATRIX.md), [test evidence](docs/TEST_EVIDENCE.md), [focused TestSprite suite](docs/TESTSPRITE_SUITE.md), [credit ledger](docs/TESTSPRITE_CREDITS.md). Main requires correctness from GitHub Actions App15368 and TestSprite V3 from App2756476, including administrators. New heads need their own results. Prior App replay history omitted some saved assertions; exact remote coverage is assessed from execution artifacts, not a natural-language pass summary.

## Hosting and limitations

PR1 has an isolated Neon database and its own authentication secret; private student data was not copied. Automatic Neon branch lifecycle remains unavailable without API/project/baseline configuration. Vercel Hobby hosts the public preview; no paid plan or new compute was activated. See [preview setup](docs/PREVIEW_SETUP.md).

Many provider conditions remain explicit confirmation requirements. Date-only deadlines create no fabricated reminder instant. Fulbright, DAAD, MEXT, GKS, Manaaki and other overviews are not universal open cycles. Live listing coverage and restricted sources are documented honestly. No optimisation proof, broad factual correctness proof, recipient receipt, merge, Discord submission or organiser verification is implied. The organiser extension to27 October morning Nigerian time is user-supplied context.

Routing follow-up26October: user explicitly confirmed “target corrected”: active Vercel Commit status trigger now uses https://grantpath-git-{branch-slug}-lammysam8-7688.vercel.app, with Active/Merge gate retained and no manual event. This is user-confirmed configuration, not API readback. Saved notification plan separates baseline eligible from changed not_eligible and scopes exactly1alert to the new accepted version; historical alerts remain. No assertion or domain rule was removed. The next coherent evidence push must receive its own automatic run and observed balance.
