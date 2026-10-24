"use client";
import { useEffect, useState } from "react";
import { MailCheck, ShieldCheck } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
export type Challenge = {
  id: string;
  purpose: "password" | "deletion";
  expiresAt: string;
  resendAt: string;
  emailState: string;
};
export function SecurityCode({
  challenge,
  email,
  code,
  onCode,
  busy,
  onResend,
  onBack,
  children,
}: {
  challenge: Challenge;
  email: string;
  code: string;
  onCode: (value: string) => void;
  busy: boolean;
  onResend?: () => void;
  onBack: () => void;
  children?: React.ReactNode;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining =
    now === null ? null : Math.max(0, Math.ceil((Date.parse(challenge.resendAt) - now) / 1000));
  const expired = now !== null && now >= Date.parse(challenge.expiresAt);
  return (
    <div className="rounded-xl border border-primary/20 bg-secondary/30 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-primary/10 p-2.5 text-primary">
          <MailCheck size={20} strokeWidth={1.5} />
        </span>
        <div>
          <h3 className="text-sm font-semibold">Check your email</h3>
          <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
            {challenge.emailState === "accepted"
              ? "Your code was accepted by our email provider for delivery to "
              : challenge.emailState === "captured"
                ? "Development email captured for "
                : challenge.emailState === "failed"
                  ? "We couldn’t send the verification email to "
                  : challenge.emailState === "retrying"
                    ? "Email delivery is being retried for "
                    : "Your verification email is queued for "}
            <span className="break-all font-medium text-foreground">{email}</span>.
          </p>
        </div>
      </div>
      {challenge.emailState === "failed" && (
        <p role="alert" className="mt-3 text-xs leading-6 text-danger-foreground">
          Sending needs attention. You can request a fresh code after the countdown or contact the
          administrator.
        </p>
      )}
      <label className="field-label mt-5" htmlFor={`code-${challenge.purpose}`}>
        Six-digit verification code
      </label>
      <Input
        id={`code-${challenge.purpose}`}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        value={code}
        onChange={(e) => onCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        disabled={busy || expired}
        className="max-w-64 font-mono text-xl tracking-[0.5em]"
        aria-describedby={`code-note-${challenge.purpose}`}
      />
      <p
        id={`code-note-${challenge.purpose}`}
        className="mt-3 flex items-start gap-2 text-[11px] leading-6 text-muted-foreground"
      >
        <ShieldCheck size={14} className="mt-1 shrink-0" />
        {expired
          ? "This code has expired. Start again to request a new one."
          : "Valid for 10 minutes in this session. Never share this code."}
      </p>
      {children}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-primary/10 pt-4">
        {onResend && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || remaining === null || remaining > 0}
            onClick={onResend}
          >
            {remaining === null
              ? "Resend code"
              : remaining > 0
                ? `Resend in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
                : "Resend code"}
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={onBack} disabled={busy}>
          Start again
        </Button>
      </div>
    </div>
  );
}
