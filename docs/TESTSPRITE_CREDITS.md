# TestSprite credit ledger

Allowance: **150 credits**. Latest actual balance, observed through official CLI 0.15.0 `usage` on 24 October 2026: **148 credits**, Free plan. Account-reported rate: **0.5 credits/run**. Reserve approximately **50 credits** for final verification and fixes. Generation/exploration cost is not established by the run rate.

| Operation                                                                                          | Estimate                           | Observed debit | Observed balance | Result                                                                                             |
| -------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| Read-only account inspection                                                                       | No run                             | 0              | 150              | Native V3 account, initial project list empty                                                      |
| Create project, configure isolated account, save two plans                                         | No exploration/execution requested | 0              | 150              | Two cases ready; official offline lint passed                                                      |
| User sends PR test event; execution `9e9aec5c-54f3-4e6f-84a0-d15e8ec68394`                         | 2 × observed 0.5/run = 1           | **1**          | **149**          | **2 passed** on head 81f2164; authentic App success observed                                       |
| Automatic PR event on documentation head 15e6d7c; execution `bec3b808-1c62-4735-897a-114ccf1c39fb` | 2 × 0.5 = 1                        | **1**          | **148**          | **2 reported passes**; saved replay review identified coverage gaps, corrected before the next run |

Execution: https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094/execution/9e9aec5c-54f3-4e6f-84a0-d15e8ec68394

Authentic PR comment: https://github.com/samscript18/GrantPath/pull/1#issuecomment-6385000740

The user reports trigger Active after connecting the App. No duplicate CLI run, schedule, exploration or broad generation was requested. Keep automatic PR verification enabled. Both terminal per-case verdicts and the real App success status were observed. New commits require their own verification and debit observation. Local Vitest/PostgreSQL/Playwright operations are separate evidence and consume no TestSprite credits. No credits or paid plans purchased.

The next release changes the email provider to Brevo and stores explicit assertion-complete Python scripts. Local execution of those exact scripts passed; the changed release will receive one automatic App run. No manual duplicate is requested. Pre-dispatch observed balance: 148; estimate for two cases: 1. Record its actual debit and outcome.
