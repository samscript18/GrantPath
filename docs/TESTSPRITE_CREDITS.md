# TestSprite credit ledger

User-reported total allowance: **150 credits**. Actual portal balance: **not observed**. Planning reserve: approximately **50 credits** for final verification and fixes.

| Operation               | Displayed estimate | Observed debit                  | Observed balance | Result                                 |
| ----------------------- | ------------------ | ------------------------------- | ---------------- | -------------------------------------- |
| No operations performed | Not available      | No credited operation initiated | Not observed     | Awaiting TestSprite account/App access |

Do not treat allowance as observed balance. Inspect live balance and available estimate before each run; if cost is unknown, do not launch broad batches. Reuse reviewed tests, keep automatic PR checks enabled once configured, and do not duplicate manual/automatic checks for one commit without a concrete reason. No credit purchases or scheduled TestSprite runs.

Final local release review, 24 October 2026: Vitest/PostgreSQL/Playwright, production builds and local screenshots used no TestSprite operation. Actual portal balance, operation cost and remote verification remain unobserved. No credits were purchased and no scheduled/automatic TestSprite run was configured. Automatic PR verification must remain enabled once authentic setup is available.

The user reconfirmed “150 credits” and did not know whether the App is enabled. This remains a reported allowance, not an observed portal balance. No TESTSPRITE_API_KEY, CLI credential profile or connected TestSprite tool is available. GitHub access alone does not grant TestSprite account/balance access. Publication remains pending because TestSprite supports configured branch-push triggers and an Include Draft PRs setting; a draft is not an established zero-credit path. No existing trigger or merge gate was disabled.
