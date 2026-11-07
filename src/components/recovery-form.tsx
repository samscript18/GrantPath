"use client";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { PasswordInput } from "./password-input";
import { PasswordRequirements } from "./password-requirements";
import { passwordConfirmationSchema } from "@/lib/password";
export function RecoveryForm({ reset = false }: { reset?: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [validation, setValidation] = useState("");
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setValidation("");
        if (reset) {
          const checked = passwordConfirmationSchema.safeParse({
            password,
            confirmPassword: confirmation,
          });
          if (!checked.success) {
            setValidation(checked.error.issues[0].message);
            return;
          }
        }
        setBusy(true);
        setMessage("");
        const form = new FormData(e.currentTarget);
        try {
          const token = new URLSearchParams(window.location.search).get("token") || "";
          const result = reset
            ? await authClient.resetPassword({ newPassword: password, token })
            : await authClient.requestPasswordReset({
                email: String(form.get("email")),
                redirectTo: "/reset-password",
              });
          setMessage(
            result.error
              ? result.error.message || "Please try again."
              : reset
                ? "Password updated. You can now sign in."
                : "If this address is registered, we’ve requested a link. Check your inbox; you can retry if it doesn’t arrive.",
          );
        } catch {
          setMessage("Unable to request a link. Please retry.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {reset ? (
        <>
          <div>
            <label className="field-label" htmlFor="password">
              New password
            </label>
            <PasswordInput
              id="password"
              name="password"
              label="New password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="reset-password-checklist reset-validation"
              aria-invalid={!!validation}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="confirm-password">
              Confirm password
            </label>
            <PasswordInput
              id="confirm-password"
              name="confirmPassword"
              label="Confirm password"
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              aria-describedby="reset-validation"
              aria-invalid={!!validation}
            />
          </div>
          <PasswordRequirements
            id="reset-password-checklist"
            password={password}
            confirmation={confirmation}
          />
          {validation && (
            <p id="reset-validation" role="alert" className="text-sm text-danger-foreground">
              {validation}
            </p>
          )}
        </>
      ) : (
        <div>
          <label className="field-label" htmlFor="email">
            Email address
          </label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
      )}
      <Button className="w-full" disabled={busy}>
        {busy ? "One moment…" : reset ? "Update password" : "Request recovery link"}
      </Button>
      {message && (
        <p role="status" className="text-sm leading-6">
          {message}
        </p>
      )}
      <Link className="block text-center text-sm underline underline-offset-4" href="/login">
        Back to sign in
      </Link>
    </form>
  );
}
