# Coverage Matrix — 27 October 2026

Current source `4245853398a25c59a64273c1f119bdf9508be6d5` has seven passing App cases: discovery/evidence; separate citizenship/residence and private application persistence; seven-destination identity; accepted publication and replay; unpublished ambiguous-source exception; exact changed eligibility and notifications; private-note isolation. [Actual App result](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094/execution/3e453883-20eb-4466-bce3-f77723bb73c5). A separate [native API pass](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/d36cedef-a40e-4fb7-ae61-f3b2484ede06/execution/ade112f3-c9a0-4a27-a22c-30c699fdc2e7/test/9b5228ef-c566-452e-aa84-1eb1d70d9380) verifies 404 foreign update, excluded foreign reads, unchanged owner data and 403 operator denial, at reviewed version `v-5e0325a9c69d`.

Local coverage is 101 unit / 37 PostgreSQL / 14 production-browser journeys. Semantic tests cover input/batch limits, structured ID validation, cache stability, committed hourly/daily budgets, failure retention, before-pagination selection and explicit text fallback. Hosted provider/DOM/API checks verify Humanities relevance and repeated results. These are not additional TestSprite browser cases. Portal-generated coverage is **not established**; [owner procedure](PORTAL_GENERATION.md). [Final status](evidence/submission-semantic-status.json).

Current catalogue: 32 real records, 23 providers, 17 countries; 7 open / 2 upcoming / 5 closed / 18 unknown. Routine scheduling, optional Neon lifecycle and recipient receipt remain outside verified coverage. App steps are not assumed byte-identical to saved sources.

### Late portal/manual-run reconciliation — 27 October

The owner explicitly confirmed **“manual creation in the portal”** for three new
cases and supplied [Activity Log](https://www.testsprite.com/dashboard-v3/o/salmans-workspace-76bdd244/projects/a3f56241-4390-4269-8e0e-e88d61104094/activity)
and three execution links. The project now contains **ten cases: the original
seven CLI-authored cases plus three manually portal-authored cases**. The new
cases cover GLOCAL, notifications and private notes, overlapping original coverage.
**This still does not establish AI exploration/generation through the web portal.**
[Owner statement/run links](evidence/submission-owner-portal-history.json),
[new case metadata/export review](PORTAL_CASE_REVIEW.md).

The final automatic App result at `4245853` covers the original seven cases;
it does not verify the later three as part of an App-connected ten-case suite.
Preserve all histories. Before another automatic run, reconcile App selection and
the exact-count manifest; do not delete cases or weaken the guard. No ten-case App
pass is claimed. New manual cases are not silently substituted for the original
reviewed cases. The agent started no extra manual run or generation.

**Final observed balance is 92.0 credits**: 97.2 → 93.7 (App 3.5) → 93.5
(API 0.2) → 92.0 (additional owner-confirmed manual executions, aggregate 1.5).
Total account reduction **5.2**, with **50 reserved**. Generation has no displayed
estimate and was not started by this agent. The 1.5 aggregate is consistent with
three executions at the observed 0.5 rate, rather than a claimed per-run invoice.
[Final account/catalogue readback](evidence/submission-final-account-catalogue.json).

The PR title matches the prepared title on independent readback, but its body
remains the old version after the connector returned **403**. **Owner action is
paste the replacement body only** from SUBMISSION_PR.md. No alternate write
identity or second metadata write was attempted.

---

## Preserved historical record — dated claims below apply only to their named source

## Current verification work — 26 October 2026

## Native-alternative head b5bbce7 — actual result and correction

Published b5bbce70bb2df46b07353b3fc27edd587c231917 is Ready at https://grantpath-dwsktflwj-lammysam8-7688.vercel.app. Native bcaa139c reports4passed/1failed/2blocked: profile, GLOCAL literal comparison, exceptions and browser privacy passed; public timing/progress distinction failed; publication search and notification account switching blocked. The publication agent literally searched Controlled joint scholarship with all windows rather than setting the separate window filter. Notification controls selected correctly, then the generated test reused an operator tab after student login, and the server correctly refused its mutation. Plans now specify exact search text and explicit logout/login for every account switch; no permission guard is changed.

API job121805878985 stopped before dispatch: backend exports prepend an exact public-auth credential stub and strip one trailing newline. New matchesReviewedBackendSource accepts only the exact reviewed body, its EOF serialization, or that exact observed stub plus body. Tests reject altered404assertions, added executable code, changed auth wrappers and missing source. Actual saved v-df3cfaf48c96 matches; no assertion or arbitrary wrapper is ignored.89unit/typecheck/lint pass. Public detail pages now explicitly label Provider application window and separately show actual personal progress, or an honest signed-out/unsaved prompt. Exact discovery assertions are strengthened accordingly.

Observed111.8→108.3credit debit3.5 is the single App suite; no API execution occurred at this head. Next coherent correction expects3.7 combined from108.3, retaining50reserve. Prior local production build/three focused journeys including9exact sources pass; final broader browser rerun pending. Required three checks, strict freshness and admin enforcement remain intact; PR remains blocked until actual corrected-head passes.

Published source before this increment is `3591af74281e3e0e5467ce954331c7106d61cf1e`, Ready at https://grantpath-9f446w9sh-lammysam8-7688.vercel.app. Public alias: https://grantpath-git-release-hosted-verification-lammysam8-7688.vercel.app; PR: https://github.com/samscript18/GrantPath/pull/1. Later checkpoints below are historical unless a newer exact-head receipt is recorded.

That head's automatic TestSprite execution1e3b1a12 reported4passed/1failed/2blocked. Exception handling passed; the notification scenario selector hit stale-node errors, cross-account HTTP inspection remained browser-blocked, and literal multi-destination comparisons were incomplete. Independent readback still confirms all7GLOCAL filters return one identical record/internal href and the canonical official URL. GitGuardian is green. CI40380815968 passed all software steps before its required native-outcome guard failed.

This increment adds literal official scholarship links to catalogue cards, replaces the native scenario dropdown with persistent pressed buttons, and provides scholarship-scoped accepted publication history so old decisions remain inspectable outside the30entry recent list. No source facts, histories, authentication checks or eligibility assertions are weakened. A profile replay now waits for streamed dashboard readiness and honours real429Retry-After responses.

The user confirmed App saved-code replay cannot be enabled and requested an alternative. Native backend project `d36cedef-a40e-4fb7-ae61-f3b2484ede06`, case `88b47334-232c-4665-a6a2-413b09c34eb5`, executes the actual protected HTTP assertions using separate cookie jars. Authentic run4253d3f6 passed with stored codeVersion and explicit404/foreign-read-exclusion/unchanged-owner-fields/403 output. Observed112→111.8credits (0.2debit). The frontend ownership slot now covers visible private-note isolation; it is a companion, not a substitute for server enforcement.

Main protection now additionally requires **TestSprite API ownership** from GitHub Actions App15368, alongside original correctness/App15368 and TestSprite V3/App2756476. Strict freshness and administrator enforcement remain enabled. The additional CI job waits for the exact PR head at the isolated preview using a public read-only revision endpoint, verifies remote source bytes, preserves the50credit reserve, dispatches one idempotent native backend run without auto-heal, and requires matching codeVersion and exact assertion output. No Pro auto-auth, purchase or unsupported replay switch is used.

Local typecheck/lint87unit/32PostgreSQL/build and the three impacted production-browser journeys pass, including all9exact scripts. Scoped history validation and operator denial are included in the actual PostgreSQL service test. Full13journey production-browser rerun also passes (3.0minutes), including all9exact sources. Desktop and360px scenario-button screenshots were inspected. Next exact-head automatic verification is pending at this preparation checkpoint. Expected one7case browser suite plus one backend case is3.7credits from observed111.8; no duplicate manual run. The next published head must receive its own actual checks before release readiness can be claimed.

---

# Current global acceptance coverage — 26 October 2026

| Area                         | Implemented / checked                                                                                                                                                                          | Remaining boundary                                                                                                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Country model                | ISO identities, safe legacy backfill, multi-country institutions, all-country profile choices, actual published filter options, ranking separate from eligibility                              | Global/unconfirmed scope never creates a fictional country; a preference does not imply catalogue coverage                                                                                                                       |
| Discovery                    | Approved listing pagination/dedup, strict detail paths, DNS/robots/size/time/redirect policy, quotas/leases/retry recovery; three actual live directory successes                              | Newly unmapped layouts/semantics require reviewed adapter contracts                                                                                                                                                              |
| Publication                  | Real shared transaction; field policies, explicit codes, pause, concurrent replay, new-cycle identity, audit/evidence/outbox, manual exception stale-version guard                             | Incomplete requirements retain mandatory confirmation; removed/ambiguous content held for review                                                                                                                                 |
| Eligibility / notifications  | Existing independent reference evaluator preserved; exact accepted-level change, fresh evaluation, one alert, replay dedup and disabled queued-topic suppression checked through real services | Source facts are not mathematically proven; external recipient receipt remains unobserved                                                                                                                                        |
| Ownership / account controls | Server-enforced cross-account application denial with unchanged owner data; code attempts/cooldown/session revocation, one-time encrypted export concurrency and deletion grace                | No claim of all possible races or cross-browser security audit                                                                                                                                                                   |
| Images / design              | Actual disposable Cloudinary upload/read/remove/cleanup smoke; responsive global details/operator screens implemented                                                                          | Actual desktop/360px operator views inspected;7exact hosted sources passed separately from native App                                                                                                                            |
| Remote protection            | Existing authentic required Apps preserved; seven exact Python scripts locally passed                                                                                                          | e09 App caught residence defect but posted green with gate off; f13 native red/blocked verified; final62b native4/7, exact7hosted sources pass, corrected Vercel target verified; complete native green/runtime fidelity blocked |
| Operations                   | GitHub chosen, encrypted isolated preview environments configured; source work outside Vercel                                                                                                  | Actual release-branch application/source dispatches succeeded; default-branch activation awaits separate owner merge; Neon API lifecycle unavailable                                                                             |

Local tests, production-browser checks and authentic TestSprite results are reported separately. Historical scope below applies to its named releases.

---

# Coverage and acceptance matrix

Local results below refer to PostgreSQL, Vitest and Chromium, never TestSprite. Exact commands and failures are recorded in TEST_EVIDENCE.md. Hosted browser/Neon persistence and GitHub CI also passed; the two focused native TestSprite cases passed in their first authentic App execution (see testsprite/PROJECT.md).

| Phase / area    | Implemented behaviour                                                                                                      | Local evidence                                                                                                                 | External remaining                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 1 Accounts      | Verified signup, sessions/logout, recovery, one-time token replay prevention, server roles, origin/throttle guards         | PostgreSQL accounts tests; real browser signup/profile/return                                                                  | Brevo integrated; recipient receipt pending; hosted preview and authentic App gate verified                   |
| 1 Persistence   | Versioned profile, expected-version concurrency, unchanged-write idempotence                                               | PostgreSQL evaluations tests                                                                                                   | Automated Neon API branch lifecycle; dedicated PR database is verified                                        |
| 2 Catalogue     | 20 real records, programme/cycle identity, evidence, search/pagination, protected curation/history                         | Catalogue validation and PostgreSQL replay/cycle tests; browser filters/evidence                                               | Scheduled access reviewed per source                                                                          |
| 3 Eligibility   | Three outcomes, AND/OR, unknowns, exemptions, qualifications, final-year dates, GPA, language, experience, age             | Unit reason codes/boundaries; 2,000 reference-generated and 882 bounded exhaustive comparisons; ELIGIBILITY_MATRIX.md          | Initial provider conditions partly unmapped and explicitly unknown                                            |
| 3 Freshness     | Exact profile/scholarship/engine version, obsolete work rejected, ranking separate                                         | PostgreSQL stale/concurrent evaluations                                                                                        | Hosting load/race behaviour beyond tested cases                                                               |
| 4 Applications  | Private idempotent save, notes/checklists, seven statuses/history, persistent filters/dashboard                            | Concurrent-save/ownership tests; connected browser plan/reload journey                                                         | No external provider application submission integration                                                       |
| 5 Monitoring    | Four adapters; allowlisted bounded fetch/robots; attempts/success separate; review/publish; history/recovery               | Adapter unit contracts; controlled integration; browser operator approval → real event fan-out/evaluation; one live extraction | UCL/Oxford access blocked; CSC live fetch untested; schedules paused                                          |
| 6 Notifications | Relevant inbox/email, preferences/read, exact historical links, confirmed-instant reminders, retries/dedup/uncertain state | PostgreSQL concurrent queue/current preferences/unsave/crash tests; browser accepted change → one alert → suppressed reversal  | Brevo acceptance/dedup verified; recipient receipt and scheduler execution pending                            |
| 7 Protection    | Independent oracle, property/date/input-bound tests, ownership/stale leases/exhaustion                                     | Unit/integration suites and local CI configuration                                                                             | First two TestSprite cases and required App gate verified; failing TestSprite regression sequence unperformed |
| 8 Design        | Editorial landing, shell, staged profile, list/detail/board/timeline, responsive and reduced motion                        | Rendered desktop/360px screenshots, keyboard skip link, page-error capture, empty/stale/recovery screens                       | Broader assistive-technology/device and hosted performance review                                             |

## State coverage

- Loading: shared route skeleton with busy label and reduced-motion override; browser screenshot readiness explicitly waits for content.
- Empty: catalogue reset, no profile/matches, saved/plans/inbox/review/diagnostics collections use informative next actions.
- Errors: form validation, version conflicts, retryable fetch errors, account expiry/recovery and shared route error boundary. A separate production-server smoke with an intentionally unreachable test database verified the mobile error and retry request; no database was stopped.
- Stale: exact historical evaluation and scholarship evidence, pending recalculation, distinct source failures/last success, accepted change timeline. Controlled outage/replay tested without changing accepted data.

Bounded reference comparisons establish agreement for the tested grammar and cases; they do not prove every behaviour or factual scholarship interpretation. No optimisation proof is claimed.

Final Brevo head6b6399f: full GitHub CI and two native App journeys passed, balance147. App recorded-step coverage omits some authored replay assertions; byte-identical explicit scripts passed locally, and supplemental strict remote execution was declined. See TEST_EVIDENCE.md for exact checked scope. Brevo provider acceptance/dedup and live-mail-enabled registration/login/mobile state were checked; recipient receipt remains unobserved.

## Follow-up coverage

Optional Google configuration and encrypted/persistent OAuth callbacks are covered by isolated-provider unit/PostgreSQL tests. Real localhost authorization reached Google; signed-in consent remains unobserved. Production Chromium covers System/Light/Dark persistence, OS/tab sync, blocked storage, dark/light desktop/mobile workspace screens, Google errors/redirect and live password checklist/confirmation/visibility/reset. Exact runs and boundaries are in TEST_EVIDENCE.md.

Final62b0ac8 checkpoint: software CI steps85unit/31PostgreSQL/build/13production-browser passed; required job failed only native-outcome guard. Exact hosted7sources and7country identical DOM href/ID checks pass separately from native. Actual native4pass/1fail/2blocked, credits120. Post-run receipts are committed locally without another paid docs-only push; published source head independently verified. See FINAL_HANDOFF.md.

## Queue-drain follow-up — 26 October 2026

Head2be6624 has6/7authentic App passes/no blocked cases; only the change-alert assertion failed. The required native API ownership case passed automatically with exact source version/output; all CI software steps passed, and the retained native guard correctly failed. GitGuardian green. Actual104.6credits remain after108.3→104.8(App3.5)→104.6(API0.2).

Read-only diagnosis of isolated other@example.test/control version22 proves the accepted event completed, its change.ready event remained pending with0attempts, no delivery or inbox row yet, valid saved subscription/current preferences, and39pending events. The evaluator correctly returned not_eligible/VALUE_NOT_ACCEPTED. This was an undrained bounded batch, not a missing publication or incorrect eligibility rule. No manual drain/reset was used to hide the failure.

Application workers now return persisted pending/runnable/review counts. Operator pages show them on load and after actions. New Process queued jobs runs at most10sequential batches of10events/deliveries, stops on failure or waiting leases/retry times, and reports actual zero-pending drain or the remaining work. Existing single-batch control stays available. New plan requires zero Pending events and Pending deliveries before switching accounts. Test setup now uses actual queue readiness rather than reading .length from a delivery-state count object.

New integration test creates12real profile events and confirms one10event batch reports remaining work, exact persisted health and student denial. Its first draft incorrectly expected the entire shared historical fixture database to drain within800jobs; residual2509runnable jobs disproved that assumption. The test is scoped to bounded-backlog reporting; existing exact delivery/replay/preference assertions remain in their integration and source journeys.33PostgreSQL tests pass.89unit/typecheck/lint/build and focused3production-browser journeys including9exact scripts pass. Final full browser/screenshot review follows.

Next coherent implementation push estimates one3.5App suite plus0.2API case (3.7) from104.6, preserving50reserve. No duplicate manual or scheduled TestSprite run, purchase, security bypass or merge.

## a201391 final native results and strict status-format correction

Published a20139111e9e69243223525558c3b95c0152f924 is Ready at https://grantpath-ifqjt915y-lammysam8-7688.vercel.app. Authentic App e27c5455-351f-4d70-84b8-de0366ba8447 reports all7passed, individually read back including notification2654f547 and multi-destinationcbfacbce. Native API06d9858e also automatically passed with exact reviewed codeVersion v-5e0325a9c69d and404/403/foreign-read/unchanged-owner output. This resolves the prior browser blockers and undrained notification. Hosted anonymous DOM/API readback confirms all7GLOCAL destinations have identical ID/detail href/literal officialUrl/metadata.

CI40398337022 passed all software steps:89unit/33PostgreSQL/build/13production-browser at that head. Its read-only native guard correctly remained fail-closed because it recognised only 7/7 passed, whereas the authentic App success text was All 7 tests passed. The correction adds only that exact anchored observed format with the exact reviewed count, retaining original format, creator/project/head checks and rejection of failures/blocked/skipped/missing/wrong counts. A new unit case covers these boundaries. No check was removed or manually set green. Next corrected head needs its own automatic results.

Observed104.6→101.1(App3.5)→100.9(API0.2). Official usage confirms100.9, Free; no duplicate manual suite, purchase or schedule. A coherent parser-correction push estimates3.7more, retaining50reserve. Historical failure and original blocked gate are retained in queue-drain receipts.

## Final automatic release checkpoint — 26 October 2026

Published `448831d7edc080b34599c291de19d6f52540fb76` is Ready at https://grantpath-mdgg56q1p-lammysam8-7688.vercel.app. Authentic App [12480f84-dcfe-4db0-8bff-d476687bbcd9](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094/execution/12480f84-dcfe-4db0-8bff-d476687bbcd9) passed all seven cases, including the exact seven-destination comparison, operator exceptions and notification journey. Required native API [5eb82386-d083-4f5f-aadb-390dac395805](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/d36cedef-a40e-4fb7-ae61-f3b2484ede06/execution/e4d3c429-a42b-4f09-9332-e771177edc87/test/5eb82386-d083-4f5f-aadb-390dac395805) passed with exact reviewed code version and real404/403/unchanged-owner output. Correctness workflow https://github.com/samscript18/GrantPath/actions/runs/40401191845 passed all software and native-guard steps. Original required checks, additional API check and strict/admin enforcement remain intact. GitGuardian recheck121861017132 is green, read back through GitHub at21:56UTC on26October2026 after the user resolved incident39071152 and requested recheck. The earlier failed check and unavailable API rerequest remain historical evidence; scanning was not disabled.

Observed remaining balance 97.2; final cycle 100.9→97.4→97.2, debits3.5and0.2. No duplicate run, purchase or merge. Exact evidence files use final-status-*; earlier failure histories remain. FINAL_HANDOFF.md distinguishes checked source from the subsequent local receipt commit and records pending routine scheduler activation, unavailable automated Neon lifecycle, unobserved email recipient receipt and PR metadata403. No unsupported all-assertions or operational-completion claim.
