import { APIError, createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { readEnv } from "@/lib/env";
import { sendEmail } from "./email";
import { createHash } from "node:crypto";
import { previewRegistrationAllowed } from "./preview";
import { googleProvider } from "./google";
import { newPasswordSchema } from "@/lib/password";
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (instance ??= createAuth());
}
function createAuth() {
  const env = readEnv();
  return betterAuth({
    appName: "GrantPath",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: prismaAdapter(db(), { provider: "postgresql" }),
    socialProviders: googleProvider(env),
    account: {
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        requireLocalEmailVerified: true,
        allowDifferentEmails: false,
        trustedProviders: [],
      },
    },
    trustedOrigins: (process.env.TRUSTED_ORIGINS || env.BETTER_AUTH_URL)
      .split(",")
      .map((s) => s.trim()),
    user: {
      additionalFields: { role: { type: "string", defaultValue: "student", input: false } },
      validateUserInfo: ({ user, source }) => {
        if (source.oauth?.providerId === "google" && !user.emailVerified)
          return {
            error: "email_not_verified",
            errorDescription: "Use a verified Google email address.",
          };
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
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
        const token = new URL(url).searchParams.get("token")!;
        const hash = createHash("sha256").update(token).digest("hex");
        await db().verification.upsert({
          where: { id: `email-once:${hash}` },
          create: {
            id: `email-once:${hash}`,
            identifier: `email-once:${hash}`,
            value: hash,
            expiresAt: new Date(Date.now() + 3600000),
          },
          update: {},
        });
        await sendEmail({
          to: user.email,
          subject: "Verify your GrantPath email",
          text: `Verify your email to start your scholarship journey. This link expires in one hour:\n${url}`,
          key: `verify:${createHash("sha256").update(url).digest("hex")}`,
        });
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const password =
          ctx.path === "/sign-up/email"
            ? ctx.body?.password
            : ["/reset-password", "/change-password", "/set-password"].includes(ctx.path)
              ? ctx.body?.newPassword
              : undefined;
        if (password !== undefined) {
          const checked = newPasswordSchema.safeParse(password);
          if (!checked.success)
            throw new APIError("BAD_REQUEST", {
              message:
                checked.error.issues[0]?.message || "Please check the password requirements.",
            });
        }
        if (
          ctx.path === "/sign-up/email" &&
          env.EMAIL_MODE === "brevo" &&
          typeof ctx.body?.email === "string" &&
          ctx.body.email.toLowerCase().endsWith(".test")
        )
          throw new APIError("BAD_REQUEST", {
            message:
              "Use a deliverable email address. Isolated test addresses are unavailable with live email delivery.",
          });
        if (
          ctx.path === "/sign-up/email" &&
          !previewRegistrationAllowed(typeof ctx.body?.email === "string" ? ctx.body.email : "")
        )
          throw new APIError("BAD_REQUEST", {
            message:
              "This preview accepts isolated test accounts only. Email delivery is not yet available.",
          });
        if (ctx.path !== "/verify-email") return;
        const token = typeof ctx.query?.token === "string" ? ctx.query.token : "";
        const hash = createHash("sha256").update(token).digest("hex");
        const consumed = await db().verification.deleteMany({
          where: { id: `email-once:${hash}`, expiresAt: { gt: new Date() } },
        });
        if (consumed.count !== 1)
          throw new APIError("BAD_REQUEST", {
            message:
              "This verification link is invalid, expired or already used. Request a new link or sign in.",
          });
      }),
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
