# Release review — 26 October 2026

## Queue-drain follow-up — 26 October 2026

Head2be6624 has6/7authentic App passes/no blocked cases; only the change-alert assertion failed. The required native API ownership case passed automatically with exact source version/output; all CI software steps passed, and the retained native guard correctly failed. GitGuardian green. Actual104.6credits remain after108.3→104.8(App3.5)→104.6(API0.2).

Read-only diagnosis of isolated other@example.test/control version22 proves the accepted event completed, its change.ready event remained pending with0attempts, no delivery or inbox row yet, valid saved subscription/current preferences, and39pending events. The evaluator correctly returned not_eligible/VALUE_NOT_ACCEPTED. This was an undrained bounded batch, not a missing publication or incorrect eligibility rule. No manual drain/reset was used to hide the failure.

Application workers now return persisted pending/runnable/review counts. Operator pages show them on load and after actions. New Process queued jobs runs at most10sequential batches of10events/deliveries, stops on failure or waiting leases/retry times, and reports actual zero-pending drain or the remaining work. Existing single-batch control stays available. New plan requires zero Pending events and Pending deliveries before switching accounts. Test setup now uses actual queue readiness rather than reading .length from a delivery-state count object.

New integration test creates12real profile events and confirms one10event batch reports remaining work, exact persisted health and student denial. Its first draft incorrectly expected the entire shared historical fixture database to drain within800jobs; residual2509runnable jobs disproved that assumption. The test is scoped to bounded-backlog reporting; existing exact delivery/replay/preference assertions remain in their integration and source journeys.33PostgreSQL tests pass.89unit/typecheck/lint/build and focused3production-browser journeys including9exact scripts pass. Final full browser/screenshot review follows.

Next coherent implementation push estimates one3.5App suite plus0.2API case (3.7) from104.6, preserving50reserve. No duplicate manual or scheduled TestSprite run, purchase, security bypass or merge.

Release protection is not fully green yet. Do not claim submission readiness.

[Current complete handoff](FINAL_HANDOFF.md) records the exact source/deployment, coverage, actual local/native results, required identities, regression history, credits and operational limits. Historical failed runs and fixes remain in TEST_EVIDENCE.md and evidence/.

Published head: `2be6624def11fba477a5fcd41d85ab23bf193812`. Public preview: https://grantpath-git-release-hosted-verification-lammysam8-7688.vercel.app . PR1 remains unmerged.

Local89unit/32PostgreSQL/build/13production-browser and all9exact sources pass. Additional native API check automatically passed; original App result: 6/7 passed · 1 failed. Complete correctness result is reported in the handoff. Fresh hosted public readback:32records/23providers/17destinations/6regions,23cycles/9overviews,7open/2upcoming/5closed/18unknown. No open-application or assertion-coverage overclaim.

Main retains original correctness and App checks, adds mandatory native API verification, strict/admin enforcement. No purchase, security bypass, merge or Discord post. Scheduler activation, automatic Neon lifecycle and recipient receipt remain bounded as described in the handoff. Observed104.6credits. Post-run receipts are local-only after published source to avoid a paid documentation-only rerun.
