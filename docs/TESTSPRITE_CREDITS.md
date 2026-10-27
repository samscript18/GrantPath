# Testsprite Credits — portal integration, 27 October 2026

Portal AI generation is recorded: the owner explored the live app and used **Add Tests with AI**. Ten portal-origin cases created together at **2026-10-27 00:46:33.812 UTC (01:46 Lagos)** passed [10/10](https://www.testsprite.com/dashboard-v3/o/salmans-workspace-76bdd244/projects/a3f56241-4390-4269-8e0e-e88d61104094/execution/3a17a157-b012-43db-bf5a-0bbe70028cad). [Exploration screenshot](evidence/portal-ai-generation-10-pass.png), [native IDs/provenance](evidence/portal-ai-generation-provenance.json), [original generated plans/results](evidence/portal-generated-case-review.json). No separate Activity Log event ID was exposed; none is invented. This was owner-completed portal interaction. Original seven CLI cases and three earlier manual portal cases retain their actual origins.

The trigger supports all **20 cases**, per owner confirmation; the manifest and exact-count gate require all 20. No cases/history were deleted or checks disabled. Published source **`5d9960f0e1088283eb3a9213abac3cc40cb744f6`** is Ready at the [public app](https://grantpath-git-release-hosted-verification-lammysam8-7688.vercel.app) and [immutable deployment](https://grantpath-noxo4kk1d-lammysam8-7688.vercel.app). Semantic field search is included.

**The final complete PR gate is not green.** [Automatic App execution](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094/execution/060daa19-5134-4241-9443-39a5c0bcec3e) finished **18 passed, one failed, one blocked**. The separate [native API ownership check](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/d36cedef-a40e-4fb7-ae61-f3b2484ede06/execution/a9048287-7c9b-46d2-bb7b-f17cab50679b/test/95d39fdd-90ef-4979-9cd8-06b8b43e92b2) passed reviewed code `v-5e0325a9c69d`, exact commit binding, cross-account 404, foreign-read exclusion, unchanged-owner fields and operator 403. GitGuardian and Vercel passed. [CI](https://github.com/samscript18/GrantPath/actions/runs/40433440921) passed **102 unit / 37 PostgreSQL / 14 production-browser journeys**, typecheck, lint and build; its final TestSprite gate correctly failed. [Actual statuses](evidence/portal-integration-final-status.json), [exact GitHub-triggered case histories](evidence/portal-integration-case-results.json). The owner’s overlapping two-case run is separate and does not clear this automatic check. App actions are not claimed byte-identical to stored Python sources.

The first all 20 run at `254f781` failed two test-plan assumptions: notification history before concurrent setup, and opening the external GLOCAL provider site before inspecting GrantPath links. Its failure is preserved. Authenticated hosted GET /api/notifications returns 20 accepted-change records on its first page; three sampled versioned evidence links return HTTP200 and render retained history. The earlier read-only database diagnosis is preserved separately. GrantPath’s internal detail HTML contains all seven canonical links. No backend/query or external-provider content defect was established.

The next automatic run passed GLOCAL but the original notification journey skipped the worker-button click (two pending events still had **zero attempts**) and the companion entered a password differing from successful sign-in. The protected queue was not manually drained/reset. Reviewed plans now make the worker click a distinct action and use the configured student sign-in bundle; **these latest plan clarifications still need verification**. Exact eligibility/change-delivery/deduplication/suppression/evidence assertions and reusable Python sources are preserved. [Sanitized action diagnosis](evidence/portal-retry-action-diagnosis.json), [pending queue](evidence/portal-pending-queue-diagnosis.json), [saved plan clarification](evidence/portal-final-notification-plan-clarifications.json).

Observed balance: **60.1 credits**, Free, with **50 reserved**. Two automatic all 20/API cycles spent **10.2 each**, 81.5 → 71.3 → 61.1; the owner confirmed a separate [two-case run](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094/execution/cfface78-79a3-4c32-93c4-6b050c5402f3), accounting for the additional 1.0 decrease. The earlier owner exploration/generation plus ten-case run cost 10.5 in aggregate (92.0 →81.5); separate generation cost is unknown. No manual execution/new generation/purchase/schedule was launched by this agent. Another full 10.2 cycle would leave 49.9 and crosses the reserve; it is stopped. The owner reports a portal **rerun failed** option; its cost, blocked-case inclusion and whether it updates this same PR check must be confirmed before use. No selective rerun has been claimed.

Actual catalogue: **32 real records / 23 providers / 17 destination countries / six regions**; **7 open, 2 upcoming, 5 closed, 18 unknown**; 23 cycle records and 9 scheme overviews. Routine application/source schedules remain disabled; successful manual worker dispatches are historical, not continuous monitoring. Optional Neon lifecycle is unconfigured. Brevo provider acceptance is preserved; recipient receipt is unobserved. No merge, production binding change or Discord submission is performed. Final receipts stay local to avoid a credited receipt-only push.

---

## Preserved historical record — dated claims below apply only to their named source

# TestSprite credit ledger

Allowance: **150 credits**. Latest actual balance, observed through official CLI 0.15.0 `usage` on 26 October 2026: **97.2 credits**, Free plan. Account-reported rate: **0.5 credits/run**. Reserve approximately **50 credits** for final verification and fixes. Generation/exploration cost is not established by the run rate.

| Operation                                                                                          | Estimate                           | Observed debit | Observed balance | Result                                                                                                   |
| -------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| Read-only account inspection                                                                       | No run                             | 0              | 150              | Native V3 account, initial project list empty                                                            |
| Create project, configure isolated account, save two plans                                         | No exploration/execution requested | 0              | 150              | Two cases ready; official offline lint passed                                                            |
| User sends PR test event; execution `9e9aec5c-54f3-4e6f-84a0-d15e8ec68394`                         | 2 × observed 0.5/run = 1           | **1**          | **149**          | **2 passed** on head 81f2164; authentic App success observed                                             |
| Automatic PR event on documentation head 15e6d7c; execution `bec3b808-1c62-4735-897a-114ccf1c39fb` | 2 × 0.5 = 1                        | **1**          | **148**          | **2 reported passes**; saved replay review identified coverage gaps, corrected before the next run       |
| Automatic Brevo release 6b6399f; execution `daa54b31-5049-41d8-b1c5-e50d30b00675`                  | 2 × 0.5 = 1                        | **1**          | **147**          | **2 reported passes**; actual App timeline still uses recorded steps, not all explicit script assertions |

Execution: https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094/execution/9e9aec5c-54f3-4e6f-84a0-d15e8ec68394

Authentic PR comment: https://github.com/samscript18/GrantPath/pull/1#issuecomment-6385000740

The user reports trigger Active after connecting the App. No duplicate CLI run, schedule, exploration or broad generation was requested. Keep automatic PR verification enabled. Both terminal per-case verdicts and the real App success status were observed. New commits require their own verification and debit observation. Local Vitest/PostgreSQL/Playwright operations are separate evidence and consume no TestSprite credits. No credits or paid plans purchased.

The next release changes the email provider to Brevo and stores explicit assertion-complete Python scripts. Local execution of those exact scripts passed; the changed release will receive one automatic App run. No manual duplicate is requested. Pre-dispatch observed balance: 148; estimate for two cases: 1. Record its actual debit and outcome.

A supplemental strict saved-code replay had a concrete reason: the App timeline retained older recorded steps with missing assertions. First CLI invocation was rejected locally for invalid multi-ID syntax before dispatch. The corrected request was **declined by the user before process execution**. No supplemental run was started; no extra debit occurred. Strict remote assertion coverage is unverified. Do not retry the declined operation without new authorisation. Latest observed balance remains 147.

## Google, appearance and password increment — before publication

Observed read-only usage: **147 credits**, Free, **0.5 per test run**. The existing two-case automatic PR suite implies an estimated 1-credit debit for this meaningful product update. Local work passed before publication. No extra manual execution, strict replay or new exploration is requested. Record the actual App execution and balance after it completes; do not infer a pass or debit from this estimate.

## Follow-up actual result

Automatic execution `e0d65db9-7c39-42f3-b1ff-4ce8f31f2234` at head50570e1: **2/2 reported passed**. Observed balance before147, after**146**, actual debit**1**. Cumulative observed debit4 from150. Only the existing two cases ran; no strict replay, schedule, new exploration or duplicate manual run. New Google/theme/password assertions remain local/hosted-smoke evidence; Google real consent is user-confirmed. No additional credited execution is needed for final local evidence documents.

Account-control follow-up: no TestSprite operation under the user's testing/publication pause. Latest observed balance remains146; no new portal observation or debit is claimed. OTP, privacy and Cloudinary flows are not covered by the earlier two-case App run.

Full-worktree local commit and provider-image follow-up: no TestSprite operation or GitHub push. Latest observed balance146 is unchanged as an observation; no new balance lookup or debit is claimed.

Second editorial design pass: no credited operation or balance lookup.146 remains the latest previously observed balance, not a fresh observation. Local screenshot review did not invoke TestSprite or its test suite.

## Fresh continuation observation — 25 October 2026

Read `testsprite usage` through official CLI0.15.0: **146 credits**, Free, **0.5 credits per case execution**. This supersedes the user's recalled147 balance. No credited generation, exploration, replay or App run has been initiated in this continuation. Keep50 as reserve. Read-only project and saved-plan inspection succeeded. `ci trigger list` and `github status` are unsupported CLI commands and failed local validation before dispatch; no run/debit is inferred. The current saved discovery plan contains6 unstructured natural-language steps. Exact saved-code versus authentic App execution assertions still need reconciliation before credited release runs.

Portal UI check: the user supplied a current screenshot of Run Behavior. It exposes login reuse, viewport and concurrency, but **does not expose “Always use planned steps”** despite the current documentation describing it. The user was told to leave settings unchanged. No toggle change is claimed. Update authored plans and inspect actual per-run steps/code; do not infer that a saved Python file was executed verbatim.

25 October2026 preparation readback:146 credits remain after saving7 authored plans/scripts and two nonsecret account names. Observed debit0. No exploration, generation or execution was dispatched. Existing rate0.5/case suggests3.5 for a7-case App execution; the actual debit must be read after it completes. No missing portal plan option is claimed enabled.

25 October2026 actual automatic operations at e09b64d: two seven-case executions were observed (08:31:22Z and08:34:03Z), not one. Credit readback146→139, observed total debit7; no manual duplicate was launched. Screenshot shows one active vercel[bot] comment trigger, so overlapping trigger rows are not established. Comment creation/update events are being investigated. The first execution started before the new deployment was ready. The user confirmed enabling the previously disabled Merge gate after its screenshot exposed the setting. Future pushes remain held while event deduplication is resolved. One focused strict saved-code access replay (estimated0.5) is authorised for the concrete gap where the App browser agent could not inspect protected responses; no broad/manual full-suite duplication is requested.

## Strict replay and scheduler follow-up —26 October2026

Fresh read:138.5 credits, Free,0.5 per case. Strict access replay c68e8a72 consumed0.5 (139→138.5), failing with APIRequestContext.post TargetClosedError before any reported assertion step. Refused environment/template attempts executed zero steps and had no observed debit. Independent APIRequestContext sources then passed all seven exact scripts locally. One focused retry, estimated0.5, is prepared for this concrete provider-runtime gap; no broad duplicate suite. Keep50 reserved. User confirms the single Vercel Commit status trigger is Active with Merge gate on and the old comment trigger removed; next automatic execution remains to be observed.

Strict independent-context retry e57ecf1e failed before assertions: provider injected record_video_dir into APIRequest.new_context. Actual balance138.5→138, debit0.5. Preserve original browser-context failure separately. No further API-context trial will be launched; compatible browser-based requests must first pass locally.

Final strict browser replay ce999aed: actual138→137.5, debit0.5; TargetClosedError before reported assertions. Stop additional strict retries. Next automatic seven-case run estimate3.5 at the observed rate;137.5 currentbalance leaves ample50reserve. No manual duplicate automatic execution will be launched.

## Corrected-trigger actual debit

Single automatic execution10178282 at f13ab93:3passed/1failed/3blocked. Observed137.5→134, debit3.5; one execution link, no duplicate comment-trigger run. The authentic App posted failure and PR was blocked with required Apps/admin enforcement intact. Strict total across three runtime failures1.5; exact remote assertions remain unverified. Next source-fix automatic suite estimate3.5; balance134,50reserve retained. Only three isolated .test credentials were rotated after evidence showed agent transcription errors; encrypted default password updated and all three hosted logins returned200. No real student credential changed.

## Fix-head actual debit and coverage

Automatic6119d7be at0a7d332:4passed/2failed/1blocked; observed134→130.5, debit3.5, exactly one execution. Publication/exception/joint/discovery passed. Profile agent missed the required clearing assertion; notification agent saved bachelor despite intended master; preserved historical evaluation correctly accepted bachelor for bachelor. Access metadata remains blocked. All seven exact scripts separately passed hosted Playwright; not TestSprite. Saved plans now isolate clearing/master setup as required checkpoints. No weakened assertions or extra strict replay. Final coherent classification/backfill/evidence update estimates3.5 for its expected automatic run, with50reserve preserved.

Automatic021fe90b at28c0d6e:5passed/1failed/1blocked; observed130.5→127, debit3.5, exactly one execution. Profile residence regression passed automatically. Notification run exposed misleading completed-event visibility in operator diagnostics; access metadata still blocked. A real bounded history-query/UI correction is being locally verified before one coherent follow-up; no manual same-head suite or strict retry.

## Diagnostics-fix actual final source run

Automatic7e86f4a2 at963149e:4passed/1failed/2blocked. Observed127→123.5, debit3.5, one execution. Profile passed. Multi case opened the GitHub PR page, access API remained blocked, notification agent mixed expected post-change failure with baseline and counted old alerts. Exact hosted7sources allpassed; historical native v12has1alert/no duplicate groups. User confirmed trigger target was the GitHub PR URL; correction requested. No further strict retries, no manual duplicate. A future coherent evidence push only after saved target correction would estimate3.5, preserving50reserve.

User saved the corrected Vercel target and no test event. Next coherent evidence/plan publication will verify this concrete routing fix through one automatic seven-case run, estimated3.5 from actual123.5. No manual duplicate or strict replay. Record actual debit and exact-head outcome; do not infer success from the corrected setting.

## Final corrected-target observed result

Head62b0ac8, automatic1e8d5352:4passed/1failed/2blocked. Metadata actually targets the Vercel app. Observed123.5→120, debit3.5, exactly1execution. Discovery/profile/exception/notification passed; multi equality was not captured, publication/access inspection blocked. All7exact scripts pass hosted Playwright, not TestSprite. Read-only failure-bundle download confirms stored source assertions but not their runtime execution. Stop paid retries until a concrete execution remedy. Post-run receipts are local-only to avoid another seven-case paid run solely for documentation; no remote pass is claimed for the receipt commit.

GLOCAL canonical-link follow-up: exact strengthened source/plan saved without execution; fresh account balance120, observed0.5/case. A coherent source implementation push is authorised by the continuing release work and expected to trigger one7case automatic suite, estimated3.5, retaining50reserve. Previous local receipts will be included in that push. No duplicate manual run will be launched; record actual final debit/outcome.

GLOCAL canonical source9461493 automatic7eb7869b:5passed/2blocked/no failed; GLOCAL725cd8a3passed. Observed120→116.5, debit3.5,1execution. Exception navigation/access API cases remain blocked; required gate intact. No manual duplicate, generation/exploration, strict replay or purchase. Current receipts local-only after source publication.

## HTTP access runtime correction

Fresh preflight116.5credits, observed0.5/case. Initial independent HTTP replay9e65f3be failed because the frontend runner requires an async callable; balance116 (0.5debit). Corrected async source passed live locally, then strict TestSprite169e6917passed with replay.path=replay. Balance after second debit is read separately; no broad exploration/generation. These two focused operations address explicit prior runtime errors; normal seven-case automatic PR verification remains required and enabled.

Observed post-strict balance115.5:116→115.5debit0.5; two focused operations total1credit. One next automatic seven-case suite estimates3.5; no duplicate manual run.

## Native API alternative — observed metering

Source3591af7 automatic1e3b1a12:4passed/1failed/2blocked; exception passed, access stayed browser-blocked, multi comparisons incomplete and notification selector hit stale-node errors. Actual115.5→112, debit3.5. No repeated manual full suite. GLOCAL independent readback still confirms all7same href/ID/one record/canonical source URL.

Native backend project preparation was uncredited. Backend4253d3f6 passed; actual112→111.8, debit0.2, compared with conservative0.5preflight. Saved codeVersion v-daf95e66fcb1 and actual assertion output are retained. Additional required API gate preserves the original mandatory HTTP checks and both existing requirements. Next coherent push expects one7case App suite (3.5observed) plus one backend case (0.2observed):3.7estimated, with50reserve retained. Do not duplicate either automatic operation manually for the same head.

## Native-alternative head b5bbce7 — actual result and correction

Published b5bbce70bb2df46b07353b3fc27edd587c231917 is Ready at https://grantpath-dwsktflwj-lammysam8-7688.vercel.app. Native bcaa139c reports4passed/1failed/2blocked: profile, GLOCAL literal comparison, exceptions and browser privacy passed; public timing/progress distinction failed; publication search and notification account switching blocked. The publication agent literally searched Controlled joint scholarship with all windows rather than setting the separate window filter. Notification controls selected correctly, then the generated test reused an operator tab after student login, and the server correctly refused its mutation. Plans now specify exact search text and explicit logout/login for every account switch; no permission guard is changed.

API job121805878985 stopped before dispatch: backend exports prepend an exact public-auth credential stub and strip one trailing newline. New matchesReviewedBackendSource accepts only the exact reviewed body, its EOF serialization, or that exact observed stub plus body. Tests reject altered404assertions, added executable code, changed auth wrappers and missing source. Actual saved v-df3cfaf48c96 matches; no assertion or arbitrary wrapper is ignored.89unit/typecheck/lint pass. Public detail pages now explicitly label Provider application window and separately show actual personal progress, or an honest signed-out/unsaved prompt. Exact discovery assertions are strengthened accordingly.

Observed111.8→108.3credit debit3.5 is the single App suite; no API execution occurred at this head. Next coherent correction expects3.7 combined from108.3, retaining50reserve. Prior local production build/three focused journeys including9exact sources pass; final broader browser rerun pending. Required three checks, strict freshness and admin enforcement remain intact; PR remains blocked until actual corrected-head passes.

## Queue-drain follow-up — 26 October 2026

Head2be6624 has6/7authentic App passes/no blocked cases; only the change-alert assertion failed. The required native API ownership case passed automatically with exact source version/output; all CI software steps passed, and the retained native guard correctly failed. GitGuardian green. Actual104.6credits remain after108.3→104.8(App3.5)→104.6(API0.2).

Read-only diagnosis of isolated other@example.test/control version22 proves the accepted event completed, its change.ready event remained pending with0attempts, no delivery or inbox row yet, valid saved subscription/current preferences, and39pending events. The evaluator correctly returned not_eligible/VALUE_NOT_ACCEPTED. This was an undrained bounded batch, not a missing publication or incorrect eligibility rule. No manual drain/reset was used to hide the failure.

Application workers now return persisted pending/runnable/review counts. Operator pages show them on load and after actions. New Process queued jobs runs at most10sequential batches of10events/deliveries, stops on failure or waiting leases/retry times, and reports actual zero-pending drain or the remaining work. Existing single-batch control stays available. New plan requires zero Pending events and Pending deliveries before switching accounts. Test setup now uses actual queue readiness rather than reading .length from a delivery-state count object.

New integration test creates12real profile events and confirms one10event batch reports remaining work, exact persisted health and student denial. Its first draft incorrectly expected the entire shared historical fixture database to drain within800jobs; residual2509runnable jobs disproved that assumption. The test is scoped to bounded-backlog reporting; existing exact delivery/replay/preference assertions remain in their integration and source journeys.33PostgreSQL tests pass.89unit/typecheck/lint/build and focused3production-browser journeys including9exact scripts pass. Final full browser/screenshot review follows.

Next coherent implementation push estimates one3.5App suite plus0.2API case (3.7) from104.6, preserving50reserve. No duplicate manual or scheduled TestSprite run, purchase, security bypass or merge.

## a201391 automatic cycle — observed metering

Fresh official usage read26October2026 confirms100.9credits, Free, frontend rate0.5. One seven-case App suite debited3.5 (104.6→101.1); the required backend case debited0.2 (101.1→100.9), as independently captured by its CI receipt. Backend06d9858e passed with matching codeVersion v-5e0325a9c69d and exact protected assertion output. Browser executione27c5455 subsequently passed all7cases; individual results were read back. No duplicate manual run, generation, purchase or scheduled TestSprite operation. Fifty-credit reserve remains.

## Final automatic release checkpoint — 26 October 2026

Published `448831d7edc080b34599c291de19d6f52540fb76` is Ready at https://grantpath-mdgg56q1p-lammysam8-7688.vercel.app. Authentic App [12480f84-dcfe-4db0-8bff-d476687bbcd9](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094/execution/12480f84-dcfe-4db0-8bff-d476687bbcd9) passed all seven cases, including the exact seven-destination comparison, operator exceptions and notification journey. Required native API [5eb82386-d083-4f5f-aadb-390dac395805](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/d36cedef-a40e-4fb7-ae61-f3b2484ede06/execution/e4d3c429-a42b-4f09-9332-e771177edc87/test/5eb82386-d083-4f5f-aadb-390dac395805) passed with exact reviewed code version and real404/403/unchanged-owner output. Correctness workflow https://github.com/samscript18/GrantPath/actions/runs/40401191845 passed all software and native-guard steps. Original required checks, additional API check and strict/admin enforcement remain intact. GitGuardian recheck121861017132 is green, read back through GitHub at21:56UTC on26October2026 after the user resolved incident39071152 and requested recheck. The earlier failed check and unavailable API rerequest remain historical evidence; scanning was not disabled.

Observed remaining balance 97.2; final cycle 100.9→97.4→97.2, debits3.5and0.2. No duplicate run, purchase or merge. Exact evidence files use final-status-*; earlier failure histories remain. FINAL_HANDOFF.md distinguishes checked source from the subsequent local receipt commit and records pending routine scheduler activation, unavailable automated Neon lifecycle, unobserved email recipient receipt and PR metadata403. No unsupported all-assertions or operational-completion claim.
