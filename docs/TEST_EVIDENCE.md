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
