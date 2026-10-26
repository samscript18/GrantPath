# Exact-script execution limitation

This is a prepared support handoff, not a message sent to TestSprite. Do not include account passwords, API keys, cookies or signed artifact URLs when sharing it.

Project: a3f56241-4390-4269-8e0e-e88d61104094. CLI: official0.15.0. Plan: Free. The seven sources in `docs/testsprite/code` pass against both an isolated local production build and the actual hosted app/isolated Neon under local Playwright control. Those results are not TestSprite passes.

The GitHub App's artifacts show regenerated browser steps and codeVersion null/v1 values rather than establishing execution of every saved Python assertion. Missing checkpoints and an incorrect bachelor setup produced native failures despite different explicit authored steps. The required main App check and the additional read-only outcome guard remain enabled.

Three focused strict access runs used the supported default environment and `--no-auto-heal`. Each reported replay.path=replay but failed before any reported assertion step:

| Run                                  | Observed failure                                             |
| ------------------------------------ | ------------------------------------------------------------ |
| c68e8a72-2c38-4eb5-9d72-0c47f740ea71 | TargetClosedError at APIRequestContext.post                  |
| e57ecf1e-c18a-410e-b877-a4e66e8f2281 | APIRequest.new_context received unsupported record_video_dir |
| ce999aed-46ee-4a33-9131-8a4a68aa16d9 | TargetClosedError at BrowserContext.new_page                 |

The sources were adapted from context-bound API requests to independent API contexts, then normal same-origin fetches on recorded browser pages. All exact assertions remained and passed locally. The last version is saved in the native project. Total observed strict debit1.5credits; no further strict retry is planned without a concrete provider-side resolution.

Relevant evidence: testsprite-strict-access-browser-context-failure.json, testsprite-strict-access-video-option-failure.json and testsprite-strict-access.json. The full exact hosted journeys include foreign application update404, private listing, unchanged owner revision/note and student/operator403. Internal IDs were not added to student screens and no public mutation/reset endpoint was introduced.

Remaining action: investigate the cloud context instrumentation/lifecycle failures and provide an App execution path that runs the saved assertions faithfully. Then reuse the existing scripts for one focused verification; do not purchase credits, schedule runs, remove the access case or weaken the gate. A complete native automatic green remains necessary before claiming the requested release protection sequence complete.

## Separate routing issue identified

At source963149e a native multi-destination case opened GitHub’s error page. User confirmed the active trigger’s Target URL pattern is the GitHub PR URL, despite the app being deployed/verified. Correct the trigger to https://grantpath-git-{branch-slug}-lammysam8-7688.vercel.app first, retain Active/Merge gate and avoid Send Test Event. This does not explain the earlier strict default-environment context errors, which already targeted the app. Reassess actual artifacts after routing is corrected; do not attribute every native failure to the product or claim all cloud issues are resolved.

Routing follow-up26October: user explicitly confirmed “target corrected”: active Vercel Commit status trigger now uses https://grantpath-git-{branch-slug}-lammysam8-7688.vercel.app, with Active/Merge gate retained and no manual event. This is user-confirmed configuration, not API readback. Saved notification plan separates baseline eligible from changed not_eligible and scopes exactly1alert to the new accepted version; historical alerts remain. No assertion or domain rule was removed. The next coherent evidence push must receive its own automatic run and observed balance.

## Corrected routing verified, execution gap remains

Final62b0ac8 run1e8d5352 metadata actually targets the app, so the routing correction is confirmed. Native4pass/1fail/2blocked; exact7hosted scripts pass. GLOCAL exact href/ID matches under all7countries in an independent final DOM/API capture. Existing access failure bundle download succeeded: code.py byte-identical to saved six-assertion source, bundle metadata has stored versionv-d28835780596, result codeVersion null, and timeline reports UI metadata blockage. This establishes stored-source fidelity, not executed assertions. No further paid replay is justified without a concrete provider execution remedy.

## Concrete runtime remedy verified

26October: independent standard-library HTTP cookie jars remove instrumented browser contexts while retaining all ownership assertions. The frontend runner requires async run_test: initial9e65f3be failed with “An asyncio.Future, a coroutine or an awaitable is required”; corrected strict169e6917passed with replay.path=replay. Zero recorded browser steps is expected for this HTTP script; do not invent a browser timeline or infer complete automatic-suite success. Exact actual responses/unchanged owner data also passed hosted local execution. See testsprite-http-access.json and testsprite-http-access-async.json. Native automatic verification remains pending for the coherent follow-up.
