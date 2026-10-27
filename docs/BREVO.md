# Brevo transactional email

Brevo replaces Resend at the user's request. No provider SDK is required: the server adapter calls Brevo's HTTPS transactional API. Authentication verification/recovery and scholarship notifications call the same accounts email module.

## Configuration

Set `BREVO_API_KEY`, `EMAIL_FROM` to an active Brevo sender address, and `EMAIL_MODE=brevo`. For a deployed runtime use `APP_ENV=production`, a private authentication secret and exact HTTPS app/trusted origins. Keep isolated local/integration/browser tests on `EMAIL_MODE=sink`. `.test` recipients cannot reach Brevo; live registration rejects reserved test addresses before account creation.

Run `npm run setup:check` and `npm run email:check`. The latter reads the Brevo account and senders without sending. Verify the sender in Brevo; `onboarding@resend.dev` cannot be used with this provider. The user is keeping the Vercel app URL and will not purchase a domain. Brevo sender authentication/deliverability and free-plan limits still apply.

Observed 24 October 2026: valid API access, transactional relay enabled, free account with a 300-email sending allowance, configured sender active. The application adapter sent one connection-check email to that configured sender and received a message ID. Repeating the same key returned Brevo's duplicate response and did not create a second send. Recipient receipt has not been observed. See `evidence/brevo-provider-smoke.json`.

## Durable retry semantics

Brevo requires a UUID idempotency key; GrantPath deterministically derives UUIDv5 from the durable event identity. The [official API guide](https://developers.brevo.com/docs/heterogenous-versions-batch-emails) documents a 30-minute TTL. GrantPath stops automatic retry after 29 minutes from the earliest attempt. Every email attempt records its provider and provider key through an additive migration.

A duplicate response has no usable original message ID. It is held as uncertain acceptance for operator inspection; the application never invents that ID, reports recipient receipt or blindly resends. Unknown or different earlier providers also stop automatic sending, protecting the transition from legacy delivery attempts. The operator can inspect provider/key/attempt history. Preference and current-relevance checks still run before delivery.

Provider acceptance, simulated sink capture and recipient receipt remain separate states. Historical Resend test evidence is retained as history and does not establish Brevo behaviour.
