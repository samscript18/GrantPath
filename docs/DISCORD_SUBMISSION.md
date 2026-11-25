# GrantPath — scholarship discovery with evidence you can inspect

**TestSprite account:** Salman — lammysam8@gmail.com
**PR with the TestSprite App check:** https://github.com/samscript18/GrantPath/pull/1
**Live:** https://grantpath-git-release-hosted-verification-lammysam8-7688.vercel.app
**Repo:** https://github.com/samscript18/GrantPath

Finding a scholarship is only the beginning. Students still have to work out whether they qualify, where they would study, which requirements need confirmation, and what changed since they last checked.

GrantPath brings that work into one place. Browse scholarships, inspect official evidence behind eligibility requirements, save opportunities, and track private application progress. An unknown requirement stays visible as something to confirm. A relevant search result does not become a promise of eligibility.

### What makes it useful

Field of study search understands related subjects: Chemistry can find an organic synthesis award even when the labels differ. Vertex Gemini uses published scholarship content, with validated responses, shared caching, spending limits and an explicit text-only fallback when semantic matching is unavailable. Private profiles and application notes are not sent to the model.

Joint programmes keep one identity across their destinations. GLOCAL appears under seven study countries without becoming seven duplicate scholarships, and its destination entries link back to the same official programme source.

Approved source workers validate proposed updates, preserve accepted versions and route unsupported or conflicting changes to operator review. Missing source content cannot silently erase an accepted requirement. Successful manual worker runs are recorded; recurring discovery and notification schedules remain disabled.

At the last verified snapshot, the catalogue held **32 real records from 23 providers across 17 countries and six regions**: seven open, two upcoming, five closed and eighteen with availability unknown. These include programme overviews as well as application cycles.

### Try it in a minute

1. Open **Discover scholarships**, filter by destination or study level, and inspect an opportunity's eligibility explanation and official evidence.
2. Search for **GLOCAL**, then compare its destination entries: one programme, several possible study locations.
3. Try **Field of study**, then create your own account to save an opportunity and track private application progress.

### A real bug, caught and fixed

Removing Ghana from a study profile once left the old residence saved. TestSprite caught the stale value in a real browser run, the required check blocked merging, and the fix subsequently passed. The failed execution and later verification remain in the repository.

Failure evidence: https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094/execution/10178282-1655-45f4-a09c-a39db97410dc

### What TestSprite verified

The suite combines authored cases with tests generated through the web portal's **Add Tests with AI** flow against the live app. Coverage includes discovery and official evidence, profiles and applications, joint-programme identity, publication and exception handling, private notes, delivered notifications and navigation. Separate native API checks verify cross-account read/write isolation and operator access denial.

The last complete GitHub App execution at source `5c822c3` reported **17/18 passed and one blocked**. The privacy case hit a provider loop warning before its final persistence check. After correcting return navigation and browser runner settings, that existing case **passed a targeted rerun with its assertions retained**. This targeted pass does not replace the original complete App result; the required App gate remains failed. Native API ownership verification, GitGuardian and Vercel passed at that source.

Complete App run: https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094/execution/de9e499a-6b33-4e91-b083-6082e087b55f

Passing privacy retry: https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094/execution/56186d80-94a6-4bf2-9eaa-b497203f6f2b/test/7ddcf48b-d0a4-44d6-be47-c6cf3d8ccfd4

---

Preparation note — not part of the Discord post: draft only; nothing posted. No demo video URL has been supplied. Test results above describe the recorded verification, not a fresh status refresh. See FINAL_HANDOFF.md, PORTAL_GENERATION.md and PRIVACY_TEST_FIX.md for provenance and verification limits. Do not describe the PR as fully green unless a later complete required check establishes it.
