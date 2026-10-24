# Google login and signup

GrantPath uses Better Auth's Google provider for both login and account creation. Existing email/password login remains available. A new Google student goes to `/profile`; a returning student goes to `/dashboard`. Google must supply a verified email. Only the standard `openid`, `email` and `profile` scopes are requested, with online access; no Gmail, Drive or offline access is requested.

## Configure the OAuth client

1. In [Google Cloud Console](https://console.cloud.google.com/), configure the Google Auth Platform branding, audience and consent screen. While the app is in Testing, add the Google accounts that will test it under Audience → Test users. Follow Google's current publishing requirements when making it available to everyone.
2. Create an OAuth client of type **Web application**. Set authorized JavaScript origins to `http://localhost:3000` and the exact public GrantPath origin used below. Add these exact authorized redirect URIs:

```text
http://localhost:3000/api/auth/callback/google
https://grantpath-git-release-hosted-verification-lammysam8-7688.vercel.app/api/auth/callback/google
```

3. Set both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in ignored `.env`. These are server-only values, never `NEXT_PUBLIC_` variables. Set the same pair as encrypted, branch-scoped Preview environment variables in Vercel, then redeploy. Never commit or paste the secret into chat.
4. Keep `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, and `TRUSTED_ORIGINS` consistent with the exact origin for that environment. Google constructs the callback from `BETTER_AUTH_URL`. A Vercel URL is sufficient; no custom domain or paid service is required. Each additional preview origin needs its own exact Google callback registration; Google does not accept wildcard redirect URIs.
5. Restart the local server after changing credentials. Open `/login` or `/register` and choose **Continue with Google**. With no Google credentials configured the option is hidden; a partial pair produces a readable setup error. Cancellation or callback failure returns to login with recovery guidance.

## Account handling

The existing Prisma Account, User, Verification and Session models persist Google accounts, state and sessions; no schema migration is needed. Better Auth verifies OAuth state/PKCE and Google's identity. OAuth tokens are encrypted at rest using BETTER_AUTH_SECRET; retain that secret across restarts/deployments. Account roles remain server-controlled and new students cannot become operators via Google.

A verified Google identity may link to an existing **verified** local account with the same email, preserving its user ID/profile/applications. An unverified local account cannot be implicitly linked: first finish email verification using the email flow. Different email addresses remain separate accounts. Password reset can establish a password for a Google-created account via its verified email.

## Verification boundaries

The local integration suite uses clearly labelled provider fixtures: Google's token exchange/user-info boundary is mocked, with real Better Auth callback, PostgreSQL accounts/sessions/profile persistence and encrypted tokens. It checks creation, return, linking, unverified-identity rejection and state-cookie rejection. Browser tests check button availability, failure recovery and the actual authorization redirect using isolated credentials, aborting navigation before Google. These do not establish that real Google consent, credentials, or the Cloud Console audience/redirect allowlist are correct. A real signed-in consent round trip must be observed separately.

Official references: [Better Auth Google setup](https://better-auth.com/docs/authentication/google), [Better Auth accounts and linking](https://better-auth.com/docs/concepts/users-accounts), [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server).
