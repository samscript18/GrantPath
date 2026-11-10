# Catalogue growth follow-up — 10 November 2026

## Diagnosis

The production site https://grantpath-lake.vercel.app runs main source `fdc94cca2009697a3f24c0f8e0ae4305636d4472`. Its default active filter returned 28 records; `availability=all` returned 33. Closed/expired records account for the difference, not a cached fixed total.

Production metadata inspection found 20 review candidates and 17 pending candidates. Examples included UCT alumni, programme-team, scholar-development and McGill tag pages. These are not separate scholarship opportunities. Both inspected detail batches sent all six selected pages to review with `UNSUPPORTED_DETAIL_MAPPING` / `UNSUPPORTED_LAYOUT`. A successful fetch workflow was not a successful new publication. The latest inspected directory run also failed on DAAD's `ROBOTS_UNAVAILABLE:403`.

The local `.env` pointed to a different older database with 32 records and October check timestamps. Source diagnosis therefore used the confirmed Vercel production binding in an ignored file, without printing credentials or reading student records.

## Implementation

- Added explicit candidate selection, separate from permission to fetch an evidence URL. Existing static sources only queue supported programme URLs; Makerere queues supported announcement URLs. Twente's new directory uses its actual scholarship-title selector and an approved university-managed award path family.
- Old pending navigation candidates can become `ignored` without a fetch. The production cleanup retired17unlinked pending navigation candidates, with no source requests or catalogue-count change; [receipt](evidence/discovery-growth-navigation.json). The transition and audit are atomic. Accepted information, old observations and review history are retained; nothing is deleted.
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

## Remaining scope

- Merge/deploy the reviewed code and re-enable `twente-scholarships`; no merge is performed without separate authorisation. The already-published records remain visible while the source is paused.
- More official source families still need reviewed templates. Twente discovery selects five supported-route candidates; only the three detail templates above were verified live in this increment. Unsupported layouts stay in review.
- Old review exceptions are preserved for operator assessment. No blanket approval or deletion was performed.
- DAAD returned403at its robots endpoint; Melbourne also returned403during access checks. Neither restriction was bypassed. Failures remain visible and may make a bounded source workflow red.
- Successful scheduled runs need not add records: unchanged opportunities, paused sources and review candidates should not inflate the catalogue.

## Activation after reviewed code deployment

Use the intended production binding, not the older local database. Register only this reviewed source:

```sh
npm run sources:discover -- --configure twente-scholarships --enable --automatic --reason "Reviewed university-managed Twente award template, source policy and live evidence."
npm run sources:discover -- --directory twente-scholarships
npm run sources:discover -- --details --limit 6
```

Inspect actual `newScholarships`, review reasons, source successful times and public catalogue records. Replay must produce unchanged, with no duplicate record/version/event. Do not repeatedly register mappings or re-seed production to force a larger total. Do not change the active filter to disguise closed calls.

Existing scheduled stages remain bounded at six. GitHub scheduling is best effort. A directory becoming accessible does not remove its semantic validation requirements. More source families and novel layouts still require reviewed adapters; this change is not an unrestricted crawler.
