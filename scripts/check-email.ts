import "dotenv/config";
import { readEnv } from "../src/lib/env";

async function main() {
  const env = readEnv({ ...process.env, EMAIL_MODE: "brevo" });
  const headers = { "api-key": env.BREVO_API_KEY!, accept: "application/json" };
  for (const path of ["account", "senders"]) {
    const response = await fetch(`https://api.brevo.com/v3/${path}`, {
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok)
      throw new Error(
        `Brevo ${path} check failed (HTTP ${response.status}). Check the API key and account access.`,
      );
    const result = await response.json();
    if (path === "account") {
      console.log(
        JSON.stringify({
          provider: "Brevo",
          transactionalSendingEnabled: result.relay?.enabled,
          allowances: result.plan?.map(
            (plan: { type: string; creditsType: string; credits: number }) => ({
              plan: plan.type,
              type: plan.creditsType,
              remaining: plan.credits,
            }),
          ),
        }),
      );
      if (!result.relay?.enabled)
        throw new Error("Enable transactional sending in the Brevo account before live email.");
    } else {
      const sender = result.senders?.find(
        (item: { email: string; active: boolean }) =>
          item.email.toLowerCase() === env.EMAIL_FROM!.toLowerCase(),
      );
      if (!sender?.active)
        throw new Error(
          "EMAIL_FROM must match an active, verified Brevo sender. Verify it in Brevo's Senders settings.",
        );
      console.log("Configured Brevo sender is active. This read-only check sent no email.");
    }
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Brevo setup check failed");
  process.exitCode = 1;
});
