import type { readEnv } from "@/lib/env";

export function googleSignInEnabled(input: Record<string, string | undefined> = process.env) {
  return Boolean(input.GOOGLE_CLIENT_ID?.trim() && input.GOOGLE_CLIENT_SECRET?.trim());
}

export function googleProvider(env: ReturnType<typeof readEnv>) {
  if (!googleSignInEnabled(env)) return {};
  return {
    google: {
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
      prompt: "select_account" as const,
      accessType: "online" as const,
    },
  };
}
