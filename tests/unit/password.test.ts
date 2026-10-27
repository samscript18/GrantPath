import { describe, expect, it } from "vitest";
import {
  newPasswordSchema,
  passwordConfirmationSchema,
  passwordRequirements,
} from "../../src/lib/password";

describe("shared new password policy", () => {
  it.each([
    ["Aa1-aaaaa", "length"],
    ["Aa1-" + "a".repeat(125), "length"],
    ["AA1-AAAAAA", "lowercase"],
    ["aa1-aaaaaa", "uppercase"],
    ["Aa--aaaaaa", "number"],
    ["Aa11aaaaaa", "symbol"],
    ["Aa11 aaaaa", "symbol"],
  ])("rejects %s when %s is unmet", (password, requirement) => {
    expect(newPasswordSchema.safeParse(password).success).toBe(false);
    expect(passwordRequirements.find((rule) => rule.id === requirement)!.met(password)).toBe(false);
  });
  it("accepts both length boundaries, preserves whitespace, and requires matching confirmation", () => {
    for (const password of ["Aa1-aaaaaa", "Aa1-" + "a".repeat(124), " Aa1-aaaaaa "]) {
      expect(newPasswordSchema.parse(password)).toBe(password);
      expect(
        passwordConfirmationSchema.safeParse({ password, confirmPassword: password }).success,
      ).toBe(true);
      const mismatch = passwordConfirmationSchema.safeParse({
        password,
        confirmPassword: password + "x",
      });
      expect(mismatch.success).toBe(false);
      if (!mismatch.success) expect(mismatch.error.issues[0].path).toEqual(["confirmPassword"]);
    }
    expect(
      passwordConfirmationSchema.safeParse({ password: "", confirmPassword: "" }).success,
    ).toBe(false);
  });
});
