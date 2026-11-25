# Catalogue growth follow-up — 10 November 2026

## Diagnosis

At the initial diagnosis, production https://grantpath-lake.vercel.app ran main source `fdc94cca2009697a3f24c0f8e0ae4305636d4472`. Its default active filter returned 28 records; `availability=all` returned 33. Closed/expired records account for the difference, not a cached fixed total.

Production metadata inspection found 20 review candidates and 17 pending candidates. Examples included UCT alumni, programme-team, scholar-development and McGill tag pages. These are not separate scholarship opportunities. Both inspected detail batches sent all six selected pages to review with `UNSUPPORTED_DETAIL_MAPPING` / `UNSUPPORTED_LAYOUT`. A successful fetch workflow was not a successful new publication. The latest inspected directory run also failed on DAAD's `ROBOTS_UNAVAILABLE:403`.

The local `.env` pointed to a different older database with 32 records and October check timestamps. Source diagnosis therefore used the confirmed Vercel production binding in an ignored file, without printing credentials or reading student records.

## Implementation

- Added explicit candidate selection, separate from permission to fetch an evidence URL. Existing static sources only queue supported programme URLs; Makerere queues supported announcement URLs. Twente's new directory uses its actual scholarship-title selector and an approved university-managed award path family.
- Old pending navigation candidates can become `ignored` without a fetch. The production cleanup retired 17 unlinked pending navigation candidates, with no source requests or catalogue-count change; [receipt](evidence/discovery-growth-navigation.json). The transition and audit are atomic. Accepted information, old observations and review history are retained; nothing is deleted.
- Added Twente's structured award template: title, institution/location, master's programme list, original funding passage, conditions and date wording come from the official HTML. Missing sections, unexpected dates, invalid calendar dates and unsupported routes stay unpublished.
- An explicit academic-year statement establishes a cycle. A deadline year alone never becomes an intake. Otherwise one stable scheme overview is used, with unknown availability/deadline semantics and the original date passage retained with confirmation wording. Moving that date cannot create a duplicate programme.
- Incomplete provider conditions remain a mandatory unknown requirement. Funding is not called comprehensive. No closing instant, time zone, GPA conversion or open window is invented.
- The shared transactional publisher remains responsible for versions and events. A changed template content hash or material amount/conditions reaches review. The server persists validated dynamic identity so an authorised operator can resolve that exception through the existing review service; student requests cannot supply a new identity.
- Source CLI reports new versus known candidates, excluded links, genuinely new versus updated scholarships, unchanged results, review, rejection and failure. It appends the same counts to GitHub's step summary. Empty work explicitly says no scholarship was added. Failures still produce a nonzero exit code.

## Verification checkpoints

Baseline: 102 unit tests, typecheck and lint passed before changes.

Current local verification: 108 unit tests, typecheck, lint, 40 PostgreSQL integration tests and production build passed. The tests cover actual transactions, new template identity, catalogue visibility, concurrent unchanged replay, one version/event, separate explicit cycles, held amount changes, authorised dynamic exception approval and retirement of navigation without fetching.

The configured local database denied its old roles. A separate loopback PostgreSQL cluster was created on port 55433 with empty integration/browser databases and the existing eight migrations. No existing database was reset. The first browser attempt could not launch because the pinned Chromium binary was absent; after installing the pinned browser, all14 production-browser journeys passed in3.2minutes, including nine exact reusable Python sources. These are local Playwright results, not TestSprite results.

Live-source verification is using the actual robots-aware/paced downloader and production policy/publisher against the isolated test database. Five supported Twente links were discovered,26 out-of-scope links excluded and three real detail pages automatically published. Fresh HTTP replay returned unchanged, preserving the exact version and event counts. The receipt is [discovery-growth-live.json](evidence/discovery-growth-live.json); its before/after totals include two existing isolated test cycles, which are explicitly excluded from the three real publication results. Melbourne's robots endpoint returned403 and was not bypassed or used for publication.

## Production verification completed

The same robots-aware downloader, template extractor, deterministic publication policy and transactional publisher ran against the confirmed production binding. It added:

| Scholarship                          | Cycle interpretation                           | Availability |
| ------------------------------------ | ---------------------------------------------- | ------------ |
| Kipaji Scholarship                   | Scheme overview; application cycle unconfirmed | Unknown      |
| Professor De Winter Scholarship      | Explicit academic year2028/2029                | Unknown      |
| ITC Excellence Scholarship Programme | Scheme overview; application cycle unconfirmed | Unknown      |

The production catalogue increased from **28 to31 in the default view** and **33 to36 across all windows**. These totals do not mean31or36open applications. Anonymous hosted API readback confirms one record for each new title and the exact official links. Desktop/360px screenshots were inspected; mobile overflow check passed.

A fresh HTTP replay preserved the first record's version1and its single publication event (1before/1after). No record, version or event was duplicated. Accepted information and student accounts were preserved; no production seed/reset or test record was used. The publication changes were accepted automatically; no manual approval substituted for the policy.

The initial run used future-dated scheduled activation so the older worker could not claim this new adapter. It then paused retrieval and automatic publication in finally. The actual directory success time and accepted evidence remain. Registration can defer activation for at most48hours; normal due directory discovery still queues immediately. The source must be re-enabled only after the reviewed worker code is deployed.

Receipts: [production run](evidence/discovery-growth-production.json), [anonymous hosted readback](evidence/discovery-growth-hosted.json), [isolated live verification](evidence/discovery-growth-live.json). No TestSprite execution or paid plan was used. The existing post-hackathon policy has TestSprite triggers/checks retired by owner instruction; software correctness and security scanning remain.

## Merged deployment and operational verification

The owner merged [PR #2](https://github.com/samscript18/GrantPath/pull/2). Reviewed implementation `1d5c82394aacd2058daee82b595cf9b0f789bfa3` is present unchanged in main merge `bc8601771b8a06c2297107dc624b4792c3d5a8fa`. Production is Ready at https://grantpath-lake.vercel.app and reports that exact revision. Immutable deployment: https://grantpath-numizzbzw-lammysam8-7688.vercel.app. See [deployment receipt](evidence/discovery-growth-main-deployment.json).

Twente was re-enabled after this deployment, with automatic publication enabled. Its actual listing check found five known candidates and excluded 26 unrelated links. Bounded detail checks published **NL Scholarship**, retained three unchanged awards, and routed ITC Faculty Early Bird Programme to review for unsupported layout/mapping. Four real awards have now been added in this increment. Final public readback: **32 default-view records / 37 total**, up from 28 / 33. These are catalogue counts, not confirmed-open scholarship totals. Unknown conditions and application windows remain explicit.

Twente's last successful directory check was 10 November 2026 at 13:19:21 UTC; its next due time is 11 November at 13:19:21 UTC. The first eligible routine workflow after that time depends on best-effort GitHub scheduling. The [activation receipt](evidence/discovery-growth-activation.json) records actual outcomes and the enabled policy. Earlier production-run receipts intentionally preserve the initial pause before deployment.

Actual GitHub verification at the merged main revision:

- [PR correctness CI](https://github.com/samscript18/GrantPath/actions/runs/42820685854) and GitGuardian passed at the reviewed source head.
- [Post-merge correctness CI](https://github.com/samscript18/GrantPath/actions/runs/42822909925) passed, including database checks, build and production-browser journeys.
- [Bounded source dispatch](https://github.com/samscript18/GrantPath/actions/runs/42823733497) passed: no directory was due, one detail was unchanged, no legacy source was due, and **zero** scholarships were added by that dispatch. This verifies execution and truthful counters; the separate live activation published the fourth award.
- [Application dispatch](https://github.com/samscript18/GrantPath/actions/runs/42823739948) passed: six durable events completed, zero failed, zero reminders queued and zero remaining queued events/deliveries at its readback. It does not establish recipient email receipt.

Source scheduling remains 05:23/17:23 UTC (06:23/18:23 Lagos); application jobs run hourly at minute 41. No duplicate dispatch or paid TestSprite run was requested. No future scheduled execution is claimed as already observed. [Operational receipt](evidence/discovery-growth-operations.json), [CI receipt](evidence/discovery-growth-ci.json), [public catalogue receipt](evidence/discovery-growth-hosted.json).

## Remaining scope and limitations

- More official source families need reviewed templates. This is bounded official discovery, not an unrestricted crawler, and unchanged runs should not inflate counts.
- One Twente layout remains in review. The 20 pre-existing review exceptions were preserved for operator assessment, with no blanket approval or deletion.
- DAAD is paused after its robots endpoint returned 403. Its accepted information, successful-check history and failed observation remain. Melbourne also returned 403 during access checks and was not registered for publication. Neither restriction was bypassed. Resume only after an approved accessible route is available.
- The PR preview reached Ready but its catalogue returned 503 because an isolated preview DATABASE_URL was missing. Production and main deployment are verified separately. Preview setup requires an empty/sanitised isolated database; never copy private student records or bind production merely to make the preview green.
- This increment made no TestSprite execution or balance check. Historical TestSprite results are not attributed to the new source. The owner's post-hackathon policy retired paid TestSprite checks; software correctness and security checks remain.
- Operational receipts and this final handoff were recorded locally after the tested main SHA. Documentation-only receipts do not inherit a claim of CI at their own commit.

The former local test URLs denied their old roles. Verification used separate port 55433 databases with existing migrations; the task cluster was stopped afterward. The user's .env and existing database were not overwritten. No test database copied private student records. Unrelated working-tree documentation changes remain preserved.

## Production discovery expansion — 24 November 2026

See [PRODUCTION_DISCOVERY_EXPANSION.md](PRODUCTION_DISCOVERY_EXPANSION.md) for the current repository audit, reusable adapter contracts, three reviewed official source policies, isolated live outcomes and safe onboarding instructions. Earlier production/deployment claims above remain historical checkpoints. This increment makes no production database, credential, schedule, merge or deployment changes. New policies remain unregistered/disabled in production.

## Current-call onboarding and isolated verification — 25 November 2026

Current-call results and source contributions are in [SOURCE_COVERAGE.md](SOURCE_COVERAGE.md#current-application-calls--25-november-2026) and [the completion receipt](evidence/current-call-completion.json). `official-recent-call-links-1` handles reviewed announcement listings; `official-programme-call-1` and `official-government-call-1` provide explicit detail contracts. Future EDISS intake URLs require review and allowlist expansion; archive membership never authorizes arbitrary linked sites.

Before enabling a source, inspect its actual call/detail/supporting routes and robots rules, register its adapter and reviewed URL policy, apply the additive migrations to the intended isolated database, then explicitly authorize the policy with existing operator controls. Keep bounds, leases and retry limits intact. General rolling language, an archive timestamp, a future deadline without an opening statement, or an old annual call cannot establish current availability.

For the already reviewed UQ/Auckland families, `scripts/discover-development-current-calls.ts --sources=uq-scholarships,auckland-scholarships --limit=50` requires an explicit isolated `GROWTH_DATABASE_URL`; it freshly retrieves candidates, publishes through normal policy, records replay results and pauses the selected policies in `finally`. Announcement sources use the existing `grow-development-catalogue.ts --sources ediss-current-calls,csc-current-calls --details 3` bounded runner with the same explicit isolated variable. These commands do not authorize production activation.

Application rounds carry `cycleBasis=application_round`, not an invented academic intake. Overlapping changed periods require operator identity review. Publication projects calendar dates without invented midnight instants. Existing catalogues need the equivalent read-model backfill from their accepted latest versions after migration; `finalize-development-current-calls.ts` is deliberately restricted to the exact account-free development database and must never be repointed at production. It does not rewrite versions or source evidence.
