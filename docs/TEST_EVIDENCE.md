# Test evidence

No application verification has run yet. Entries below will record actual commands, outcomes, environment and limitations. Local tests are never TestSprite results.

## External release evidence

TestSprite run, account credit balance, authentic required-check enforcement, blocked merge, fix PR, successful rerun, Neon provisioning, Vercel preview and Resend acceptance are pending configuration. No credited operation has been started.

## Phase 1 — 24 October 2026

- `npm run typecheck`: passed after correcting Better Auth's inferred generic instance type.
- `npm test`: 4 profile/configuration tests passed (incomplete state, separate citizenship/residence, zero, invalid grading/date/time zone, unsafe production config).
- `npm run db:migrate` and `npm run db:test-migrate`: foundation migration applied to separate local PostgreSQL 18 development and test databases on loopback port 55432.
- `npm run test:integration`: 2 connected PostgreSQL tests passed. Verified registration, server-controlled student role, email-sink verification, save, cross-account isolation, origin rejection, sign-out invalidation, sign-in persistence, password recovery, reset-token replay rejection and old-password rejection.
- First integration run: 1 passed, 1 failed because distinct test users shared the same simulated client IP and hit the enabled authentication throttle. Fixed the fixture to give clients distinct documentation-range IPs; rate limiting remains enabled. This is local test-fixture evidence, not TestSprite or blocked-merge evidence.
- `npm run build`: production Next.js build passed; 11 routes generated.
- Dependency installation first failed on the resolver 6 optional peer graph. Pinned compatible resolver 5.2.2. Npm initially reported nested Inngest/Zod advisories; overriding Inngest's Zod to the patched root version (which retains zod/v3 exports) resulted in npm reporting 0 advisories. Inngest endpoint runtime verification remains for phase 6.

No production email was sent. Sink capture is not recipient receipt. No hosted deployment or TestSprite operation occurred.

## Phase 2 — 24 October 2026

- `npm run db:seed`: 20 official-source records persisted; 20 immutable initial versions published transactionally. No fictional public records. Source cadence disabled pending policy review.
- `npm test`: 9 tests passed, including validation of all 20 real records, evidence/rule consistency, tuition-only funding protection, uncertain-deadline protection, semantic normalisation and availability boundary.
- `npm run typecheck` and `npm run lint`: passed for the catalogue increment.
- Local Playwright Chromium rendered the landing page successfully (HTTP 200); inspected `/private/tmp/grantpath-foundation.png`. Warm off-white/forest navigation and editorial layout render correctly at 1440px. Full mobile/connected browser coverage remains for phase 8. In-app Browser's required execution tool is not exposed in this session; the explicitly requested local Playwright is used for browser tests and screenshots.
- PostgreSQL catalogue suite: passed (3 integration tests total with accounts). Verified protected publication, unchanged replay, one version/event, persisted search, duplicate-cycle rejection and a separate next cycle retaining the first.
- Seed replay: 20 records, **0** initial versions published. Existing accepted records were preserved.

## Phases 3–4 — 24 October 2026

- `npm test`: 24 tests passed, including three-outcome AND/OR logic, unknown alternatives, valid language exemption, exact final-year completion boundary, GPA scale uncertainty/provider equivalences, declared work-hour units, language validity and age boundaries, ranking exclusion and generated dominance properties.
- `npm run test:integration`: 5 PostgreSQL tests passed. Concurrent profile writes reject one conflicting version; a requirement change makes the previous result historical, the new evaluation changes to not eligible, and old work is rejected as stale. Five concurrent saves create one application and one initial history entry; private notes/checklists/status persist; foreign actors cannot read/update/unsave/remove them. Personal Applied status leaves the official window open.
- Auth suite now explicitly asserts verification-link replay returns 400. The application persists a one-time verification-token hash before sending and consumes it atomically. Password reset replay remains rejected.
- First full Playwright run: 1 passed, 2 failed. Mobile public pages at 360px had no horizontal overflow and empty filters recovered. One test used a fleeting recalculation confirmation and was corrected to assert the API's completed result plus current recommendations. Another exposed an application editor remount clearing success feedback; fixed the component key and retained the confirmation. Its assertion was scoped to the exact saved-plan message rather than all live regions. Preserved initial screenshots in `docs/evidence/local-browser-initial-*.png`; these are local Playwright evidence, not TestSprite or merge-block evidence.
- One attempted browser run could not start because this Next.js version permits one dev server per checkout. Stopped the owned preview before retrying; no deployment or production process was affected.
- Browser rerun after feedback fix: application journey and mobile checks passed; dashboard test found synthetic integration fixtures in the shared test database occupying the ranked shortlist. Split browser tests onto a separate `grantpath_e2e_test` database (also configured in CI) instead of weakening the expected real-catalogue outcome.
- Final phase 4 focused Playwright run: **3 passed in 19.2s**. Verified real registration/captured-email verification, all onboarding stages including omitted optional grouped fields, current explained matches, sign-out and return with separate citizenship/residence; persistent catalogue filters and official funding evidence; idempotent save, private note/status reload and separate provider window; 360px no-overflow pages and empty-filter recovery. Captured actual dashboard, application and mobile screenshots under ignored `test-results/`.

## Phase 5 — 24 October 2026

- Controlled source processing integration passed: baseline review, proposed target-level change, protected operator approval, correct new eligibility failure with exact reason, unchanged replay with no new accepted event, old versions retained, source outage preserving accepted data and last-success timestamp.
- Implemented four scoped HTML adapters and bounded network/robots/host-delay checks. Local adapter tests cover scoped extraction, layout failure, date certainty, private-address/URL rejection, crawl policy, irrelevant navigation and flat conjunction-list reordering.
- Actual standalone live smoke check: UCL page 403; Oxford robots 403 (page not fetched); Twente succeeded at 2026-10-24T10:51:44.879Z and persisted a candidate review. Scheduled cadence remains paused. No candidate was auto-published. See SOURCE_COVERAGE.md for the precise supported/access-limited scope.
- A review integration initially rejected a confirmed candidate because marking extracted evidence checked changes the candidate hash. Publication now verifies the operator’s pending review and exact base version under the scholarship lock, allowing explicit operator corrections/confirmations; validation and role checks remain enforced.
- Phase 5 local final check: typecheck, lint and **33 unit tests passed**. PostgreSQL recovery tests initially had a clock fixture create a job after the supplied claim time; fixed the fixture's availableAt rather than changing claim eligibility. Recovery now passes: one concurrent owner, expired-lease takeover, stale-owner write rejection and durable retry backoff. Source normalisation now ignores flat conjunction list ordering.

## Phase 6 — 24 October 2026

- Local typecheck/lint and **35 unit tests passed**. Production build passed with 23 routes including inbox/preferences, operator diagnostics and the signed Inngest adapter.
- PostgreSQL suite: **11 tests passed**. Notification assertions cover concurrent queue deduplication, one inbox item and one sink email, exact captured/published states, cross-account read denial, read idempotence, preference changes suppressing already queued messages, unsaving suppression, simulated post-provider interruption with a stable idempotency key, and uncertain-state holding after the provider retry window. Confirmed open deadlines produce seven-/one-day events once; unknown and closed deadlines produce none.
- No Resend request was made: local email assertions use the isolated database sink. Provider acceptance and recipient receipt remain externally unverified.
- External discovery: connected GitHub repository search returned no GrantPath repository. Neon and Vercel integrations exist but were not installed/connected. No TestSprite integration/account access or observed balance was found. Optional integration suggestions do not provision accounts or activate plans.

## Phase 7 — 24 October 2026

- Independent oracle: `tests/fixtures/reference-eligibility.ts` imports no production engine/rule helpers. It uses numeric Boolean intervals and min/max to determine outcomes for the tested monotone grammar. The production engine matched **2,000 generated trees** (seed 20261024) and **all 882 two-level binary combinations** of pass/fail/unknown leaves. This is bounded comparison evidence, not a proof of every rule or scholarship fact.
- `npm run check`: typecheck, lint and **50 unit tests passed**. Added exact reason-code assertions, streamed-input size limits, malformed JSON, invalid field/predicate combinations, pre-recursion depth bounds, recognised country identities, explicit complete qualification history and ambiguous/future-date handling.
- `npm run test:integration`: **12 tests passed**. Expanded checks include direct student denial at the operator API, source-attempt records written before fetch, expired source-lease recovery preserving failed-attempt history, exhausted outbox attempts becoming inspectable failures, and stale-owner rejection. Accepted requirement changes now traverse the real scholarship-event fan-out and evaluation-job handlers.
- Engine version is now 1.1.0 because country identity and completed-qualification semantics changed. Older evaluations are historical until recalculated.
- Authentic TestSprite red/green runs, credit estimates/debits and actual GitHub blocked-merge evidence remain unavailable. No deliberately introduced production regression or fabricated organic bug is claimed. Preserved local failures/fixes are described above and are not substituted for the remote gate.
