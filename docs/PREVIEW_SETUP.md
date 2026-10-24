# Isolated preview setup

No Vercel or Neon project is provisioned. Free-plan availability and usage terms must be checked in the relevant accounts before activation. Never share the production database with a preview or test suite.

For each trusted same-repository PR, create a Neon branch from an empty schema baseline using `scripts/preview-branch.ts`, apply migrations to its unpooled endpoint, and seed only reviewed public catalogue records plus isolated test accounts. Store branch identifiers as workflow artifacts/environment state; deleting a preview must only delete its own PR branch. Use distinct preview auth secrets and APP_ENV=development with EMAIL_MODE=sink; test accounts must use example.test. Do not set APP_ENV=test with a Next production build.

Configure the Vercel PR environment with the branch-specific pooled DATABASE_URL, unpooled DIRECT_URL, exact preview BETTER_AUTH_URL/NEXT_PUBLIC_APP_URL/TRUSTED_ORIGINS, and a generated secret. Secrets must never appear in PR comments, logs or artifacts. Deploy after migrations. TestSprite must target the resulting exact head commit preview; never silently use the main deployment.

The repository does not auto-deploy previews until account permissions, identifiers and free usage terms are known. Fork PRs run secret-free local CI only. A trusted same-repository branch is required for secret-dependent preview and TestSprite verification before merging. TestSprite’s authentic check name/App ID and GitHub ruleset must be observed and configured in the account, not guessed in YAML.
