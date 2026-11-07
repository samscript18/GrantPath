# Production operations — 7 November 2026

The owner authorised merging the release into `main` and activating scholarship automation after the hackathon ended. The owner also authorised retiring the paid TestSprite merge requirements and PR jobs, confirmed the external TestSprite trigger is off, and confirmed the production Google OAuth callback was added. The software correctness requirement remains strict and applies to administrators. Security scanning and local Python ownership assertions remain.

## Deployment and data

- Canonical app: https://grantpath-lake.vercel.app; production branch: `main`.
- Production uses the existing app database, historically named `grantpath_pr_1_test`. Existing accounts and accepted history are preserved; no private data is copied to a new database.
- Vercel production credentials mirror the working release configuration, with production origins and `ENABLE_CONTROLLED_FIXTURES=0`.
- GitHub `ingestion` and `application-jobs` environments retain that same database and `DATABASE_TRANSPORT=neon-ws`. The application worker uses the production origin and existing Brevo/Cloudinary credentials.
- All eight migrations through `202610270008_field_search` were observed applied before activation. No seed/reset is required.

## Scholarship and application schedules

`ingestion.yml` runs at 05:23 and 17:23 UTC (06:23 and 18:23 Africa/Lagos). Each scheduled stage processes at most six due directories, details or registered legacy sources; manual runs default to one. Cadence, leases, host pacing, robots checks and retry limits still apply. The detail and legacy stages run even if an earlier fetch stage fails, while the workflow still reports the failed stage.

The twelve previously reviewed official discovery directories retain their explicit policies. Legacy sources awaiting policy review stay paused. Controlled test directories are never fetched by the workers. Validated facts can publish automatically; unsupported changes still require operator review.

`application-jobs.yml` runs hourly at minute 41. It processes matching, notifications, reminders and account maintenance. Optional Inngest remains unconfigured; GitHub Actions is the selected scheduler.

Enable the two workflows only after the reviewed code reaches `main`, then dispatch bounded verification runs. Inspect [Actions](https://github.com/samscript18/GrantPath/actions) for actual results and later events marked `schedule`. Manual success does not prove a scheduled execution occurred. GitHub cron is best effort.

Two historical runs (`40177024494`, `40177015523`) appeared queued with no jobs. Both ordinary cancellation and force-cancellation returned HTTP 409 (“has not been queued yet”) before activation. Recheck their state when enabling workflows; do not mistake them for fresh verification.

## Historical handoff

The dated material below is the preserved pre-activation record. Its lack of merge/activation authorisation and hackathon TestSprite requirements are superseded by the owner's instructions on 7 November.

---

# Operational activation handoff — 27 October 2026

This is separate from submission preparation. No merge, production rebinding or
scheduler activation is authorised by this handoff.

Current GitHub readback: workflow `395123908` (`application-jobs.yml`) and
`395123912` (`ingestion.yml`) are `disabled_manually`; correctness remains active.
TestSprite has no schedules. Manual application run `40180139452` and source run
`40180145842` succeeded at release source `e09b64d`, against the isolated preview.
They do not prove recurring execution. Old manual runs `40177015523` and
`40177024494` still appear queued; inspect and resolve them before any enablement
so an old source cannot run unexpectedly. Historical successful logs remain intact.

## Only after a separately authorised, reviewed merge

1. Confirm the desired production database and public origin. The currently verified
   preview database is `grantpath_pr_1_test`; it is an isolated test environment,
   not an inferred production student database. Do not copy private student data.
2. Bind GitHub environment **application-jobs** to the intended `DATABASE_URL`,
   `DATABASE_TRANSPORT`, `APP_URL` and the same persistent `BETTER_AUTH_SECRET`
   used by that app. Configure verified `EMAIL_FROM`, `BREVO_API_KEY` and the
   Cloudinary server credentials used for cleanup. Keep secret values out of logs.
3. Bind **ingestion** to that intended database/transport. Inspect registered source
   and directory policies, enabled flags, approved hosts/paths, cadence, retry and
   publication controls. Confirm source access policies; do not enable all sources.
4. Verify the default branch now contains the reviewed Brevo/durable worker and
   source-fetch code. Resolve the old queued manual jobs first. Enable only these
   chosen GitHub schedulers via their workflow pages; leave optional Inngest cron off.
   Application cron is `41 * * * *` (UTC); source cron is `23 5 * * *` (UTC).
5. Dispatch one small bounded run of each against the intended binding, inspect
   output and queue health, then observe later runs whose actual `event` is
   `schedule`. Record successful timestamps and source/delivery counts. GitHub cron
   is best effort. A manual dispatch is not proof that scheduling fired.

Public subject search runs in the app, independent of these workers. Its branch
preview needs the additive cache migration and server-only `VERTEX_PROJECT_ID`,
`VERTEX_LOCATION`, `VERTEX_MODEL`, and authorised Google credentials. Production
Vertex binding remains a separate decision; no production credential binding is
changed merely to publish the isolated submission preview.

Optional automatic Neon preview lifecycle still needs API/project identifiers,
a sanitised baseline, branch creation/migration and cleanup configuration. The
existing isolated preview can continue without that automation. Recipient email
receipt remains unobserved despite preserved Brevo provider acceptance/idempotence.
