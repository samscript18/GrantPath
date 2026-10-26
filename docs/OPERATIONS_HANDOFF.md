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
