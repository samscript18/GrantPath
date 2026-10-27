# Portal generation — unresolved, 27 October 2026

The organiser requires generation in the TestSprite 3.0 web portal against the live
app. The original seven cases were authored/saved using the official CLI. Fresh
project metadata says `createdFrom: cli`, every frontend case is marked `cli`,
and the preflight `--created-from portal` read returned no cases. The owner later manually created three portal cases; see PORTAL_CASE_REVIEW.md. These observations
do not prove that no exploration ever occurred; the portal Activity Log still
needs inspection. No generation event, generated-case provenance or organiser
exception has been supplied. App execution is separate evidence.

Portal controls cannot be operated in this agent session: the Browser integration's
required browser-control tool is not exposed. No CLI generation is substituted.
The generation/exploration estimate is unknown, so no credited generation is run by this agent. The owner expressly confirmed manual portal creation, not AI generation.

## Exact owner procedure

1. Sign in as **Salman / lammysam8@gmail.com** and open the existing
   [GrantPath project](https://www.testsprite.com/dashboard-v3/o/76bdd244-19c4-5d53-804b-92e29f6cfd98/projects/a3f56241-4390-4269-8e0e-e88d61104094).
   Inspect **Activity Log**, filtering for exploration/generation around project
   creation on 24 October and afterwards. If a genuine event exists, retain its
   date, project, live target, event/job identifier and resulting case IDs.
2. If none exists, use the existing project's portal generation flow. The
   documented portal **AI Chat** can propose a scoped action for review. Request:

   > Generate one frontend test for scholarship discovery's empty-result recovery
   > against https://grantpath-git-release-hosted-verification-lammysam8-7688.vercel.app.
   > Open /scholarships, search GrantPathNoSuchAward2026, verify no matching
   > scholarships and the visible recovery action, then clear filters and verify
   > the normal catalogue returns. Use public pages only. Preserve the seven
   > existing cases, environments, history and GitHub App trigger. Do not run tests,
   > regenerate the whole app, create schedules, or modify accounts.

   Inspect the proposed action and **displayed total estimate**, including any
   prerequisite exploration/strategy. After the semantic release, observed balance is 92.0; preserve
   50 plus enough for final App/API execution (seven-case estimate 3.7; an eight-case suite plus API would be 4.2 at observed rates).
   If a focused scope or cost estimate is unavailable, stop before starting it.
   Do not guess a button name or accept broad exploration as equivalent scope.

3. Review the resulting proposed case in the portal. Require real `/scholarships`
   controls, an unmistakable empty state, functional recovery, no fixed catalogue
   count, no invented subject list, and no sign-in/real-account assumptions. Retain
   only the small useful coverage. Do not delete historical cases to avoid a duplicate.
   Preserve the portal generation event plus resulting case ID and reviewed assertions.
4. Include the reviewed case in the App-connected suite using supported project/test
   list selection. Confirm it is selected in the existing GitHub App configuration;
   do not replace its environment or disable Blocking PRs. If the suite count changes,
   update the reviewed manifest and exact-count CI expectation coherently. The guard
   must continue to require every case; do not loosen it to accept an old seven-case run.
5. After the deployment is healthy and changes are batched, obtain one actual
   automatic App result covering the resulting suite at the intended commit. Avoid
   an overlapping manual run. Record the generation cost separately from execution,
   actual balance, cases, event and run links. Until then, this requirement stays unresolved.

The interface has not been inspected here; AI Chat and Activity Log are documented
capabilities, not a claim that a particular generation button was observed.
References: [official portal introduction](https://www.testsprite.com/blog/how-do-i-get-started-with-testsprite),
[official changelog](https://www.testsprite.com/changelog),
[organiser's portal-suite requirement](https://www.testsprite.com/hackathon-s4).
The user's supplied October 16–26 window is retained; no deadline extension is
inferred from the public page and no further deadline confirmation is requested.
