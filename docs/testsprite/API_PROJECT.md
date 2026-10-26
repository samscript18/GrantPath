# Native protected API verification

Project: `d36cedef-a40e-4fb7-ae61-f3b2484ede06` (backend).
Case: `88b47334-232c-4665-a6a2-413b09c34eb5`.
Source: [access_denial_api.py](code/access_denial_api.py).
Initial authentic pass: [4253d3f6](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/d36cedef-a40e-4fb7-ae61-f3b2484ede06/execution/5b1a5f05-2a10-4dea-9ce0-4bedcf061200/test/4253d3f6-c7e2-427e-b948-561e190e94a0).

The frontend GitHub App regenerates browser actions and could not execute protected HTTP assertions. The user confirmed enabling saved-code App replay is unavailable. A native backend case executes those assertions directly with independent cookie jars and the existing isolated test accounts. Actual404/403, foreign-read exclusion and every unchanged owner field remain asserted; UI invisibility is never used as server proof.

The additional required **TestSprite API ownership** CI job runs [verify-api-ownership.mjs](../../scripts/verify-api-ownership.mjs) once per release head with an idempotency key. It requires Vercel success and the exact SHA from `/api/health`, matching saved source bytes, sufficient observed credit balance, passed native status, matching returned codeVersion and exact success output. The runner exports a sanitized artifact with execution URL and before/after credit readings. Account-window debits can overlap the parallel frontend App suite; report aggregate debits honestly.

The default environment contains the isolated preview origin, student and other test identities, and an encrypted test password; CI sets expected_commit for the head being tested. No credentials are committed. Repository secret TESTSPRITE_API_KEY is configured. No paid auto-auth, scheduled TestSprite run, hidden mutation endpoint or bypass is used. The original seven-case App and correctness checks remain required with strict/admin enforcement. The frontend privacy companion covers independent-session note isolation. Original access_denial.py remains in local exact-source checks and history.

This automation is scoped to the existing release branch and isolated preview. A future preview origin/branch requires deliberate environment binding before credited verification. Initial native backend debit was0.2credits; account frontend rate reports0.5. The runner uses a conservative0.5backend preflight and preserves50credits. A new implementation head still needs its own actual automatic pass; the initial pass is not extrapolated.

Backend exports add a known public-auth stub and omit the final newline. Source comparison accepts only the exact reviewed body in these observed representations, and rejects changed assertions or other executable prefixes. The required backend case uses the ETH opportunity while the parallel browser privacy case uses Twente, preventing legitimate owner edits in one case from racing the other case's unchanged-data assertion. Identical404/403/foreign-read/owner-field checks remain; no public record is modified.
