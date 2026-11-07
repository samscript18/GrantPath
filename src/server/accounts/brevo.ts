import { createHash } from "node:crypto";

// Brevo documents a 30-minute idempotency TTL. Leave one minute of margin.
export const EMAIL_SAFE_RETRY_MS = 29 * 60_000;

export class EmailAcceptanceUncertain extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailAcceptanceUncertain";
  }
}

export function emailIdempotencyKey(key: string) {
  // RFC 9562 UUIDv5 in the URL namespace, stable for the durable event identity.
  const namespace = Buffer.from("6ba7b8119dad11d180b400c04fd430c8", "hex");
  const bytes = createHash("sha1")
    .update(namespace)
    .update(`grantpath:${key}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function sendBrevoEmail(
  input: { to: string; subject: string; text: string; key: string },
  configuration: { apiKey: string; sender: string },
  transport: typeof fetch = fetch,
) {
  const response = await transport("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(12_000),
    headers: {
      "api-key": configuration.apiKey,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: configuration.sender, name: "GrantPath" },
      to: [{ email: input.to }],
      subject: input.subject,
      textContent: input.text,
      headers: { idempotencyKey: emailIdempotencyKey(input.key) },
      tags: ["grantpath"],
    }),
  });
  const body: unknown = await response.json().catch(() => null);
  const result = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if (result.code === "duplicate_parameter")
    throw new EmailAcceptanceUncertain(
      "Brevo already processed this idempotency key, but its message ID is unavailable. Inspect transactional logs before any further send.",
    );
  if (!response.ok)
    throw new Error(
      `Brevo rejected the email request (HTTP ${response.status}). Check the API key, verified sender and sending allowance.`,
    );
  const id =
    typeof result.messageId === "string"
      ? result.messageId
      : Array.isArray(result.messageIds) && result.messageIds.length === 1
        ? result.messageIds[0]
        : null;
  if (typeof id !== "string" || !id.trim() || id.length > 500)
    throw new EmailAcceptanceUncertain(
      "Brevo returned success without a usable message ID. Inspect transactional logs before any further send.",
    );
  return { id, state: "accepted" as const };
}
