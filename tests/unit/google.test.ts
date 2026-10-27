import { describe, expect, it } from "vitest";
import { readEnv } from "../../src/lib/env";
import { googleProvider, googleSignInEnabled } from "../../src/server/accounts/google";

const base = {
  NODE_ENV: "test" as const,
  DATABASE_URL: "postgresql://localhost/isolated_test",
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "x".repeat(32),
};
describe("optional Google configuration", () => {
  it("keeps email authentication available without Google credentials", () => {
    const env = readEnv(base);
    expect(googleSignInEnabled(env)).toBe(false);
    expect(googleProvider(env)).toEqual({});
  });
  it("reports incomplete credentials without exposing their values", () => {
    for (const pair of [
      { GOOGLE_CLIENT_ID: "private-client" },
      { GOOGLE_CLIENT_SECRET: "private-secret" },
    ]) {
      expect(() => readEnv({ ...base, ...pair })).toThrow(
        "requires both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET",
      );
      try {
        readEnv({ ...base, ...pair });
      } catch (error) {
        expect(String(error)).not.toContain("private-client");
        expect(String(error)).not.toContain("private-secret");
      }
    }
  });
  it("enables only the configured Google provider with basic online sign-in", () => {
    const env = readEnv({
      ...base,
      GOOGLE_CLIENT_ID: " client ",
      GOOGLE_CLIENT_SECRET: " secret ",
    });
    expect(googleSignInEnabled(env)).toBe(true);
    expect(googleProvider(env)).toEqual({
      google: {
        clientId: "client",
        clientSecret: "secret",
        prompt: "select_account",
        accessType: "online",
      },
    });
  });
});
