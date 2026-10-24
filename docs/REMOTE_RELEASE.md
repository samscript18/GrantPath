# Remote release continuation — 24 October 2026

Current work follows the user's original eight-phase release objective. Do not restart from scaffolding or claim remote results before they occur.

## Observed configuration

- TestSprite official CLI 0.15.0, read-only `usage`: Free plan, **150 credits remaining**, `creditsPerRun: 0.5`; all required read/write/run/tunnel scopes present. Project listing returned no projects. No credited operation or test run has started. Preserve about 50 credits for final verification.
- Neon pooled and direct endpoints work. The configured database was empty. Foundation migration applied. Initial seeding hit Prisma's default five-second transaction timeout after 16 accepted records; failed publication rolled back. With a bounded 20-second transaction timeout, replay published four remaining versions. Verification: **20 opportunities, 20 published, 20 accepted versions, zero enabled sources**. Next seed replay published zero versions. Local integration/browser databases remain separate.
- Resend read-only API works; **no verified custom domains** exist and configured EMAIL_FROM uses resend.dev. Arbitrary student production email is therefore not verified. EMAIL_MODE remains sink. No mail was sent.
- Vercel credential is now in ignored .env. The user pasted a token in chat; asked them to revoke/replace it and keep the replacement in .env. Never reproduce the pasted token. Read-only API confirms Hobby team `team_jAmivNBBx7FXNR4KIS8MwOoo`, slug `lammysam8-7688`, user default team. New GrantPath project created: `prj_fc9kH8zZ7suILDSOauVg5Oegf7Xw`, Next.js, Node 24.x, iad1, no Git link yet, public-preview access. No paid plan activated or deployment created yet. `.vercel/project.json` is ignored.
- Neon role has CREATEDB permission. Use a separate preview database for the trusted PR; never point test fixtures at the main database. No Neon API key/project ID is available for branch automation, so a dedicated database is a possible isolation fallback; record the exact choice and check provider allowance.
- GitHub origin samscript18/GrantPath, empty at last read; admin/push access through Git credential helper. No ruleset/workflow initially existed. `git fetch origin` and creating `release/hosted-verification` were requested; inspect actual branch/result. No push/PR is claimed yet.
- Subsequent release publication: main and release/hosted-verification pushed; PR https://github.com/samscript18/GrantPath/pull/1 opened. Vercel Git link works, head attribution maps to the account owner, automatic builds succeeded. Preview database `grantpath_pr_1_test` migrated/seeded with 20 initial versions and branch environment configured; current pre-configuration deployment needs a fresh build to capture those settings. Main deployment has no production credentials and is not a verified live product.
- First GitHub PR CI 40098135936 failed build because APP_ENV=test was inherited. Build-only development/sink override added; production guard retained. Hosted preview banner and non-test signup restriction added. After these changes: 56 unit, 14 integration, production build and 5 production browser journeys (42.8s) pass. Commit/push this coherent fix before hosted checks.

## Local changes underway

- PrismaPg bounds connect at 15s and queries at 20s; interactive transactions maxWait 10s, timeout 20s. Fixes observed Neon seed failure without dropping atomicity.
- Outbox profile/scholarship fan-out now inserts batches with createMany/skipDuplicates instead of one request per recipient; original event keys and stale-owner transaction guards retained.
- Reminder scheduling inserts the selected durable rows in one batch.
- Optional Inngest HTTP steps process one event/delivery per step, keeping work bounded on Vercel.
- Typecheck/lint and 54 unit tests passed; 14 local PostgreSQL integration tests passed after batching (10.55s). Build passed (2.9s compilation, 5.4s TypeScript). Production Playwright suite passed: 5 tests in 38.9s after all batching changes. Ready to commit this coherent release fix.

## TestSprite requirements from the user-provided pages

Read [hackathon requirements](https://www.testsprite.com/hackathon-s4) and [GitHub integration guide](https://docs.testsprite.com/web-portal/integrations/github-integration).

The submission requires a public deployed URL, a suite built in the 3.0 portal and a PR carrying the real GitHub App result. Localhost/CLI-only local execution is not that evidence. The App does not deploy. Configure its PR trigger from a sample PR that already has a successful live preview, detect the deployment-finished event, resolve that PR's URL, and keep blocking automatic PR verification enabled once configured. A Send Test Event queues a credited run: inspect balance/estimate first and avoid duplicating it with a manual run for the same commit. Do not install a similarly named substitute local check.

The page currently lists project submissions closing **22 October 2026, 11:59 PM Pacific**; current client date is **24 October 2026**. It also says final schedules are confirmed in Discord. Do not claim submission eligibility or an extension without organiser confirmation. Finish the product and real verification independently.

## Next work

1. Complete local production-browser check and commit the remote-latency fix/evidence before publishing.
2. Publish the already locally verified app as the initial main baseline and present the real Neon fix/hosted verification in one release PR, preserving local history and avoiding force pushes. First inspect fetched refs; do not overwrite remote work. No TestSprite project/deployment exists yet, so the documented deployment-trigger prerequisites are not met; do not guess a paid check result.
3. Use the actual PR number for an isolated Neon preview database, migrate/seed reviewed real catalogue data, configure a unique preview auth secret and sink mail, then link/deploy the Vercel project at the exact release commit. Keep production email/domain gaps explicit.
4. Verify the live preview, then create a small focused native V3 suite, observe costs, and configure the actual GitHub App trigger/gate. API key does not prove App installation or portal consent. No purchases, scheduled TestSprite runs or duplicate manual/automatic runs.
5. Update README/live URL, PROGRESS, TEST_EVIDENCE, TESTSPRITE_CREDITS and PR details with actual results only.

Ignored `.local/testsprite-read.mjs` wraps pinned CLI read commands with secret redaction and telemetry disabled; `.local/vercel-project.mjs` creates/inspects only GrantPath and writes ignored Vercel linkage. Neither is production domain logic. Never print .env contents or Git credential-helper output.
