# Field of study matching

The catalogue's Field of study filter asks Vertex AI Gemini 3.8 Flash to identify
related academic subjects in published scholarship titles, field labels and
accepted summaries. For example, Chemistry can match an organic synthesis award.
It evaluates all records satisfying the other catalogue filters before counting
and paginating results. It never creates scholarship records or changes their
accepted subject labels, mandatory eligibility rules or profile preference scores.

The adapter follows [Confiance's default dev branch](https://github.com/samscript18/Confiance/blob/dev/agent/runtime/vertex.ts):
Google OAuth through `google-auth-library` and native `generateContent` with a
global or regional Vertex endpoint. The response uses Google's JSON schema mode;
only supplied scholarship IDs are accepted. Blocked, truncated, malformed or
unknown-ID responses discard the whole semantic result. Unrelated subjects and
generic “Various fields” labels alone must not be treated as subject evidence.
Explicit support for all academic disciplines includes the requested subject,
subject to any stated exclusions.
Model relevance remains probabilistic and is not an eligibility decision.

Configure these server-side variables locally and in the hosting environment:

```dotenv
VERTEX_PROJECT_ID=verith-ai
VERTEX_LOCATION=global
VERTEX_MODEL=gemini-3.8-flash
```

Enable billing and the Vertex AI API on that project. Give the chosen identity
Vertex AI access (typically Vertex AI User). Use one authentication method:

- Application Default Credentials: `gcloud auth application-default login`, then
  `gcloud auth application-default set-quota-project verith-ai` for local use;
  on Google Cloud use the workload's attached identity.
- `GOOGLE_APPLICATION_CREDENTIALS`: an existing authorized service-account file.
- `VERTEX_CREDENTIALS_JSON`: service-account JSON stored in a server secret.

Keep credentials out of Git, chat and `NEXT_PUBLIC_` variables. Only the query and
published scholarship data go to Google; no student profiles or private application
data are sent. Calls use the configured Google Cloud billing account.

One classification has a 15-second deadline covering authentication and all batches,
with no automatic inference retry. Inputs are limited to 100 subject characters,
160 candidate records, 40 records and 32,000 UTF-8 JSON bytes per batch, and four
batches per classification. Oversized content falls back instead of truncating
away a subject exclusion. Output is bounded to 4,096 tokens per batch. A catalogue
over 160 other-filter matches uses database text filtering without partial semantic
selection. No model request runs when the subject filter is empty.

Migration008 adds an ephemeral PostgreSQL result cache, keyed by the normalised
subject, model configuration and exact accepted public content. Successful results
last one hour and are shared across hosting instances; content changes invalidate
the key. Up to 200 shared entries and 100 process-local entries are retained.
Short-lived leases prevent duplicate inference; concurrent callers wait at most
20 seconds for shared work. Failure entries last 30 seconds.

Public spending is bounded globally per database by **12 provider calls per UTC
hour and 60 per UTC day**. PostgreSQL reservations for every planned batch commit
before inference. Failed or abandoned calls retain their reservations, and request
retries cannot bypass the cap. The API and server-rendered catalogue share this
path. Budget exhaustion explicitly falls back. These controls bound calls/input/
output rather than promising a fixed currency cost; provider-side Google Cloud
quotas remain a separate control. Direct `fields:check` is an explicitly invoked
operator verification command, outside the public request path.

Missing configuration, unavailable authentication or provider failure preserves
the previous case-insensitive field-label text filter and explicitly displays
“Related-subject matching is unavailable. Showing text matches … only.” Field
input is trimmed. An empty filter makes no model request. The API exposes
`fieldMatching` as `semantic`, `text_only`, or `null` when no field was requested.

## Verification

`npm run fields:check` makes one live classification request using four standalone
fictional records, without writing to a database. It checks that Chemistry matches
organic synthesis and an explicitly all-disciplines award, while excluding history
and an award with unspecified subjects. It uses the configured project's billing
account and prints only non-secret result metadata. It runs separately from CI.

Local verification on 26 October 2026 passed: 100 unit tests, 34 PostgreSQL
integration tests, type checking, lint, the production build and two production
browser journeys (field filtering and existing discovery/save flow). The database
test checks semantic selection before pagination, ten matches across two pages,
combined destination/level/funding filters, closed and unpublished exclusions,
and provider-failure fallback. Its model response is mocked. Browser tests check
the explicit text-only fallback, form submission, reload, clearing and mobile
layout without making paid requests. Desktop and 360px screenshots were inspected.

One real authenticated `gemini-3.8-flash` request through `verith-ai` passed the
four-record Chemistry check in 2,927 ms. See the
[live-check receipt](evidence/field-matching-live.json). This verifies the provider
adapter and that subject example; it is not a live evaluation of every scholarship.
On 27 October, the owner approved inclusion in the release. The pre-existing local
feature is preserved at `feature/semantic-field-search` / `14b492e`. Shared-cache,
budget and batch-limit checks bring the candidate to 101 unit and 37 database
tests. Final-head hosted and App evidence is recorded separately in FINAL_HANDOFF.md;
the earlier four-record request does not verify a later deployment by itself.

References: [Google model documentation](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-8-flash),
[structured responses](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference),
[Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials).
