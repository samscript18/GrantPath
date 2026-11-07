"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck, Monitor, LogOut, RefreshCw } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { passwordConfirmationSchema } from "@/lib/password";
import { PasswordInput } from "./password-input";
import { PasswordRequirements } from "./password-requirements";
import { Button } from "./ui/button";
import { accountRequest, accountError } from "./account-api";
import { SecurityCode, type Challenge } from "./security-code";
export type SessionInfo = {
  id: string;
  current: boolean;
  device: string;
  browser: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};
export function AccountSecurity({
  method,
  email,
  initialSessions,
  timeZone,
}: {
  method: string;
  email: string;
  initialSessions: SessionInfo[];
  timeZone: string;
}) {
  const router = useRouter();
  const [currentPassword, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmation] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState(initialSessions);
  const [sessionBusy, setSessionBusy] = useState("");
  const [sessionMessage, setSessionMessage] = useState("");
  const [allConfirmation, setAllConfirmation] = useState(false);
  const [sessionError, setSessionError] = useState("");
  useEffect(() => {
    let stopped = false;
    accountRequest<Challenge[]>("/api/account/security")
      .then((rows) => {
        if (!stopped) setChallenge(rows.find((c) => c.purpose === "password") || null);
      })
      .catch((e) => {
        if (!stopped) setError(accountError(e));
      });
    return () => {
      stopped = true;
    };
  }, []);
  useEffect(() => {
    if (!challenge || !["queued", "retrying"].includes(challenge.emailState)) return;
    const timer = setInterval(() => {
      accountRequest<Challenge[]>("/api/account/security")
        .then((rows) => {
          const row = rows.find((c) => c.id === challenge.id);
          if (row) setChallenge(row);
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, [challenge]);
  async function finishSignOut(passwordChanged = false) {
    try {
      await authClient.signOut();
    } catch {
      /* Database sessions are already revoked. */
    }
    router.replace(passwordChanged ? "/login?passwordChanged=1" : "/login");
    router.refresh();
  }
  async function requestCode() {
    setError("");
    const parsed = passwordConfirmationSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Check your new password.");
      return;
    }
    setBusy(true);
    try {
      setChallenge(
        await accountRequest<Challenge>("/api/account/security", "POST", {
          purpose: "password",
          currentPassword,
          password,
          confirmPassword,
        }),
      );
      setCode("");
    } catch (e) {
      setError(accountError(e));
    } finally {
      setBusy(false);
    }
  }
  async function confirmCode() {
    if (!challenge) return;
    setBusy(true);
    setError("");
    try {
      await accountRequest("/api/account/security", "PUT", {
        id: challenge.id,
        purpose: "password",
        code,
      });
      setCurrent("");
      setPassword("");
      setConfirmation("");
      await finishSignOut(true);
    } catch (e) {
      setError(accountError(e));
      setBusy(false);
    }
  }
  async function revoke(input: { all: true } | { id: string }) {
    setSessionBusy("all" in input ? "all" : input.id);
    setSessionError("");
    setSessionMessage("");
    try {
      const result = await accountRequest<{ signedOut: boolean }>(
        "/api/account/sessions",
        "DELETE",
        input,
      );
      if (result.signedOut) {
        await finishSignOut();
        return;
      }
      setSessions(await accountRequest<SessionInfo[]>("/api/account/sessions"));
      setSessionMessage("That session has been signed out.");
    } catch (e) {
      setSessionError(accountError(e));
    } finally {
      setSessionBusy("");
      setAllConfirmation(false);
    }
  }
  const formatted = (date: string) =>
    new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone }).format(
      new Date(date),
    );
  return (
    <div className="space-y-6">
      <section className="settings-panel">
        <div>
          <span className="settings-icon">
            <KeyRound size={20} strokeWidth={1.5} />
          </span>
          <p className="eyebrow mt-5 text-leaf">PASSWORD</p>
          <h2 className="mt-3 font-serif text-3xl">A fresh layer of security.</h2>
          <p className="mt-3 text-xs leading-7 text-muted-foreground">
            {method === "google"
              ? "Google manages your sign-in credentials."
              : "Verify your current password, then confirm a code sent to your email."}
          </p>
        </div>
        {method === "google" ? (
          <div className="rounded-xl border border-border bg-secondary/30 p-6">
            <ShieldCheck size={25} className="text-leaf" strokeWidth={1.4} />
            <h3 className="mt-4 text-sm font-semibold">Connected with Google</h3>
            <p className="mt-3 text-xs leading-7 text-muted-foreground">
              Your account uses Google only. You can manage your password and two-step verification
              in your Google account.
            </p>
            <Button asChild variant="outline" className="mt-5">
              <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer">
                Open Google security
              </a>
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (challenge) void confirmCode();
              else void requestCode();
            }}
            className="min-w-0 space-y-5"
          >
            {!challenge ? (
              <>
                <div>
                  <label className="field-label" htmlFor="current-password">
                    Current password
                  </label>
                  <PasswordInput
                    id="current-password"
                    label="Current password"
                    autoComplete="current-password"
                    required
                    maxLength={128}
                    value={currentPassword}
                    onChange={(e) => setCurrent(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="field-label" htmlFor="new-password">
                      New password
                    </label>
                    <PasswordInput
                      id="new-password"
                      label="New password"
                      autoComplete="new-password"
                      required
                      maxLength={128}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={busy}
                      aria-describedby="change-password-requirements"
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="confirm-new-password">
                      Confirm new password
                    </label>
                    <PasswordInput
                      id="confirm-new-password"
                      label="Confirm new password"
                      autoComplete="new-password"
                      required
                      maxLength={128}
                      value={confirmPassword}
                      onChange={(e) => setConfirmation(e.target.value)}
                      disabled={busy}
                      aria-describedby="change-password-requirements"
                    />
                  </div>
                </div>
                <PasswordRequirements
                  id="change-password-requirements"
                  password={password}
                  confirmation={confirmPassword}
                />
              </>
            ) : (
              <SecurityCode
                challenge={challenge}
                email={email}
                code={code}
                onCode={setCode}
                busy={busy}
                onResend={currentPassword && password ? () => void requestCode() : undefined}
                onBack={() => {
                  setChallenge(null);
                  setCode("");
                  setError("");
                }}
              />
            )}
            <p className="flex gap-2 rounded-lg border border-primary/20 px-4 py-3 text-[11px] leading-6 text-muted-foreground">
              <ShieldCheck size={15} className="mt-1 shrink-0 text-leaf" />
              After the code is confirmed, your password changes and all devices are signed out.
              You’ll sign in again with your new password.
            </p>
            {error && (
              <p role="alert" className="text-xs leading-6 text-danger-foreground">
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <Button disabled={busy || (!!challenge && code.length !== 6)}>
                {busy
                  ? "Please wait…"
                  : challenge
                    ? "Verify & change password"
                    : "Send verification code"}
              </Button>
            </div>
          </form>
        )}
      </section>
      <section className="paper p-6 sm:p-8 xl:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-leaf">YOUR DEVICES</p>
            <h2 className="mt-3 font-serif text-3xl">Active sessions</h2>
            <p className="mt-3 max-w-2xl text-xs leading-7 text-muted-foreground">
              Review where you’re signed in. Device labels come from browser information; IP
              addresses stay hidden. Times shown in {timeZone}.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!!sessionBusy}
            onClick={async () => {
              setSessionBusy("refresh");
              setSessionError("");
              try {
                setSessions(await accountRequest<SessionInfo[]>("/api/account/sessions"));
                setSessionMessage("Session list refreshed.");
              } catch (e) {
                setSessionError(accountError(e));
              } finally {
                setSessionBusy("");
              }
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {sessions.map((s) => (
            <article
              key={s.id}
              className={`overflow-hidden rounded-xl border ${s.current ? "border-primary/30 bg-secondary/15" : "border-border bg-background/60"}`}
            >
              <div className="flex items-center gap-3 border-b border-border bg-secondary/25 p-5">
                <span className="settings-icon">
                  <Monitor size={20} strokeWidth={1.5} />
                </span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">{s.device}</h3>
                  <p className="mt-1 text-[11px] text-muted-foreground">{s.browser}</p>
                </div>
                {s.current && (
                  <span className="flex items-center gap-1.5 rounded-full border border-primary/20 px-2 py-1 text-[10px] text-primary">
                    <ShieldCheck size={12} />
                    This device
                  </span>
                )}
              </div>
              <dl className="grid grid-cols-1 gap-px bg-border min-[460px]:grid-cols-2">
                {[
                  ["Session opened", s.createdAt],
                  ["Last session refresh", s.updatedAt],
                  ["Expires", s.expiresAt],
                ].map(([label, value]) => (
                  <div key={label} className="bg-paper p-4">
                    <dt className="eyebrow text-[9px] text-muted-foreground">{label}</dt>
                    <dd className="mt-2 text-xs leading-6">{formatted(value)}</dd>
                  </div>
                ))}
                <div className="bg-paper p-4">
                  <dt className="eyebrow text-[9px] text-muted-foreground">Access</dt>
                  <dd className="mt-2 text-xs leading-6">Signed in</dd>
                </div>
              </dl>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
                <p className="text-[10px] leading-5 text-muted-foreground">
                  {s.current
                    ? "This signs you out on this device."
                    : "This ends access on that device."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!sessionBusy}
                  onClick={() => void revoke({ id: s.id })}
                >
                  <LogOut size={13} />
                  {sessionBusy === s.id ? "Signing out…" : "Sign out device"}
                </Button>
              </div>
            </article>
          ))}
        </div>
        {!sessions.length && (
          <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No active sessions were returned. Refresh to retrieve the latest list.
          </p>
        )}
        <p className="mt-4 text-[10px] leading-6 text-muted-foreground">
          Session refresh is recorded periodically and is not an exact last-activity time. Up to 100
          most recent sessions are shown.
        </p>
        {sessionError && (
          <p role="alert" className="mt-4 text-xs text-danger-foreground">
            {sessionError}
          </p>
        )}
        {sessionMessage && (
          <p role="status" className="mt-4 text-xs text-primary">
            {sessionMessage}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-6">
          {allConfirmation ? (
            <>
              <p className="text-xs text-muted-foreground">
                Sign out every device, including this one?
              </p>
              <Button
                variant="ghost"
                onClick={() => setAllConfirmation(false)}
                disabled={!!sessionBusy}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => void revoke({ all: true })}
                disabled={!!sessionBusy}
              >
                Confirm sign out
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="border-danger-foreground/35 text-danger-foreground"
              onClick={() => setAllConfirmation(true)}
              disabled={!!sessionBusy}
            >
              <LogOut size={15} />
              Sign out everywhere
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
