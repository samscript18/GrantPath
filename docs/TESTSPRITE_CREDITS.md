# TestSprite credit ledger

User-reported total allowance: **150 credits**. Latest actual account balance, observed through the official CLI 0.15.0 `usage` command on 24 October 2026: **150 credits**, Free plan, **0.5 credits per run** reported by the account. Planning reserve: approximately **50 credits** for final verification and fixes. Generation/exploration costs are not established by that per-run rate.

| Operation                                      | Displayed estimate                      | Observed debit                  | Observed balance | Result                               |
| ---------------------------------------------- | --------------------------------------- | ------------------------------- | ---------------- | ------------------------------------ |
| Read-only usage/project inspection, 24 October | Account rate: 0.5/run; no run requested | No credited operation initiated | 150              | API access works; project list empty |

Do not treat allowance as observed balance. Inspect live balance and available estimate before each run; if cost is unknown, do not launch broad batches. Reuse reviewed tests, keep automatic PR checks enabled once configured, and do not duplicate manual/automatic checks for one commit without a concrete reason. No credit purchases or scheduled TestSprite runs.

Final local release review, 24 October 2026: Vitest/PostgreSQL/Playwright, production builds and local screenshots used no TestSprite operation. Actual portal balance, operation cost and remote verification remain unobserved. No credits were purchased and no scheduled/automatic TestSprite run was configured. Automatic PR verification must remain enabled once authentic setup is available.

Earlier statements above describe the pre-credential local review. Subsequent configured API access established the observed balance and empty project list in the table. No TestSprite test, exploration, generation, schedule or trigger has been started. GitHub App installation and the native 3.0 portal suite/gate remain unverified. No existing trigger or merge gate was disabled.
