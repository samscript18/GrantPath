# Focused TestSprite 3.0 suite

No remote suite has been executed or configured. This is the reviewable suite specification for setup when project access is available.

Product: GrantPath is an evidence-backed scholarship catalogue with three-outcome eligibility, private saved application tracking, and reviewed official-source changes. Public data must come from official evidence. Tests use a separate preview database and example.test accounts, with email captured in EmailSink.

Initial thin journey: create account → inspect captured verification link through secure test setup → verify → sign in → save citizenship and separate residence → sign out → sign in and assert persisted values. Assert a second account sees its own blank profile and cannot inject userId or role.

Expand only after local checks: profile → explained scholarship result and linked evidence → idempotent save → private note/checklist/status → reload; controlled source change → accepted version → correct match outcome → one inbox alert → unchanged replay produces none; queued disabled topic suppressed.

Use exact assertions (including reason codes via API tests), stable labels, fixed clocks and seeded isolated fixtures. Review generated tests for invented fields, production URLs and weak assertions. Reuse the suite and select critical journeys rather than broad re-exploration.

## Authentic PR gate setup (pending)

1. Supply the intended GitHub repository, connect Vercel previews with isolated Neon branches, and install TestSprite GitHub App for that repository.
2. Configure the portal to target each same-repository PR preview for the exact head commit, with isolated repeatable accounts. Fork PRs must receive no secrets; mark remote verification pending and require a trusted same-repository branch before merge.
3. Inspect actual credit balance and displayed estimate before enabling the first run. Record both and actual debit in TESTSPRITE_CREDITS.md. No scheduled TestSprite tests. Keep automatic verification enabled after setup.
4. Observe the authentic returned check name and App ID, then require that exact App check in the protected main ruleset alongside local CI. Do not create a similarly named local substitute.
5. In an isolated, explicitly labelled regression branch, preserve a failing result and GitHub blocked-merge evidence, restore the correct behaviour, and preserve fix SHA plus successful rerun. No production regression and no weakened assertions.

No PR URL, check name, App ID, balance, debit, blocked merge or successful remote result is claimed until observed.
