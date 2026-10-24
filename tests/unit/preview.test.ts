import { describe, expect, it } from "vitest";
import { previewRegistrationAllowed } from "../../src/server/accounts/preview";

describe("isolated public preview registration", () => {
  const preview = { VERCEL_ENV: "preview", EMAIL_MODE: "sink", TEST_EMAIL_DOMAINS: "example.test" };
  it("allows test accounts and rejects real or lookalike domains before account creation", () => {
    expect(previewRegistrationAllowed("student@EXAMPLE.TEST", preview)).toBe(true);
    expect(previewRegistrationAllowed("student@gmail.com", preview)).toBe(false);
    expect(previewRegistrationAllowed("student@otherexample.test", preview)).toBe(false);
    expect(previewRegistrationAllowed("student@example.test.evil.com", preview)).toBe(false);
  });
  it("permits real signup when the preview uses configured email delivery", () => {
    expect(
      previewRegistrationAllowed("student@gmail.com", { ...preview, EMAIL_MODE: "brevo" }),
    ).toBe(true);
    expect(previewRegistrationAllowed("student@gmail.com", { EMAIL_MODE: "sink" })).toBe(true);
  });
});
