import { z } from "zod";
const schema = z.object({
  DATABASE_URL: z.url().refine((v) => /^postgres(ql)?:/.test(v), "Use a PostgreSQL connection URL"),
  DATABASE_TRANSPORT: z.enum(["tcp", "neon-ws"]).default("tcp"),
  BETTER_AUTH_SECRET: z.string().min(32, "Generate a secret of at least 32 characters"),
  BETTER_AUTH_URL: z.url(),
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  EMAIL_MODE: z.enum(["sink", "brevo"]).default("sink"),
  EMAIL_FROM: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().trim().optional(),
  GOOGLE_CLIENT_SECRET: z.string().trim().optional(),
  TEST_EMAIL_DOMAINS: z.string().default("example.test"),
});
export class SetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SetupError";
  }
}
export function readEnv(input: NodeJS.ProcessEnv = process.env) {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    throw new SetupError(
      `GrantPath setup: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}. See .env.example.`,
    );
  const env = parsed.data;
  if (Boolean(env.GOOGLE_CLIENT_ID) !== Boolean(env.GOOGLE_CLIENT_SECRET))
    throw new SetupError(
      "Google sign-in requires both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. See docs/GOOGLE_OAUTH.md.",
    );
  if (input.NODE_ENV === "production" && env.APP_ENV === "test")
    throw new SetupError("APP_ENV=test cannot run in production.");
  if (env.APP_ENV === "production" && env.EMAIL_MODE !== "brevo")
    throw new SetupError("Production requires EMAIL_MODE=brevo with a verified sender.");
  if (
    env.EMAIL_MODE === "brevo" &&
    (!env.BREVO_API_KEY?.trim() ||
      !z.email().safeParse(env.EMAIL_FROM).success ||
      env.EMAIL_FROM?.toLowerCase().endsWith("@resend.dev"))
  )
    throw new SetupError(
      "Brevo email requires BREVO_API_KEY and EMAIL_FROM as a verified Brevo sender address. Resend's test sender cannot be used with Brevo.",
    );
  if (env.APP_ENV === "production" && !env.BETTER_AUTH_URL.startsWith("https://"))
    throw new SetupError("Production authentication requires HTTPS.");
  return env;
}
