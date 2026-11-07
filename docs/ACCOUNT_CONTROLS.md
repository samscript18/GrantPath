# Account controls — local implementation, 24 October 2026

These changes are not deployed or end-to-end verified. The user has paused testing and GitHub publication. They must not inherit older release/check results.

## Screens

- `/settings/app`: existing device-specific appearance choices plus an inline searchable IANA time-zone editor. The edit uses the versioned profile service; another tab's changes cause a conflict instead of being overwritten. A date/time preview uses the instant the page opened.
- `/academic-references`: standalone directory and main workspace navigation item. Removed from app settings. The static accessibility section was removed; reduced-motion handling and keyboard controls remain part of the interface.
- `/settings/account`: in-app password change and actual persisted sessions. Browser/device labels are derived from recorded user agents. No IP addresses, session tokens or invented last-activity times are returned. “Last session refresh” is the actual session update timestamp, which is periodic. The list shows at most 100 current sessions; each session and all sessions can be revoked. Sign-out-everywhere asks for inline confirmation.
- `/settings/privacy`: asynchronous export, one-time download and a verified deletion request/cancellation flow.
- `/profile`: uploaded avatars now use Cloudinary; existing Google images/data URLs remain readable until replaced or removed.

## Password changes and email codes

An authenticated same-origin request validates the current credential using Better Auth's installed crypto API, applies the shared new-password/confirmation policy and stages its compatible hash. It does not change the password yet. The six-digit code uses cryptographic randomness, a purpose/user/session-bound HMAC, ten-minute expiry, five allowed guesses and a server-enforced two-minute resend limit. The code and staged hashes are encrypted at rest, never returned to the UI or put into an outbox payload. Failed guesses commit their attempt count.

Confirmation runs under an account advisory lock and compares the old credential hash, preventing an older request from overwriting a newer credential. Success consumes outstanding challenges, changes the credential, deletes all sessions and outstanding reset-password records, and returns the browser to login. Passwords are held only in component memory and encrypted/hashed server storage; no browser persistence is used. On a page reload an active code can still be entered, but a fresh request requires entering the current/new passwords again.

Google-created accounts cannot establish email credentials. Native Better Auth set/change-password paths are blocked so the settings code step cannot be bypassed. Forgot-password remains an independent email-link recovery mechanism for email-created accounts. Native account deletion is blocked in favour of the confirmed grace-period flow.

Security mail ignores scholarship notification opt-outs. Jobs use stable Brevo idempotency keys, expire with the challenge before Brevo's 30-minute key TTL, and stop after bounded attempts. Queued/retrying/failed, development capture and provider acceptance are distinguished. Provider acceptance does not establish recipient receipt. Actual OTP delivery and password-change completion have not been exercised for this increment.

## Export and deletion

An export request writes an outbox event and a 24-hour export record. Its random download token is returned once, held in component memory only, and HMACed in the database. The job prepares a repeatable-read JSON snapshot and encrypts it using AES-256-GCM before storage. It includes explicitly selected account/profile/history/application/evaluation/notification/preferences/session/delivery records and excludes authentication secrets, session tokens and IP addresses. Automatic exports over 10,000 related records or 20 MB fail with guidance rather than silently truncating data. New requests have a five-minute cooldown and invalidate older pending/downloadable copies.

The download requires authenticated ownership and the token in a POST body, checks expiry and consumes the record transactionally. The downloaded JSON is readable; encryption protects server storage, not the user's downloaded file. If a response is lost after consumption, the user must request another export. Closing/reloading the page loses its token. Expired encrypted payloads are cleared by maintenance; privacy status hides expired download availability immediately.

Deletion requires its own email code and typing `DELETE`. It creates a seven-day cancellation window, without extending an earlier request on replay. The page shows the actual cancellation date and time zone, and permits cancellation before that instant. Sign-in and authenticated app access are blocked once the window expires. A durable worker then cascades private account records, clears direct user queue/email/rate-limit references, anonymises shared operator attribution and queues Cloudinary media removal. Shared scholarship evidence remains. Platform backups and emails already accepted by a provider follow that provider's retention policies; no immediate universal erasure is promised.

**Scheduling is required for timed erasure and interrupted-job recovery.** The date shown is the end of the cancellation window, not an exact deletion completion time. No existing user's deletion has been requested or performed during implementation.

## Cloudinary

Set these on the server and account worker; never use a `NEXT_PUBLIC_` prefix:

```
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

The user supplied local values. They have not been copied to Vercel/GitHub during the publication pause. Their real upload/destroy behaviour remains unverified.

The server decodes/re-encodes the bounded 256px JPEG using Sharp, strips metadata and signs the native Upload API request with SHA-256. Each upload uses a random server-owned public ID registered before network I/O. The database stores the delivery URL and public ID; the API secret stays server-side. No unsigned upload preset, image add-on or paid plan is enabled.

Conditional publication preserves the previous photo if upload fails or another tab wins. Replaced/removed images enqueue durable cleanup with CDN invalidation and an immediate post-response attempt. Pending uploads abandoned for an hour are reclaimed by maintenance. Cleanup accepts only persisted IDs created by this app, records retry failures in the outbox and never deletes Google-hosted photos or arbitrary URLs. Cloudinary product-environment credentials must remain available for assets from that environment. CDN invalidation is not instantaneous, and Cloudinary backups, if enabled by the account owner, have their own retention.

Implementation follows [Cloudinary authentication signatures](https://cloudinary.com/documentation/authentication_signatures) and [Upload API destroy](https://cloudinary.com/documentation/image_upload_api_reference#destroy).

## Database and worker setup

Migration `202610240004_account_security_privacy` adds SecurityChallenge, AccountExport, AccountDeletion, MediaAsset and User.imagePublicId. Generated the Prisma client and applied this additive migration to the configured development Neon database. Preview and isolated test databases have not received this migration during the current pause.

```
npm run db:generate
npm run db:migrate
npm run jobs:run -- --limit 20
```

`jobs:run` handles account retention alongside matching/notifications, without source fetching. New security email/export requests attempt only their own persisted event through Next `after`; failed/interrupted attempts remain available to the standalone worker. Request processing is not the timed-retention scheduler.

The existing application-jobs workflow now reads server-only Cloudinary secrets. Remote activation/configuration remains pending. Alternatively use the existing signed Inngest function with its hourly maintenance step, subject to hosting limits. Activate one scheduler after configuration/free-usage review; no schedule was remotely enabled here.

Keep `BETTER_AUTH_SECRET` stable across the web app and worker. Purpose-separated HKDF keys derived from it protect challenges and exports. Rotation invalidates pending codes/exports; allow them to expire or explicitly expire them and request new copies after rotation. Their payloads are never logged. No additional secret is needed.

## Verification still required when the user resumes testing

- Exact OTP success, incorrect/expired/locked/replayed code outcomes; cross-user/session isolation; concurrent password changes; revocation of every session; recovery paths and Google-only enforcement.
- Export ownership, coherent snapshot, encryption/decryption, expiry, lost-token recovery, concurrent one-time downloads, background interruption and retry exhaustion.
- Deletion confirmation, cancellation race, grace-period access boundaries, private-record cascade and shared-source preservation, failed media cleanup recovery.
- Actual Cloudinary upload/remove/replace and abandoned-asset cleanup with real configured environment; actual Brevo code acceptance and recipient delivery separately.
- Authenticated desktop/mobile/dark screenshots, keyboard/reduced-motion review and public deployment after approval to resume publication.

## Subsequent additions

Migration005 adds explicit study-profile onboarding completion; migration006 adds institutional image metadata. Both are applied to development Neon. Unfinished student sessions receive the shared four-step form as a resumable modal, with session-scoped Continue later. Six core matching facts and a final save complete onboarding; provider-specific unknowns stay unknown. Legacy profiles may need one final review because their previous final-step completion was not distinguishable from reaching that step.

Institutional images use the same signed Cloudinary transport and durable cleanup, with provider ownership independent of personal accounts. Operators manage images in Operator studio → University & foundation images. The standalone `providers:images` CLI separates discovery, visual review, publication and metadata reporting. Six identities were actually imported; remaining access/review limitations are recorded in evidence/provider-images.json. This does not verify the operator browser flow or personal-avatar replacement/removal.
