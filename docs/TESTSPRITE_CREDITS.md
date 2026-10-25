# TestSprite credit ledger

Allowance: **150 credits**. Latest actual balance, observed through official CLI 0.15.0 `usage` on 24 October 2026: **147 credits**, Free plan. Account-reported rate: **0.5 credits/run**. Reserve approximately **50 credits** for final verification and fixes. Generation/exploration cost is not established by the run rate.

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
