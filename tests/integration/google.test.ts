import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getAuth } from "../../src/server/accounts/auth";
import { db } from "../../src/lib/db";
import { getProfile, saveProfile } from "../../src/server/profiles";

const origin = "http://127.0.0.1:3000";
const tag = crypto.randomUUID();
const emails: string[] = [];
const password = "Isolated-google-test-passphrase-42";
let client = 180;
const cookieHeader = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
async function post(path: string, body: unknown) {
  return getAuth().handler(
    new Request(`${origin}/api/auth/${path}`, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        "x-forwarded-for": `192.0.2.${client}`,
      },
      body: JSON.stringify(body),
    }),
  );
}
async function start() {
  const response = await post("sign-in/social", {
    provider: "google",
    callbackURL: "/dashboard",
    newUserCallbackURL: "/profile",
    errorCallbackURL: "/login?oauth=failed",
    disableRedirect: true,
  });
  expect(response.status).toBe(200);
  return { url: new URL((await response.json()).url), cookie: cookieHeader(response) };
}
async function callback(flow: Awaited<ReturnType<typeof start>>, cookie = flow.cookie) {
  return getAuth().handler(
    new Request(
      `${origin}/api/auth/callback/google?state=${flow.url.searchParams.get("state")}&code=isolated-fixture-code`,
      { headers: { Cookie: cookie } },
    ),
  );
}
async function mockIdentity(email: string, verified = true) {
  const provider = (await getAuth().$context).socialProviders.find((p) => p.id === "google")!;
  vi.spyOn(provider, "validateAuthorizationCode").mockResolvedValue({
    accessToken: "isolated-google-access-token",
    tokenType: "bearer",
  });
  vi.spyOn(provider, "getUserInfo").mockResolvedValue({
    user: { name: "[TEST ONLY] Google student", email, emailVerified: verified },
    data: { sub: `isolated-${email}`, email, email_verified: verified },
  });
}
describe("Google OAuth with an isolated provider fixture (no Google network requests)", () => {
  beforeEach(() => {
    client += 1;
  });
  beforeAll(async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "isolated.apps.googleusercontent.com");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "isolated-client-secret");
    await db().rateLimit.deleteMany();
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    await db().emailSink.deleteMany({ where: { recipient: { in: emails } } });
    await db().user.deleteMany({ where: { email: { in: emails } } });
  });
  it("uses the canonical callback, PKCE, state and basic scopes", async () => {
    const flow = await start();
    expect(flow.url.origin).toBe("https://accounts.google.com");
    expect(flow.url.searchParams.get("redirect_uri")).toBe(`${origin}/api/auth/callback/google`);
    expect(flow.url.searchParams.get("scope")?.split(" ").sort()).toEqual([
      "email",
      "openid",
      "profile",
    ]);
    expect(flow.url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(flow.url.searchParams.get("code_challenge")).toBeTruthy();
    expect(flow.url.searchParams.get("state")).toBeTruthy();
    const rejected = await callback(flow, "unrelated=1");
    expect(rejected.headers.get("location")).toContain("error=");
  });
  it("creates a verified student, starts onboarding, encrypts tokens and returns to the same account", async () => {
    const email = `google-${tag}@example.test`;
    emails.push(email);
    await mockIdentity(email);
    const first = await callback(await start());
    expect(new URL(first.headers.get("location")!, origin).pathname).toBe("/profile");
    const user = await db().user.findUniqueOrThrow({ where: { email } });
    expect(user.emailVerified).toBe(true);
    expect(user.role).toBe("student");
    const actor = { id: user.id, email, name: user.name, role: user.role };
    await saveProfile(actor, { citizenships: ["Nigeria"], residence: "Ghana" }, 0, 1);
    const account = await db().account.findFirstOrThrow({
      where: { userId: user.id, providerId: "google" },
    });
    expect(account.accessToken).toBeTruthy();
    expect(account.accessToken).not.toBe("isolated-google-access-token");
    const again = await callback(await start());
    expect(new URL(again.headers.get("location")!, origin).pathname).toBe("/dashboard");
    expect(await db().user.count({ where: { email } })).toBe(1);
    expect((await getProfile(actor)).data.residence).toBe("Ghana");
    const session = await getAuth().api.getSession({
      headers: new Headers({ Cookie: cookieHeader(again) }),
    });
    expect(session?.user.id).toBe(user.id);
    expect(await db().emailSink.count({ where: { recipient: email } })).toBe(0);
  });
  it("links a verified existing email account and preserves its identity", async () => {
    const email = `google-link-${tag}@example.test`;
    emails.push(email);
    const signup = await post("sign-up/email", {
      name: "[TEST ONLY] Existing student",
      email,
      password,
    });
    expect(signup.status).toBe(200);
    const mail = await db().emailSink.findFirstOrThrow({
      where: { recipient: email },
      orderBy: { createdAt: "desc" },
    });
    await getAuth().handler(new Request(mail.body.match(/https?:\/\/\S+/)![0]));
    const before = await db().user.findUniqueOrThrow({ where: { email } });
    await mockIdentity(email);
    const response = await callback(await start());
    expect(new URL(response.headers.get("location")!, origin).pathname).toBe("/dashboard");
    expect((await db().user.findUniqueOrThrow({ where: { email } })).id).toBe(before.id);
    expect(await db().account.count({ where: { userId: before.id } })).toBe(2);
  });
  it("rejects unverified Google email and refuses linking an unverified local account", async () => {
    const unverified = `google-unverified-${tag}@example.test`;
    emails.push(unverified);
    await mockIdentity(unverified, false);
    expect((await callback(await start())).headers.get("location")).toContain("error=");
    expect(await db().user.count({ where: { email: unverified } })).toBe(0);
    const local = `google-local-${tag}@example.test`;
    emails.push(local);
    expect(
      (await post("sign-up/email", { name: "[TEST ONLY] Unverified", email: local, password }))
        .status,
    ).toBe(200);
    await mockIdentity(local);
    expect((await callback(await start())).headers.get("location")).toContain("error=");
    const user = await db().user.findUniqueOrThrow({ where: { email: local } });
    expect(user.emailVerified).toBe(false);
    expect(await db().account.count({ where: { userId: user.id, providerId: "google" } })).toBe(0);
    expect(await db().session.count({ where: { userId: user.id } })).toBe(0);
  });
});
