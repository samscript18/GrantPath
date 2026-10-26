# GrantPath release review

## Submission preparation — 27 October 2026

**Portal-generation compliance is unresolved.** Current account/project inspection shows all seven frontend cases are CLI-authored and no portal-authored cases. Project creation was through the CLI on 24 October. App execution and portal visibility do not establish portal generation. No generation event/estimate was supplied, no organiser exception is recorded, and no credited generation has been started. See [the exact owner procedure](PORTAL_GENERATION.md).

The refreshed remote submission baseline is `448831d7edc080b34599c291de19d6f52540fb76`, with [PR #1](https://github.com/samscript18/GrantPath/pull/1) open and unmerged. The public repository is accessible; PR creation was 24 October 2026 at 13:26:20 UTC, within the user's supplied October 16–26 window. The [live app](https://grantpath-git-release-hosted-verification-lammysam8-7688.vercel.app) returns that exact revision. Its immutable deployment is [Ready](https://grantpath-mdgg56q1p-lammysam8-7688.vercel.app). Fresh GitHub reads confirm CI, GitGuardian, Vercel, TestSprite V3 (seven browser passes) and the separate native API ownership check passed at that baseline. The [App comment](https://github.com/samscript18/GrantPath/pull/1#issuecomment-6427296986) exists. This does not verify a later source.

The owner explicitly approved including semantic field search on 27 October. Its original local work was preserved in `feature/semantic-field-search` at `14b492e`, then included in the release branch. Added shared PostgreSQL result caching, globally committed provider-call budgets (12/hour, 60/day), input/batch limits and explicit fallback are being verified before one coherent publication. **The new final-head hosted/App result is pending at this preparation checkpoint.** Existing receipt commit `d85c45a` remains in history. No earlier green result is attributed to the new feature.

Fresh anonymous catalogue inspection excludes labelled fixtures: **32 real records, 23 providers, 17 actual destination countries, six regions; 23 cycle records and nine overviews; seven open, two upcoming, five closed and eighteen unknown**. These are not 32 open scholarships. GLOCAL remains one record across seven destinations and pathways vary.

Official account readback: **Salman**, **lammysam8@gmail.com**, Free plan, **97.2 credits**. This preparation has spent **0 TestSprite credits** so far. Preserve approximately 50; the observed seven-case App plus native API execution estimate is 3.7 total, while portal generation has **no established estimate**. No manual duplicate, scheduled TestSprite run, purchase or paid plan.

Both GitHub routine worker workflows are currently `disabled_manually`; no TestSprite schedules exist. Successful manual runs [application40180139452](https://github.com/samscript18/GrantPath/actions/runs/40180139452) and [source40180145842](https://github.com/samscript18/GrantPath/actions/runs/40180145842) are historical dispatch evidence, not recurring monitoring. Two old queued manual runs also remain; review them before any future enablement. See [operational activation handoff](OPERATIONS_HANDOFF.md). Optional automatic Neon lifecycle remains unconfigured; Brevo provider acceptance does not prove recipient receipt.

Fresh branch-protection readback returned **403 Resource not accessible by integration**. No alternate identity was tried and no protection was changed. Historical strict/admin-enforced requirements remain recorded in `evidence/github-release-gate.json`; fresh success statuses are separate from that historical protection snapshot.

Readbacks: [GitHub](evidence/submission-github-readback.json), [account and case origins](evidence/submission-testsprite-readback.json), [live catalogue](evidence/submission-live-readback.json), [deployment and workflows](evidence/submission-operations-readback.json). Final PR description is [SUBMISSION_PR.md](SUBMISSION_PR.md); draft entry is [DISCORD_SUBMISSION.md](DISCORD_SUBMISSION.md). No merge or Discord post has been made.

---

## Preserved historical record — dated claims below apply only to their named source

# Release review — 26 October 2026

All three required checks passed at `448831d7edc080b34599c291de19d6f52540fb76`: correctness, original TestSprite App (7/7) and native API ownership (exact source/assertions). Vercel is green. GitGuardian recheck121861017132 is green, read back through GitHub at21:56UTC on26October2026 after the user resolved incident39071152 and requested recheck. The earlier failed check and unavailable API rerequest remain historical evidence; scanning was not disabled. PR1 is unmerged.

[Complete handoff](FINAL_HANDOFF.md) records the exact source, immutable deployment, individual run evidence, coverage, red/green history, credit debits and remaining operations. [Automatic workflow](https://github.com/samscript18/GrantPath/actions/runs/40401191845); [App execution](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094/execution/12480f84-dcfe-4db0-8bff-d476687bbcd9); [API execution](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/d36cedef-a40e-4fb7-ae61-f3b2484ede06/execution/e4d3c429-a42b-4f09-9332-e771177edc87/test/5eb82386-d083-4f5f-aadb-390dac395805).

Local 90 unit/typecheck/lint/build pass. The queue implementation passed 33 PostgreSQL and 13 production-browser journeys including nine exact sources; full software checks passed again in final CI. Hosted canonical readback confirms all seven literal GLOCAL URLs and final revision. Local results are separate from authentic TestSprite results.

Observed 97.2 credits remain. Main retains all three required identities, strict freshness and admin enforcement. No gate was bypassed, merge attempted or purchase made. Routine cron activation, optional automatic Neon lifecycle, recipient receipt and owner PR metadata/submission remain explicitly pending. Post-run receipts are local-only and are not claimed remotely checked at a later commit.
