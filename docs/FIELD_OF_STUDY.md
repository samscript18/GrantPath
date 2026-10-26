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

Requests have a 15-second overall deadline, batches of 40 and no automatic retry.
Successful query/content combinations are cached for one hour per server process,
with at most 100 entries; concurrent identical requests share work. Updating
accepted content changes the cache key. Failures are cached for 30 seconds.
This cache is not a distributed spending limit; hosting instances have independent
caches. Configure Google Cloud quotas for the public catalogue as appropriate.

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
These changes and checks are local. No deployment, push or TestSprite execution
is claimed for this feature.

References: [Google model documentation](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-8-flash),
[structured responses](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference),
[Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials).
