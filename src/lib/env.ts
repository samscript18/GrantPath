import { z } from "zod";
const schema = z.object({
  DATABASE_URL: z.url().refine((v) => /^postgres(ql)?:/.test(v), "Use a PostgreSQL connection URL"),
  BETTER_AUTH_SECRET: z.string().min(32, "Generate a secret of at least 32 characters"),
  BETTER_AUTH_URL: z.url(),
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  EMAIL_MODE: z.enum(["sink", "resend"]).default("sink"),
  EMAIL_FROM: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
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
  if (input.NODE_ENV === "production" && env.APP_ENV === "test")
    throw new SetupError("APP_ENV=test cannot run in production.");
  if (
    env.APP_ENV === "production" &&
    (env.EMAIL_MODE !== "resend" || !env.RESEND_API_KEY || !env.EMAIL_FROM)
  )
    throw new SetupError(
      "Production requires Resend credentials and a verified EMAIL_FROM sender.",
    );
  if (env.APP_ENV === "production" && !env.BETTER_AUTH_URL.startsWith("https://"))
    throw new SetupError("Production authentication requires HTTPS.");
  return env;
}
