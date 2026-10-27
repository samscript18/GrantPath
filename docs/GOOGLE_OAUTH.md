# Google login and signup

GrantPath uses Better Auth's Google provider for both login and account creation. Existing email/password login remains available. A new Google student goes to `/profile`; a returning student goes to `/dashboard`. Google must supply a verified email. Only the standard `openid`, `email` and `profile` scopes are requested, with online access; no Gmail, Drive or offline access is requested.

## Configure the OAuth client

1. In [Google Cloud Console](https://console.cloud.google.com/), configure the Google Auth Platform branding, audience and consent screen. During Testing you can add intended accounts under Audience → Test users. Google documents an exception for basic identity-only scopes (the scopes GrantPath requests), which do not require the test-user list; this never overrides an Internal audience restriction. Follow Google's current publishing requirements when making it available to everyone.
2. Create an OAuth client of type **Web application**. Set authorized JavaScript origins to `http://localhost:3000` and the exact public GrantPath origin used below. Add these exact authorized redirect URIs:

```text
http://localhost:3000/api/auth/callback/google
https://grantpath-git-release-hosted-verification-lammysam8-7688.vercel.app/api/auth/callback/google
```

3. Set both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in ignored `.env`. These are server-only values, never `NEXT_PUBLIC_` variables. Set the same pair as encrypted, branch-scoped Preview environment variables in Vercel, then redeploy. Never commit or paste the secret into chat.
4. Keep `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, and `TRUSTED_ORIGINS` consistent with the exact origin for that environment. Google constructs the callback from `BETTER_AUTH_URL`. A Vercel URL is sufficient; no custom domain or paid service is required. Each additional preview origin needs its own exact Google callback registration; Google does not accept wildcard redirect URIs.
5. Restart the local server after changing credentials. Open `/login` or `/register` and choose **Continue with Google**. With no Google credentials configured the option is hidden; a partial pair produces a readable setup error. Cancellation or callback failure returns to login with recovery guidance.

## Troubleshooting organization restrictions

`Error 403: org_internal` means the OAuth client belongs to a project whose audience is Internal. Personal Gmail accounts are outside that organization. In the project that owns the configured client, open Google Auth Platform → Audience → User type → Make external. Keep Testing during development, add the intended test accounts under Test users, save, then retry. If your organization prevents changing audience, the project owner/administrator must permit an External app or you must configure an OAuth client in a project you control. Changing Better Auth secrets or redirect URIs does not resolve this audience restriction. See [Google audience documentation](https://support.google.com/cloud/answer/15544987?hl=en).

## Account handling

Prisma Account, User, Verification and Session models persist Google accounts, state and sessions. Migration 202610240003_account_method_cooldown adds an immutable original sign-in method and backfills existing accounts from their earliest account record. Better Auth verifies OAuth state/PKCE and Google's identity. OAuth tokens are encrypted at rest using BETTER_AUTH_SECRET; retain that secret across restarts/deployments. Account roles remain server-controlled and new students cannot become operators via Google.

The user-requested policy keeps the original sign-in method separate: Google-created accounts use Google only; email-created accounts use email/password only. Same-email social linking is disabled. Google accounts cannot obtain a password through signup, password recovery, existing reset tokens, setting/changing a password, or linking another provider. Server-controlled creation records the method; clients cannot inject it. Existing previously linked accounts keep their history but the original method controls permitted sign-in.

## Verification boundaries

The local integration suite uses clearly labelled provider fixtures: Google's token exchange/user-info boundary is mocked, with real Better Auth callback, PostgreSQL accounts/sessions/profile persistence and encrypted tokens. It checks creation, return, blocked cross-method sign-in and password recovery, unverified-identity rejection and state-cookie rejection. Browser tests check button availability, failure recovery and the actual authorization redirect using isolated credentials, aborting navigation before Google. These do not establish that real Google consent, credentials, or the Cloud Console audience/redirect allowlist are correct. A real signed-in consent round trip must be observed separately.

Official references: [Better Auth Google setup](https://better-auth.com/docs/authentication/google), [Better Auth accounts and linking](https://better-auth.com/docs/concepts/users-accounts), [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server).

## Observed setup outcome

On 24 October 2026 the user initially received org_internal, confirmed changing the matching project audience to External, and then reported that a fresh private-window Google sign-in worked. The agent independently checked authorization URL/client/callback construction and local callback persistence with isolated provider fixtures; the real signed-in consent result is user-reported. The configured keys were copied into encrypted Vercel preview variables, and the Google button is visible on the deployed app.
