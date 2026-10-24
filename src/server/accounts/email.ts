import { Resend } from "resend";
import { db } from "@/lib/db";
import { readEnv, SetupError } from "@/lib/env";
export async function sendEmail(input: { to: string; subject: string; text: string; key: string }) {
  const env = readEnv();
  if (
    env.APP_ENV === "test" &&
    !env.TEST_EMAIL_DOMAINS.split(",").some((d) => input.to.endsWith(`@${d.trim()}`))
  )
    throw new Error("Test email recipient is outside the allowed isolated domains.");
  if (env.EMAIL_MODE === "sink") {
    if (env.APP_ENV === "production")
      throw new SetupError("Email sink is disabled for production.");
    await db().emailSink.upsert({
      where: { key: input.key },
      create: { key: input.key, recipient: input.to, subject: input.subject, body: input.text },
      update: {},
    });
    return { id: `sink:${input.key}`, state: "captured" as const };
  }
  if (input.to.endsWith(".test"))
    throw new Error("Isolated test recipients cannot be sent through the live provider.");
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM)
    throw new SetupError("Set RESEND_API_KEY and verified EMAIL_FROM to send email.");
  const result = await new Resend(env.RESEND_API_KEY).emails.send(
    { from: env.EMAIL_FROM, to: input.to, subject: input.subject, text: input.text },
    { idempotencyKey: input.key, signal: AbortSignal.timeout(12000) },
  );
  if (result.error) throw new Error(`Email provider rejected request: ${result.error.message}`);
  if (!result.data) throw new Error("Email provider returned no acceptance identifier.");
  return { id: result.data.id, state: "accepted" as const };
}
