import { randomInt, randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { passwordConfirmationSchema } from "@/lib/password";
import type { Actor } from "./auth";
import type { Prisma, SecurityChallenge } from "@/generated/prisma/client";
import { digest, sameDigest, seal, unseal } from "./secrets";
import { sendEmail } from "./email";

export const purposeSchema = z.enum(["password", "deletion"]);
export type SecurityPurpose = z.infer<typeof purposeSchema>;
export async function lockAccount(tx: Prisma.TransactionClient, userId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
  const exists = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) throw new HttpError(401, "Please sign in again.");
}
export function publicChallenge(row: SecurityChallenge) {
  return {
    id: row.id,
    purpose: row.purpose,
    expiresAt: row.expiresAt.toISOString(),
    resendAt: row.resendAt.toISOString(),
    emailState: row.emailState,
  };
}
export async function securityStatus(actor: Actor, sessionId: string) {
  const rows = await db().securityChallenge.findMany({
    where: {
      userId: actor.id,
      sessionId,
      usedAt: null,
      expiresAt: { gt: new Date() },
      attempts: { lt: 5 },
    },
    orderBy: { createdAt: "desc" },
    take: 2,
  });
  return Promise.all(
    rows.map(async (row) => {
      const job = await db().outbox.findUnique({
        where: { key: `security-email:${row.id}` },
        select: { state: true, attempts: true },
      });
      return {
        ...publicChallenge(row),
        emailState:
          row.emailState === "queued" && job?.state === "failed"
            ? "failed"
            : row.emailState === "queued" &&
                ((job?.state === "pending" && job.attempts > 0) ||
                  (job?.state === "processing" && job.attempts > 1))
              ? "retrying"
              : row.emailState,
      };
    }),
  );
}
export async function requestSecurityCode(actor: Actor, sessionId: string, input: unknown) {
  const { purpose } = z.object({ purpose: purposeSchema }).passthrough().parse(input);
  const account = await db().user.findUniqueOrThrow({
    where: { id: actor.id },
    include: { accounts: { where: { providerId: "credential" }, take: 1 } },
  });
  if (!account.emailVerified)
    throw new HttpError(403, "Verify your email address before changing account security.");
  let passwordData: { accountId: string; previous: string; next: string } | undefined;
  if (purpose === "password") {
    if (account.authMethod !== "email")
      throw new HttpError(
        403,
        "Your account uses Google. Manage its password in your Google account.",
      );
    const fields = passwordConfirmationSchema
      .and(z.object({ currentPassword: z.string().min(1).max(128) }))
      .parse(input);
    const credential = account.accounts[0];
    if (
      !credential?.password ||
      !(await verifyPassword({ hash: credential.password, password: fields.currentPassword }))
    )
      throw new HttpError(400, "Your current password is incorrect.");
    if (fields.password === fields.currentPassword)
      throw new HttpError(400, "Choose a password different from your current password.");
    passwordData = {
      accountId: credential.id,
      previous: credential.password,
      next: await hashPassword(fields.password),
    };
  }
  const id = randomUUID();
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const now = new Date();
  return db().$transaction(async (tx) => {
    await lockAccount(tx, actor.id);
    const session = await tx.session.findFirst({
      where: { id: sessionId, userId: actor.id, expiresAt: { gt: now } },
    });
    if (!session) throw new HttpError(401, "Please sign in again.");
    const latest = await tx.securityChallenge.findFirst({
      where: { userId: actor.id, purpose },
      orderBy: { createdAt: "desc" },
    });
    if (latest && latest.resendAt > now)
      throw new HttpError(
        429,
        `Wait ${Math.ceil((latest.resendAt.getTime() - now.getTime()) / 1000)} seconds before requesting another code.`,
      );
    await tx.securityChallenge.updateMany({
      where: { userId: actor.id, purpose, usedAt: null },
      data: { usedAt: now, secret: null },
    });
    const row = await tx.securityChallenge.create({
      data: {
        id,
        userId: actor.id,
        sessionId,
        purpose,
        codeHash: digest(`${id}:${actor.id}:${sessionId}:${purpose}:${code}`),
        secret: seal(JSON.stringify({ code, passwordData }), `challenge:${id}`),
        expiresAt: new Date(now.getTime() + 600_000),
        resendAt: new Date(now.getTime() + 120_000),
      },
    });
    const event = await tx.outbox.create({
      data: {
        key: `security-email:${id}`,
        topic: "account.security-email",
        payload: { challengeId: id },
      },
    });
    return { ...publicChallenge(row), eventId: event.id };
  });
}
// The transaction commits failed guesses; throwing inside it would undo the limit.
export async function confirmSecurityCode(actor: Actor, sessionId: string, input: unknown) {
  const data = z
    .object({
      id: z.uuid(),
      code: z.string().regex(/^\d{6}$/),
      purpose: purposeSchema,
      confirmation: z.string().optional(),
    })
    .strict()
    .parse(input);
  if (data.purpose === "deletion" && data.confirmation !== "DELETE")
    throw new HttpError(400, "Type DELETE to confirm your deletion request.");
  const now = new Date();
  const result = await db().$transaction(async (tx) => {
    await lockAccount(tx, actor.id);
    const session = await tx.session.findFirst({
      where: { id: sessionId, userId: actor.id, expiresAt: { gt: now } },
    });
    if (!session) return { error: "Your session expired. Sign in again.", status: 401 };
    const row = await tx.securityChallenge.findFirst({
      where: { id: data.id, userId: actor.id, sessionId, purpose: data.purpose },
    });
    if (!row || row.usedAt || row.expiresAt <= now || row.attempts >= 5 || !row.secret)
      return { error: "This code expired or is unavailable. Request another code.", status: 400 };
    if (
      !sameDigest(
        row.codeHash,
        digest(`${row.id}:${actor.id}:${sessionId}:${row.purpose}:${data.code}`),
      )
    ) {
      await tx.securityChallenge.update({
        where: { id: row.id },
        data: {
          attempts: { increment: 1 },
          ...(row.attempts >= 4 ? { secret: null, usedAt: now } : {}),
        },
      });
      return {
        error:
          row.attempts >= 4
            ? "Too many incorrect codes. Request a new code after the countdown."
            : "That code is incorrect. Please try again.",
        status: 400,
      };
    }
    const secret = JSON.parse(unseal(row.secret, `challenge:${row.id}`)) as {
      passwordData?: { accountId: string; previous: string; next: string };
    };
    if (row.purpose === "password") {
      const owner = await tx.user.findUniqueOrThrow({ where: { id: actor.id } });
      if (owner.authMethod !== "email" || !secret.passwordData)
        return { error: "This account does not support email passwords.", status: 403 };
      const changed = await tx.account.updateMany({
        where: {
          id: secret.passwordData.accountId,
          userId: actor.id,
          providerId: "credential",
          password: secret.passwordData.previous,
        },
        data: { password: secret.passwordData.next },
      });
      if (changed.count !== 1)
        return { error: "Your password has changed since this request. Start again.", status: 409 };
      await tx.session.deleteMany({ where: { userId: actor.id } });
      await tx.verification.deleteMany({
        where: { value: actor.id, identifier: { startsWith: "reset-password:" } },
      });
    } else {
      // Re-confirmations cannot move an existing deletion date further away.
      const scheduledAt = new Date(now.getTime() + 7 * 86_400_000);
      await tx.accountDeletion.upsert({
        where: { userId: actor.id },
        create: { userId: actor.id, scheduledAt },
        update: {},
      });
      await tx.outbox.upsert({
        where: { key: `account-deletion:${row.id}` },
        create: {
          key: `account-deletion:${row.id}`,
          topic: "account.delete",
          payload: { userId: actor.id },
          availableAt: scheduledAt,
        },
        update: {},
      });
    }
    await tx.securityChallenge.updateMany({
      where: { userId: actor.id, usedAt: null },
      data: { usedAt: now, secret: null },
    });
    return { success: true, signedOut: row.purpose === "password" };
  });
  if ("error" in result) throw new HttpError(result.status!, result.error!);
  return result;
}
export async function deliverSecurityEmail(challengeId: string) {
  const row = await db().securityChallenge.findUnique({
    where: { id: challengeId },
    include: { user: { select: { email: true } } },
  });
  if (
    !row ||
    row.usedAt ||
    row.expiresAt <= new Date() ||
    !row.secret ||
    ["accepted", "captured"].includes(row.emailState)
  )
    return;
  const secret = JSON.parse(unseal(row.secret, `challenge:${row.id}`)) as { code: string };
  const result = await sendEmail({
    to: row.user.email,
    subject:
      row.purpose === "password"
        ? "Confirm your GrantPath password change"
        : "Confirm your GrantPath deletion request",
    text: `Your GrantPath verification code is ${secret.code}.\n\nIt expires in 10 minutes and works only in the session that requested it. ${row.purpose === "password" ? "Your password will change only after you enter this code." : "A 7-day cancellation period begins only after you confirm this code and type DELETE."}\n\nIf you did not request this, ignore this email and review your active sessions.`,
    key: `security:${row.id}`,
  });
  await db().securityChallenge.updateMany({
    where: { id: row.id, usedAt: null },
    data: { emailState: result.state === "captured" ? "captured" : "accepted", sentAt: new Date() },
  });
}

export async function sessionList(actor: Actor, currentId: string) {
  const rows = await db().session.findMany({
    where: { userId: actor.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, userAgent: true, createdAt: true, updatedAt: true, expiresAt: true },
  });
  return rows.map((row) => ({
    id: row.id,
    current: row.id === currentId,
    ...deviceLabel(row.userAgent),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  }));
}
function deviceLabel(agent: string | null) {
  const a = agent || "";
  const device = /iPad/i.test(a)
    ? "iPad"
    : /iPhone/i.test(a)
      ? "iPhone"
      : /Android/i.test(a)
        ? "Android device"
        : /Windows/i.test(a)
          ? "Windows PC"
          : /Macintosh|Mac OS/i.test(a)
            ? "Mac"
            : /Linux/i.test(a)
              ? "Linux device"
              : "Unrecognised device";
  const browser = /Edg\//i.test(a)
    ? "Edge"
    : /Firefox\//i.test(a)
      ? "Firefox"
      : /Chrome\//i.test(a)
        ? "Chrome"
        : /Safari\//i.test(a)
          ? "Safari"
          : "Browser not recorded";
  return { device, browser };
}
export async function revokeSessions(actor: Actor, currentId: string, input: unknown) {
  const data = z
    .union([
      z.object({ all: z.literal(true) }).strict(),
      z.object({ id: z.string().min(1).max(200) }).strict(),
    ])
    .parse(input);
  return db().$transaction(async (tx) => {
    await lockAccount(tx, actor.id);
    const revoked = await tx.session.deleteMany({
      where: { userId: actor.id, ...("id" in data ? { id: data.id } : {}) },
    });
    return { revoked: revoked.count, signedOut: "all" in data || data.id === currentId };
  });
}
