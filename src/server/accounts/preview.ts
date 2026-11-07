export function isIsolatedHostedPreview(env: Record<string, string | undefined> = process.env) {
  return env.VERCEL_ENV === "preview" && env.EMAIL_MODE === "sink";
}

export function previewRegistrationAllowed(
  email: string,
  env: Record<string, string | undefined> = process.env,
) {
  return (
    !isIsolatedHostedPreview(env) ||
    (env.TEST_EMAIL_DOMAINS || "example.test")
      .split(",")
      .some((domain) => email.toLowerCase().endsWith(`@${domain.trim().toLowerCase()}`))
  );
}
