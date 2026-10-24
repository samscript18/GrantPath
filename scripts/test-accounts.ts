import "dotenv/config";
import { db } from "../src/lib/db";
import { getAuth } from "../src/server/accounts/auth";
export const testPassword = "Isolated-test-passphrase-42";
async function main() {
  if (
    process.env.APP_ENV !== "test" ||
    !process.env.DATABASE_URL ||
    !new URL(process.env.DATABASE_URL).pathname.includes("test")
  )
    throw new Error(
      "Repeatable accounts are restricted to APP_ENV=test and an isolated test database.",
    );
  for (const [email, name, role] of [
    ["student@example.test", "Test student", "student"],
    ["other@example.test", "Other test student", "student"],
    ["operator@example.test", "Test operator", "operator"],
  ]) {
    const previous = await db().user.findUnique({ where: { email } });
    if (previous) {
      console.log(`${role} test account exists.`);
      continue;
    }
    await getAuth().api.signUpEmail({
      body: {
        email,
        name,
        password: process.env.TEST_ACCOUNT_PASSWORD || testPassword,
        callbackURL: `${process.env.BETTER_AUTH_URL}/profile`,
      },
    });
    const message = await db().emailSink.findFirstOrThrow({
      where: { recipient: email },
      orderBy: { createdAt: "desc" },
    });
    const url = message.body.match(/https?:\/\/\S+/)![0];
    await getAuth().handler(new Request(url));
    if (role === "operator") await db().user.update({ where: { email }, data: { role } });
    console.log(`${role} isolated account created and verified using captured mail.`);
  }
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(async () => db().$disconnect());
