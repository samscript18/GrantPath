import { describe, expect, it, vi } from "vitest";
import { readEnv } from "../../src/lib/env";
import { sendEmail } from "../../src/server/accounts/email";
import {
  EMAIL_SAFE_RETRY_MS,
  EmailAcceptanceUncertain,
  emailIdempotencyKey,
  sendBrevoEmail,
} from "../../src/server/accounts/brevo";

const input = {
  to: "student@example.org",
  subject: "[TEST ONLY] Verification",
  text: "Isolated provider contract test.",
  key: "isolated-event:1",
};
const configuration = { apiKey: "unit-test-key-only", sender: "sender@example.org" };
describe("Brevo transactional mail contract", () => {
  it("blocks isolated test recipients before a live provider request, including uppercase domains", async () => {
    const transport = vi.fn<typeof fetch>();
    try {
      vi.stubEnv("APP_ENV", "development");
      vi.stubEnv("EMAIL_MODE", "brevo");
      vi.stubEnv("BREVO_API_KEY", configuration.apiKey);
      vi.stubEnv("EMAIL_FROM", configuration.sender);
      vi.stubEnv("DATABASE_URL", "postgresql://unit:unit@localhost/unit_test");
      vi.stubEnv("BETTER_AUTH_SECRET", "isolated-unit-secret-of-at-least-32-characters");
      vi.stubEnv("BETTER_AUTH_URL", "https://app.example.org");
      vi.stubGlobal("fetch", transport);
      await expect(sendEmail({ ...input, to: "student@EXAMPLE.TEST" })).rejects.toThrow(
        "Isolated test recipients",
      );
      expect(transport).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    }
  });
  it("uses a stable valid UUID for the durable identity and preserves distinct events", () => {
    expect(emailIdempotencyKey(input.key)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(emailIdempotencyKey(input.key)).toBe(emailIdempotencyKey(input.key));
    expect(emailIdempotencyKey(input.key)).not.toBe(emailIdempotencyKey("isolated-event:2"));
    expect(EMAIL_SAFE_RETRY_MS).toBe(29 * 60_000);
  });
  it("submits literal content with API authentication and records acceptance rather than receipt", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ messageId: "<isolated-test-id>" }), { status: 201 }),
      );
    await expect(sendBrevoEmail(input, configuration, transport)).resolves.toEqual({
      id: "<isolated-test-id>",
      state: "accepted",
    });
    const [url, options] = transport.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(options?.headers).toMatchObject({ "api-key": configuration.apiKey });
    expect(options?.redirect).toBe("error");
    expect(JSON.parse(String(options?.body))).toMatchObject({
      sender: { email: configuration.sender },
      to: [{ email: input.to }],
      subject: input.subject,
      textContent: input.text,
      headers: { idempotencyKey: emailIdempotencyKey(input.key) },
    });
  });
  it("holds duplicate acknowledgements without inventing a provider ID or retrying", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ code: "duplicate_parameter" }), { status: 400 }),
      );
    await expect(sendBrevoEmail(input, configuration, transport)).rejects.toBeInstanceOf(
      EmailAcceptanceUncertain,
    );
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("holds success without a message identifier and reports rejected requests safely", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("{}", { status: 201 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "do not echo provider payload" }), { status: 403 }),
      );
    await expect(sendBrevoEmail(input, configuration, transport)).rejects.toBeInstanceOf(
      EmailAcceptanceUncertain,
    );
    await expect(sendBrevoEmail(input, configuration, transport)).rejects.toThrow("HTTP 403");
  });
  it("requires Brevo credentials and a usable sender for live mode", () => {
    const base = {
      NODE_ENV: "test" as const,
      DATABASE_URL: "postgresql://unit:unit@localhost/unit_test",
      BETTER_AUTH_SECRET: "isolated-unit-secret-of-at-least-32-characters",
      BETTER_AUTH_URL: "https://app.example.org",
      APP_ENV: "production",
      EMAIL_MODE: "brevo",
      BREVO_API_KEY: configuration.apiKey,
      EMAIL_FROM: configuration.sender,
    };
    expect(readEnv(base).EMAIL_MODE).toBe("brevo");
    expect(() => readEnv({ ...base, BREVO_API_KEY: "" })).toThrow("BREVO_API_KEY");
    expect(() => readEnv({ ...base, EMAIL_FROM: "onboarding@resend.dev" })).toThrow(
      "verified Brevo sender",
    );
    expect(() => readEnv({ ...base, EMAIL_MODE: "sink" })).toThrow("EMAIL_MODE=brevo");
  });
});
