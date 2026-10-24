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
