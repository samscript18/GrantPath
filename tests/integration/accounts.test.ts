import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { getAuth } from "../../src/server/accounts/auth";
import { db } from "../../src/lib/db";
import { GET as operatorGET } from "../../src/app/api/operator/route";
import { GET, PUT } from "../../src/app/api/profile/route";
const origin = "http://127.0.0.1:3000";
const ips = new Map<string, string>();
const password = "Isolated-test-passphrase-42";
async function authPost(path: string, body: unknown, cookie?: string) {
  const email = (body as { email?: string }).email || "fallback";
  if (!ips.has(email)) ips.set(email, `192.0.2.${ips.size + 1}`);
  return getAuth().handler(
    new Request(`${origin}/api/auth/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        "x-forwarded-for": ips.get(email)!,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}
async function registerVerified(email: string) {
  const res = await authPost("sign-up/email", {
    email,
    password,
    name: "Isolated Test Student",
    callbackURL: `${origin}/profile`,
    role: "operator",
    authMethod: "google",
  });
  expect(res.status).toBe(200);
  const user = await db().user.findUniqueOrThrow({ where: { email } });
  expect(user.role).toBe("student");
  expect(user.authMethod).toBe("email");
  expect(user.emailVerified).toBe(false);
  const mail = await db().emailSink.findFirstOrThrow({
    where: { recipient: email, subject: { contains: "Verify" } },
    orderBy: { createdAt: "desc" },
  });
  const url = mail.body.match(/https?:\/\/\S+/)?.[0];
  expect(url).toBeTruthy();
  const verification = await getAuth().handler(new Request(url!));
  expect([200, 302]).toContain(verification.status);
  expect((await getAuth().handler(new Request(url!))).status).toBe(400);
  const login = await authPost("sign-in/email", { email, password });
  expect(login.status).toBe(200);
  return {
    user,
    cookie: login.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  };
}
describe("first persistent journey", () => {
  const emails: string[] = [];
  beforeAll(async () => {
    await db().rateLimit.deleteMany();
  });
  afterAll(async () => {
    await db().emailSink.deleteMany({ where: { recipient: { in: emails } } });
    await db().user.deleteMany({ where: { email: { in: emails } } });
  });
  it("rejects weak new passwords at signup and reset before provisioning or token use", async () => {
    for (const [i, weak] of [
      "onlylowercaseletters",
      "NOLOWERCASE123!",
      "NoNumbersHere!",
      "NoSymbolsHere123",
    ].entries()) {
      const email = `weak-${crypto.randomUUID()}@example.test`;
      const response = await authPost("sign-up/email", {
        name: "[TEST ONLY] Weak password",
        email,
        password: weak,
      });
      expect(response.status).toBe(400);
      expect(await db().user.count({ where: { email } })).toBe(0);
      const reset = await getAuth().handler(
        new Request(`${origin}/api/auth/reset-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: origin,
            "x-forwarded-for": `192.0.2.${160 + i}`,
          },
          body: JSON.stringify({ token: "isolated-invalid-token", newPassword: weak }),
        }),
      );
      expect(reset.status).toBe(400);
      expect((await reset.json()).message).toContain("Include");
    }
  });
  it("registers, verifies, saves, isolates ownership, logs out and returns", async () => {
    const tag = crypto.randomUUID();
    const aEmail = `a-${tag}@example.test`;
    const bEmail = `b-${tag}@example.test`;
    emails.push(aEmail, bEmail);
    const a = await registerVerified(aEmail);
    expect(
      (await operatorGET(new Request(`${origin}/api/operator`, { headers: { Cookie: a.cookie } })))
        .status,
    ).toBe(403);
    const b = await registerVerified(bEmail);
    const put = await PUT(
      new Request(`${origin}/api/profile`, {
        method: "PUT",
        headers: { Cookie: a.cookie, Origin: origin },
        body: JSON.stringify({
          data: { citizenships: ["Nigeria"], residence: "Ghana", targetLevel: "master" },
          version: 0,
          stage: 1,
        }),
      }),
    );
    expect(put.status).toBe(200);
    expect((await put.json()).version).toBe(1);
    const bGet = await GET(
      new Request(`${origin}/api/profile?userId=${a.user.id}`, { headers: { Cookie: b.cookie } }),
    );
    expect((await bGet.json()).data.citizenships).toEqual([]);
    const attack = await PUT(
      new Request(`${origin}/api/profile`, {
        method: "PUT",
        headers: { Cookie: b.cookie, Origin: origin },
        body: JSON.stringify({ userId: a.user.id, data: {}, version: 1, stage: 0 }),
      }),
    );
    expect(attack.status).toBe(400);
    const noOrigin = await PUT(
      new Request(`${origin}/api/profile`, {
        method: "PUT",
        headers: { Cookie: a.cookie },
        body: "{}",
      }),
    );
    expect(noOrigin.status).toBe(403);
    const logout = await authPost("sign-out", {}, a.cookie);
    expect(logout.status).toBe(200);
    expect(
      (await GET(new Request(`${origin}/api/profile`, { headers: { Cookie: a.cookie } }))).status,
    ).toBe(401);
    const login = await authPost("sign-in/email", { email: aEmail, password });
    const cookie = login.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    const returned = await GET(
      new Request(`${origin}/api/profile`, { headers: { Cookie: cookie } }),
    );
    const saved = await returned.json();
    expect(saved.data.residence).toBe("Ghana");
    expect(saved.version).toBe(1);
  });
  it("recovers with an expiring single-use reset token", async () => {
    const email = `recovery-${crypto.randomUUID()}@example.test`;
    emails.push(email);
    await registerVerified(email);
    expect(
      (await authPost("request-password-reset", { email, redirectTo: `${origin}/reset-password` }))
        .status,
    ).toBe(200);
    const mail = await db().emailSink.findFirstOrThrow({
      where: { recipient: email, subject: { contains: "Reset" } },
    });
    const url = mail.body.match(/https?:\/\/\S+/)![0];
    const redirect = await getAuth().handler(new Request(url));
    const location = redirect.headers.get("location")!;
    const token = new URL(location, origin).searchParams.get("token");
    expect(token).toBeTruthy();
    expect(
      (await authPost("reset-password", { token, newPassword: "New-isolated-passphrase-42" }))
        .status,
    ).toBe(200);
    expect(
      (await authPost("reset-password", { token, newPassword: "Another-isolated-passphrase-43" }))
        .status,
    ).toBeGreaterThanOrEqual(400);
    expect((await authPost("sign-in/email", { email, password })).status).toBe(401);
    expect(
      (await authPost("sign-in/email", { email, password: "New-isolated-passphrase-42" })).status,
    ).toBe(200);
  });
});
