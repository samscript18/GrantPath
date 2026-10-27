"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Clock3 } from "lucide-react";

export function VerificationResend({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [retryAt, setRetryAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [checking, setChecking] = useState(Boolean(initialEmail));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function loadCooldown(address: string, signal?: AbortSignal) {
    const response = await fetch("/api/auth/verification-cooldown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: address }),
      signal,
    });
    if (!response.ok) throw new Error("Unable to check cooldown");
    const data = await response.json();
    // Use the server duration so a different device clock cannot extend the wait.
    setRetryAt(Date.now() + data.retryAfter * 1000);
    setRemaining(data.retryAfter);
  }
  useEffect(() => {
    const abort = new AbortController();
    if (!z.email().safeParse(email).success) return;
    const timer = setTimeout(() => {
      setChecking(true);
      loadCooldown(email, abort.signal)
        .catch(() => {})
        .finally(() => {
          if (!abort.signal.aborted) setChecking(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [email]);
  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setMessage("");
        setBusy(true);
        try {
          const result = await authClient.sendVerificationEmail({ email, callbackURL: "/profile" });
          setMessage(
            result.error?.message ||
              "If this account needs verification, we’ve requested a new link. Check your inbox.",
          );
          setRetryAt(Date.now() + 120000);
          setRemaining(120);
          await loadCooldown(email);
        } catch {
          setMessage("Unable to request a verification link. Please retry.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <label className="field-label" htmlFor="verification-email">
          Email address
        </label>
        <Input
          id="verification-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setRetryAt(0);
            setRemaining(0);
            setMessage("");
            setChecking(z.email().safeParse(event.target.value).success);
          }}
        />
      </div>
      <Button className="w-full" disabled={busy || checking || remaining > 0}>
        {busy
          ? "Requesting…"
          : remaining > 0
            ? `Resend available in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
            : checking
              ? "Checking…"
              : "Resend verification link"}
      </Button>
      <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
        <Clock3 size={15} className="mt-1 shrink-0" aria-hidden="true" />
        For your security, wait two minutes between verification requests. Refreshing this page does
        not reset the wait.
      </p>
      {message && (
        <p role="status" className="text-sm leading-6">
          {message}
        </p>
      )}
      <Link href="/login" className="block text-center text-sm underline underline-offset-4">
        Back to sign in
      </Link>
    </form>
  );
}
