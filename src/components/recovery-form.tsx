"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
export function RecoveryForm({ reset = false, verify = false }: { reset?: boolean; verify?: boolean }) {
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  return <form className="space-y-5" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(e.currentTarget);
    try {
      const token = new URLSearchParams(window.location.search).get("token") || "";
      const result = reset ? await authClient.resetPassword({ newPassword: String(form.get("password")), token }) : verify ? await authClient.sendVerificationEmail({ email: String(form.get("email")), callbackURL: "/profile" }) : await authClient.requestPasswordReset({ email: String(form.get("email")), redirectTo: "/reset-password" });
      setMessage(result.error ? result.error.message || "Please try again." : reset ? "Password updated. You can now sign in." : "If this address is registered, we’ve requested a link. Check your inbox; you can retry if it doesn’t arrive.");
    } catch { setMessage("Unable to request a link. Please retry."); } finally { setBusy(false); }
  }}><label className="field-label" htmlFor={reset ? "password" : "email"}>{reset ? "New password" : "Email address"}</label><Input id={reset ? "password" : "email"} name={reset ? "password" : "email"} type={reset ? "password" : "email"} required minLength={reset ? 10 : undefined} autoComplete={reset ? "new-password" : "email"} /><Button className="w-full" disabled={busy}>{busy ? "One moment…" : reset ? "Update password" : verify ? "Resend verification link" : "Request recovery link"}</Button>{message && <p role="status" className="text-sm leading-6">{message}</p>}<a className="block text-center text-sm underline" href="/login">Back to sign in</a></form>;
}
