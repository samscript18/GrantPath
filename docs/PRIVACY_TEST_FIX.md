# Privacy case fix —27October2026

**Existing TestSprite case:** `ca8b9978-5bbc-423f-8612-bfb879698279`. Its [targeted rerun](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094/execution/56186d80-94a6-4bf2-9eaa-b497203f6f2b/test/7ddcf48b-d0a4-44d6-be47-c6cf3d8ccfd4) **passed** against hosted application source `5c822c3def5c79ef43b9bbec3abc27f739b302c8`. No case was deleted or recreated.

The blocked App run completed the owner save and second-account inspection, then signed back in as owner. Its final assertion expected the Twente detail while the browser was still on the dashboard; TestSprite stopped with a loop warning. The reviewed plan now has a separate direct-navigation action to `/scholarships/twente-uts-2027` before the final note-value assertion. Discovery/search loops are unnecessary.

The executable Python companion uses one browser context and real sequential logout/login sessions. Owner persistence is checked both after an immediate reload and after returning from the second account. The other student’s note must differ from the owner-only marker and Operator navigation must remain absent. All original privacy assertions remain; native API404/403 enforcement is still separately required.

The first targeted run of the corrected flow hit `TargetClosedError` before a page was created. The passing TestSprite companion uses explicit single-process/shared-memory launch flags. Matching those flags fixed the provider-container failure. The updated exact source passed local Chromium against the hosted app, then the native TestSprite targeted rerun passed. The first failed attempt is preserved; no app/authentication change, database reset, role mutation or manual green status was used.

Saved version: `v-7fe483322776`. Source SHA256: `12b3439ffd686382e90bebd715fdad73ce06a643b633481edac360e831710a0c`. Dispatch and before/after stored source were verified. The provider’s passing result omits runtime `codeVersion` and recorded steps; independent runtime byte identity is not claimed. This is a targeted CLI result, not a new complete GitHub App check. The original 17/18App execution and failed correctness gate remain historical.

Cost:38.9 →38.4 for the initial failed runner, then38.4 →37.9 for the passing retry. Total **1.0**, with the **30-credit reserve preserved**. No other tests or new generation were dispatched. The remote TestSprite case is updated; repository source/manifest and receipts stay local to avoid a full18-case paid push.

Evidence: [redacted original actions](evidence/privacy-loop-preflight.json), [first runner failure](evidence/privacy-loop-first-runner-failure.json), [exact local check](evidence/privacy-loop-hosted-local-check.json), [saved fix](evidence/privacy-loop-saved-fix.json), [dispatch](evidence/privacy-loop-targeted-dispatch.json), [passing receipt](evidence/privacy-loop-targeted-result.json).
