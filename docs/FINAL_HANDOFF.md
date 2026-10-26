# GrantPath handoff — 26 October 2026

## Queue-drain follow-up — 26 October 2026

Head2be6624 has6/7authentic App passes/no blocked cases; only the change-alert assertion failed. The required native API ownership case passed automatically with exact source version/output; all CI software steps passed, and the retained native guard correctly failed. GitGuardian green. Actual104.6credits remain after108.3→104.8(App3.5)→104.6(API0.2).

Read-only diagnosis of isolated other@example.test/control version22 proves the accepted event completed, its change.ready event remained pending with0attempts, no delivery or inbox row yet, valid saved subscription/current preferences, and39pending events. The evaluator correctly returned not_eligible/VALUE_NOT_ACCEPTED. This was an undrained bounded batch, not a missing publication or incorrect eligibility rule. No manual drain/reset was used to hide the failure.

Application workers now return persisted pending/runnable/review counts. Operator pages show them on load and after actions. New Process queued jobs runs at most10sequential batches of10events/deliveries, stops on failure or waiting leases/retry times, and reports actual zero-pending drain or the remaining work. Existing single-batch control stays available. New plan requires zero Pending events and Pending deliveries before switching accounts. Test setup now uses actual queue readiness rather than reading .length from a delivery-state count object.

New integration test creates12real profile events and confirms one10event batch reports remaining work, exact persisted health and student denial. Its first draft incorrectly expected the entire shared historical fixture database to drain within800jobs; residual2509runnable jobs disproved that assumption. The test is scoped to bounded-backlog reporting; existing exact delivery/replay/preference assertions remain in their integration and source journeys.33PostgreSQL tests pass.89unit/typecheck/lint/build and focused3production-browser journeys including9exact scripts pass. Final full browser/screenshot review follows.

Next coherent implementation push estimates one3.5App suite plus0.2API case (3.7) from104.6, preserving50reserve. No duplicate manual or scheduled TestSprite run, purchase, security bypass or merge.

Release protection is not fully green yet. Do not claim submission readiness. No merge, Discord submission, purchase or protection bypass was performed.

## Published revision

- Source commit: [2be6624def11fba477a5fcd41d85ab23bf193812](https://github.com/samscript18/GrantPath/commit/2be6624def11fba477a5fcd41d85ab23bf193812), branch release/hosted-verification.
- Public app: https://grantpath-git-release-hosted-verification-lammysam8-7688.vercel.app
- Immutable Ready deployment: https://grantpath-20cfsngip-lammysam8-7688.vercel.app (dpl_CDU2zSPU5drfaeoLH4FPXNtHXFrd).
- PR: https://github.com/samscript18/GrantPath/pull/1
- Post-run receipts are local documentation changes after this published head. No passing result is attributed to a later receipt commit. An extra paid seven-case run solely to upload receipts was avoided.

## Implemented and locally verified

The existing application, data, design, authentication, Brevo and Cloudinary remain. Additive country/multiple-destination modelling preserves programme/cycle identity, saved applications and immutable accepted histories. Preference ranking remains separate from eligibility; missing provider conditions remain mandatory confirmation.

Approved official directory discovery extracts bounded allowed links, deduplicates and queues detail retrieval outside Vercel. Adapters produce evidenced candidates with explicit unknowns. Deterministic reason-coded policies and manual review share the transactional publisher, immutable versions/evidence, audit and durable outbox. Published changes recalculate current matches and fan out preference-aware, deduplicated notifications; unchanged replay produces no event, reversals create new audited versions, source failure preserves accepted information.

This follow-up exposes the exact canonical GLOCAL officialUrl on each catalogue result, alongside all seven study-location links and metadata. All destinations use https://globallocal-erasmusmundus.eu/about-glocal/programme-overview/. Read-only hosted DOM/API checks verify one ID, one detail href, one record per filter and identical literal official URL under GB/DE/ES/SE/CO/JP/NL. No destination-specific redirects or invented country tags.

Operator verification uses explicit pressed scenario buttons, retained after processing, and scholarship-scoped accepted publication history so old events remain inspectable outside the bounded recent30. Exception decisions show actual accepted version and publication-event count, including None/0 for an unpublished candidate. Student details separately show Provider application window and actual private application progress, or an honest sign-in/unsaved prompt. Desktop/360px screenshots were inspected locally and hosted.

Local89unit/typecheck/lint,32PostgreSQL, production build and13production-browser journeys pass. The final exact-source harness additionally passes all9scripts, including actual eligibility/notification/replay/preference/ownership assertions. Export-format tests reject changed assertions, unknown wrappers and added executable code. These local results are not TestSprite passes. See TEST_EVIDENCE.md for failures, fixes and exact run boundaries.

## Actual coverage

Fresh hosted public metadata readback excludes labelled fixtures:32real records,23providers,17actual destination countries across six regions.23cycle records/9scheme overviews;7open/2upcoming/5closed/18unknown at the recorded snapshot. These are not32open applications.

| Region        | Actual destinations                                              |
| ------------- | ---------------------------------------------------------------- |
| Europe        | United Kingdom, Switzerland, Netherlands, Germany, Spain, Sweden |
| Africa        | Ghana, Uganda, South Africa                                      |
| North America | Canada, United States                                            |
| Asia          | Japan, South Korea, Türkiye                                      |
| Oceania       | Australia, New Zealand                                           |
| Latin America | Colombia, through the joint programme                            |

Twelve official detail candidates have real automatic-publication provenance; three live directory workers succeeded (GLOCAL, McGill, Makerere). Some initial coverage used approved manual detail registration; not all records were newly discovered by a schedule. GLOCAL pathways vary; a student does not necessarily study in every listed country. See SOURCE_COVERAGE.md and evidence/preview-coverage-summary.json.

## Exceptions and remaining operations

Conflicting sources, unsupported layouts/conditions, missing critical text, ambiguous dates or cycle interpretation, unsupported funding/requirement changes, and suspicious mass changes require operator review. Sources and policies can be paused without removing accepted data. No retrieval failure closes a scholarship or advances successful verification.

Actual manual GitHub application40180139452 and source40180145842 executions succeeded. Application:20events/0failed,6deliveries suppressed,2in-app published. Source:2GLOCAL links, one unsupported detail/layout reached review; no new publication claimed for that dispatch. Routine cron remains disabled pending the owner's separate merge, binding intended database/origin/auth environment and enabling/verifying successful scheduled timestamps. Source execution remains outside Vercel. No merge was performed to enable schedules.

Automatic Neon preview lifecycle remains unavailable without API/project/sanitised baseline configuration. Existing isolated preview is retained; private student data was not copied. Brevo sender/provider acceptance/idempotence are verified historically and preserved; recipient receipt remains unobserved. Controlled notifications use isolated .test identities.

## Actual TestSprite and required checks

- Original seven-case App: **6/7 passed · 1 failed**, [execution](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094/execution/f10fd766-2142-4c52-8111-49f824eb23fd). App runtime may regenerate browser actions; a passing natural-language verdict is not claimed as proof that every saved Python assertion ran.
- Additional required **TestSprite API ownership**: automatically passed at this exact head, [native run](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/d36cedef-a40e-4fb7-ae61-f3b2484ede06/execution/fd530f9a-a835-4915-b374-ee141cf2c842/test/cb578167-da2f-40cf-b15a-3fc90006bb52). Returned codeVersion v-5e0325a9c69d matches reviewed source. Actual404cross-account update, foreign-read exclusion, every unchanged owner field and403operator denial were asserted. A revision assertion verifies the target commit before authentication; targetUrl metadata is null and is not invented. [CI job](https://github.com/samscript18/GrantPath/actions/runs/40392594544/job/121817174937).
- [Correctness workflow](https://github.com/samscript18/GrantPath/actions/runs/40392594544): failure.
- Main requires correctness/App15368, original TestSprite V3/App2756476 and additional TestSprite API ownership/App15368; strict freshness and administrator enforcement retained. Actual final readback belongs in evidence/github-release-gate.json.

The user confirmed enabling saved-code replay for GitHub-triggered runs was unavailable and requested an alternative. A native backend project executes protected HTTP assertions directly; the browser privacy companion checks independent-session note isolation. No hidden mutation/reset endpoint, Pro auto-auth or security bypass was added. Backend export comparison allows only the exact observed public-auth prelude and one EOF newline difference; all assertion body bytes remain enforced. Parallel API and browser cases use separate awards to avoid legitimate owner-edit races.

## Authentic regression and historical failures

The discovered residence-clearing defect was explicitly reintroduced only on isolated verification head f13ab930f03683f1cc716fd67f3605deabdeef04. [Native failure10178282](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094/execution/10178282-1655-45f4-a09c-a39db97410dc) caught Ghana remaining after removal; actual failed App status and blocked merge/required identities are preserved in evidence/global-native-red-gate.json. The empty-string fix and later automatic profile passes are preserved. No security regression or production history corruption was introduced.

Earlier partial App executions, provider instrumentation errors, incorrect trigger target, bounded-history lookup, stale scenario selector, incorrect literal search text and account-switch mistakes remain in TEST_EVIDENCE.md and evidence/. Source3591af7 had4pass/1fail/2blocked; b5bbce7 had4pass/1fail/2blocked and its new API job stopped before dispatch on the export-format mismatch. GitGuardian is green; old synthetic checklist findings were resolved by the user without deleting tests.

## Credits and handoff limits

Observed balance **104.6credits** after2be6624:108.3→104.8for one7case App suite (3.5), then104.8→104.6for the native API case (0.2). The previous b5bbce7 App cost3.5; its API formatting failure incurred no dispatch/debit. No duplicate manual run, exploration/generation, schedule, purchase or paid plan. Fifty-credit reserve remains.

PR metadata update previously returned403; this permission boundary was respected. Prepared current description is SUBMISSION_PR.md for the owner to paste. Do not merge or submit without a separate instruction. Remaining setup: routine scheduler activation after separately authorised merge, optional automatic Neon lifecycle, recipient receipt observation, and final organiser submission. See exact final required-check outcome above before claiming submission readiness.
