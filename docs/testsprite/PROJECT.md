# Native TestSprite 3.0 project

Project: `a3f56241-4390-4269-8e0e-e88d61104094` ([portal](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094)). Created with official CLI 0.15.0, native V3 account confirmed. This is CLI-authored preparation visible in the 3.0 portal; no portal-authored/executed result is inferred.

Target: https://grantpath-git-release-hosted-verification-lammysam8-7688.vercel.app

PR: https://github.com/samscript18/GrantPath/pull/1

| Case                    | Native test ID                         | Exact scope                                                                                                   |
| ----------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Discovery and evidence  | `32f78efb-a7b0-4a30-a838-bc5b020f84e5` | Search/filter persistence, real Twente record, partial funding, official evidence                             |
| Profile and application | `52c1618f-923c-48e7-b2bb-e48a8dfddbb6` | Separate citizenship/residence, final-year future study, explained matches, private saved progress and return |

Plans in `plans/` passed official offline lint: two valid, zero issues. Cases were saved without exploration, generation or execution. A randomly passworded example.test student is stored securely on the default environment; no credentials are committed. Its actual hosted login was checked independently with Playwright. Use this environment for the App's PR environment clone.

The user reports GitHub App connected and supplied a screenshot showing detected Vercel commit status/check and `vercel[bot] PR comment`. Select the actual Ready bot comment and use URL pattern `https://grantpath-git-{branch-slug}-lammysam8-7688.vercel.app`. The user configured the trigger in the portal; execution 9e9aec5c-54f3-4e6f-84a0-d15e8ec68394 ran both cases and **both passed**. GitHub status TestSprite V3 from App 2756476 is required on main. Keep Active and Block PR until tests pass enabled once configured. No schedules or duplicate CLI/App runs.

Account observation after preparation: 150 credits; 0.5 credits/run. First two-case execution estimated 1 credit; actual observed debit 1, balance 149. Broad exploration has no established estimate and is not requested. Preserve approximately 50 credits.

## Reusable assertion correction

The automatic second execution `bec3b808-1c62-4735-897a-114ccf1c39fb` reported two passes, with debit 1 and balance 148. Reviewing exported v2 code found missing assertions from the natural-language plans (including destination persistence and the exact funding range). The profile export also omitted persisted citizenship/residence checks. Explicit Python replacements in `code/` preserve all these assertions and the exact note punctuation. Both passed locally against the live preview (17.492s and 36.322s), using Python Playwright 1.60.0 with the existing project Chromium executable.

Saved through the official code API without execution: discovery version `v-f8ff1573758e`, profile version `v-6ad74e9476aa`. The next automatic App execution must verify those scripts at the Brevo release head. No assertion was weakened.

Final published Brevo head6b6399f: App execution daa54b31-5049-41d8-b1c5-e50d30b00675 reported2passes, debit1, balance147. Saved source remained identical, but its App timeline still replayed older recorded actions. Additional strict saved-code verification was declined before execution. This coverage gap stays explicit; do not report all intended assertions remotely established.
