import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { readEnv } from "@/lib/env";
import { sendEmail } from "./email";
import { createHash } from "node:crypto";
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() { return instance ??= createAuth(); }
function createAuth() {
  const env = readEnv();
  return betterAuth({
    appName: "GrantPath",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: prismaAdapter(db(), { provider: "postgresql" }),
    trustedOrigins: (process.env.TRUSTED_ORIGINS || env.BETTER_AUTH_URL)
      .split(",")
      .map((s) => s.trim()),
    user: { additionalFields: { role: { type: "string", defaultValue: "student", input: false } } },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: 3600,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Reset your GrantPath password",
          text: `Reset your password using this single-use link (expires in one hour):\n${url}`,
          key: `reset:${createHash("sha256").update(url).digest("hex")}`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 3600,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Verify your GrantPath email",
          text: `Verify your email to start your scholarship journey. This link expires in one hour:\n${url}`,
          key: `verify:${createHash("sha256").update(url).digest("hex")}`,
        });
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
    advanced: { database: { generateId: () => crypto.randomUUID() } },
  });
}
export type Actor = { id: string; name: string; email: string; role: string };
export function requireOperator(actor: Actor) {
  if (actor.role !== "operator") throw new Error("Operator access required.");
}
