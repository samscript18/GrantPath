import { db } from "@/lib/db";
import { readEnv, SetupError } from "@/lib/env";
import { sendBrevoEmail } from "./brevo";
export async function sendEmail(input: { to: string; subject: string; text: string; key: string }) {
  const env = readEnv();
  if (
    env.APP_ENV === "test" &&
    !env.TEST_EMAIL_DOMAINS.split(",").some((d) =>
      input.to.toLowerCase().endsWith(`@${d.trim().toLowerCase()}`),
    )
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
  if (input.to.toLowerCase().endsWith(".test"))
    throw new Error("Isolated test recipients cannot be sent through the live provider.");
  if (!env.BREVO_API_KEY || !env.EMAIL_FROM)
    throw new SetupError("Set BREVO_API_KEY and a verified Brevo EMAIL_FROM sender to send email.");
  return sendBrevoEmail(input, { apiKey: env.BREVO_API_KEY, sender: env.EMAIL_FROM });
}
