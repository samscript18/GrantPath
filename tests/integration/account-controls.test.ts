import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { db } from "../../src/lib/db";
import {
  requestSecurityCode,
  confirmSecurityCode,
  deliverSecurityEmail,
  sessionList,
  revokeSessions,
} from "../../src/server/accounts/security";
import {
  requestExport,
  prepareExport,
  downloadExport,
  cancelDeletion,
  eraseAccount,
} from "../../src/server/accounts/privacy";
async function account() {
  const id = crypto.randomUUID(),
    password = `Fixture-${crypto.randomUUID()}!`;
  const actor = {
    id,
    email: `${id}@example.test`,
    name: "[TEST ONLY] Account controls",
    role: "student",
  };
  await db().user.create({
    data: {
      ...actor,
      emailVerified: true,
      accounts: {
        create: {
          id: crypto.randomUUID(),
          accountId: id,
          providerId: "credential",
          password: await hashPassword(password),
        },
      },
    },
  });
  const session = await db().session.create({
    data: {
      id: crypto.randomUUID(),
      userId: id,
      token: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 3600000),
      userAgent: "Mozilla/5.0 Macintosh Chrome/120",
    },
  });
  return { actor, password, session };
}
async function code(id: string, email: string) {
  await deliverSecurityEmail(id);
  const mail = await db().emailSink.findFirstOrThrow({
    where: { recipient: email },
    orderBy: { createdAt: "desc" },
  });
  return mail.body.match(/\b\d{6}\b/)![0];
}
describe("account controls after the UI pause", () => {
  it("changes a password only after owned email confirmation, revokes all sessions and prevents code replay", async () => {
    const a = await account(),
      b = await account(),
      next = `Next-${crypto.randomUUID()}!`;
    const challenge = await requestSecurityCode(a.actor, a.session.id, {
      purpose: "password",
      currentPassword: a.password,
      password: next,
      confirmPassword: next,
    });
    expect(challenge).not.toHaveProperty("code");
    expect(challenge).not.toHaveProperty("secret");
    const otp = await code(challenge.id, a.actor.email);
    await expect(
      requestSecurityCode(a.actor, a.session.id, {
        purpose: "password",
        currentPassword: a.password,
        password: next,
        confirmPassword: next,
      }),
    ).rejects.toThrow("Wait");
    await expect(
      confirmSecurityCode(b.actor, b.session.id, {
        id: challenge.id,
        code: otp,
        purpose: "password",
      }),
    ).rejects.toThrow();
    const credential = await db().account.findFirstOrThrow({ where: { userId: a.actor.id } });
    expect(await verifyPassword({ hash: credential.password!, password: a.password })).toBe(true);
    await confirmSecurityCode(a.actor, a.session.id, {
      id: challenge.id,
      code: otp,
      purpose: "password",
    });
    expect(await db().session.count({ where: { userId: a.actor.id } })).toBe(0);
    const changed = await db().account.findFirstOrThrow({ where: { userId: a.actor.id } });
    expect(await verifyPassword({ hash: changed.password!, password: next })).toBe(true);
    await expect(
      confirmSecurityCode(a.actor, a.session.id, {
        id: challenge.id,
        code: otp,
        purpose: "password",
      }),
    ).rejects.toThrow();
    await db().user.deleteMany({ where: { id: { in: [a.actor.id, b.actor.id] } } });
  });
  it("commits failed-code attempts, binds sessions and never overwrites a newer credential", async () => {
    const a = await account(),
      next = `Next-${crypto.randomUUID()}!`;
    const challenge = await requestSecurityCode(a.actor, a.session.id, {
      purpose: "password",
      currentPassword: a.password,
      password: next,
      confirmPassword: next,
    });
    const otp = await code(challenge.id, a.actor.email);
    const currentHash = await hashPassword(`Concurrent-${crypto.randomUUID()}!`);
    await db().account.updateMany({
      where: { userId: a.actor.id },
      data: { password: currentHash },
    });
    await expect(
      confirmSecurityCode(a.actor, a.session.id, {
        id: challenge.id,
        code: otp,
        purpose: "password",
      }),
    ).rejects.toThrow("changed since");
    expect((await db().account.findFirstOrThrow({ where: { userId: a.actor.id } })).password).toBe(
      currentHash,
    );
    const wrong = otp === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++)
      await expect(
        confirmSecurityCode(a.actor, a.session.id, {
          id: challenge.id,
          code: wrong,
          purpose: "password",
        }),
      ).rejects.toThrow();
    const row = await db().securityChallenge.findUniqueOrThrow({ where: { id: challenge.id } });
    expect(row.attempts).toBe(5);
    expect(row.secret).toBeNull();
    await db().user.delete({ where: { id: a.actor.id } });
  });
  it("keeps session revocation private and export encrypted, owned and one-time under concurrency", async () => {
    const a = await account(),
      b = await account();
    expect(await sessionList(a.actor, a.session.id)).toHaveLength(1);
    expect(await revokeSessions(a.actor, a.session.id, { id: b.session.id })).toEqual({
      revoked: 0,
      signedOut: false,
    });
    const request = await requestExport(a.actor);
    await prepareExport(request.id);
    const row = await db().accountExport.findUniqueOrThrow({ where: { id: request.id } });
    expect(row.encryptedData).not.toContain(a.actor.email);
    await expect(downloadExport(b.actor, { id: request.id, token: request.token })).rejects.toThrow(
      "one-time",
    );
    const downloads = await Promise.allSettled([
      downloadExport(a.actor, { id: request.id, token: request.token }),
      downloadExport(a.actor, { id: request.id, token: request.token }),
    ]);
    expect(downloads.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const json = downloads.find((r) => r.status === "fulfilled");
    if (json?.status !== "fulfilled") throw new Error("Missing export");
    expect(json.value).toContain(a.actor.email);
    expect(json.value).not.toContain(a.session.token);
    expect(json.value).not.toContain(b.actor.email);
    await db().user.deleteMany({ where: { id: { in: [a.actor.id, b.actor.id] } } });
  });
  it("allows deletion cancellation during grace and erases only the due isolated account", async () => {
    const a = await account();
    const challenge = await requestSecurityCode(a.actor, a.session.id, { purpose: "deletion" });
    const otp = await code(challenge.id, a.actor.email);
    await confirmSecurityCode(a.actor, a.session.id, {
      id: challenge.id,
      purpose: "deletion",
      code: otp,
      confirmation: "DELETE",
    });
    const scheduled = await db().accountDeletion.findUniqueOrThrow({
      where: { userId: a.actor.id },
    });
    expect(scheduled.scheduledAt.getTime() - Date.now()).toBeGreaterThan(6 * 86400000);
    await cancelDeletion(a.actor);
    expect(await db().accountDeletion.count({ where: { userId: a.actor.id } })).toBe(0);
    await db().accountDeletion.create({
      data: { userId: a.actor.id, scheduledAt: new Date(Date.now() - 1000) },
    });
    await expect(cancelDeletion(a.actor)).rejects.toThrow("ended");
    await eraseAccount(a.actor.id);
    expect(await db().user.count({ where: { id: a.actor.id } })).toBe(0);
  });
});
