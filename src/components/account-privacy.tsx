"use client";
import { useEffect, useState } from "react";
import { Download, FileJson, ShieldCheck, Trash2, Clock3, CircleCheck } from "lucide-react";
import { accountRequest, accountError } from "./account-api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { SecurityCode, type Challenge } from "./security-code";
export type PrivacyState = {
  deletion: { createdAt: string; scheduledAt: string } | null;
  exports: {
    id: string;
    state: string;
    createdAt: string;
    expiresAt: string;
    error: string | null;
  }[];
};
export function AccountPrivacy({
  email,
  initial,
  timeZone,
}: {
  email: string;
  initial: PrivacyState;
  timeZone: string;
}) {
  const [data, setData] = useState(initial);
  const [download, setDownload] = useState<{ id: string; token: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [exportError, setExportError] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const [deletionError, setDeletionError] = useState("");
  const [deletionMessage, setDeletionMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [stale, setStale] = useState(false);
  useEffect(() => {
    let mounted = true;
    accountRequest<Challenge[]>("/api/account/security")
      .then((rows) => {
        if (mounted) {
          const row = rows.find((c) => c.purpose === "deletion");
          if (row) {
            setChallenge(row);
            setOpen(true);
          }
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (!download && !challenge && !data.deletion) return;
    let mounted = true;
    const refresh = async () => {
      try {
        const next = await accountRequest<PrivacyState>("/api/account/privacy");
        if (mounted) {
          setData(next);
          setStale(false);
        }
        if (challenge && ["queued", "retrying"].includes(challenge.emailState)) {
          const rows = await accountRequest<Challenge[]>("/api/account/security");
          const row = rows.find((c) => c.id === challenge.id);
          if (mounted && row) setChallenge(row);
        }
      } catch {
        if (mounted) setStale(true);
      }
    };
    const timer = setInterval(() => void refresh(), 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [download, challenge, data.deletion]);
  async function request() {
    setBusy("export");
    setExportError("");
    setExportMessage("");
    try {
      const result = await accountRequest<{ id: string; token: string }>(
        "/api/account/export",
        "POST",
      );
      setDownload(result);
      setData(await accountRequest<PrivacyState>("/api/account/privacy"));
    } catch (e) {
      setExportError(accountError(e));
    } finally {
      setBusy("");
    }
  }
  async function downloadFile() {
    if (!download) return;
    setBusy("download");
    setExportError("");
    try {
      const response = await fetch("/api/account/export/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(download),
        cache: "no-store",
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "grantpath-account.json";
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setDownload(null);
      setExportMessage(
        "Your one-time download was sent to your browser. Keep the file somewhere private.",
      );
      setData(await accountRequest<PrivacyState>("/api/account/privacy"));
    } catch (e) {
      setExportError(accountError(e));
    } finally {
      setBusy("");
    }
  }
  async function deletionCode() {
    setBusy("deletion-code");
    setDeletionError("");
    try {
      setChallenge(
        await accountRequest<Challenge>("/api/account/security", "POST", { purpose: "deletion" }),
      );
      setCode("");
    } catch (e) {
      setDeletionError(accountError(e));
    } finally {
      setBusy("");
    }
  }
  async function confirmDeletion() {
    if (!challenge) return;
    setBusy("deletion");
    setDeletionError("");
    try {
      await accountRequest("/api/account/security", "PUT", {
        id: challenge.id,
        purpose: "deletion",
        code,
        confirmation,
      });
      setData(await accountRequest<PrivacyState>("/api/account/privacy"));
      setOpen(false);
      setChallenge(null);
      setCode("");
      setConfirmation("");
      setDeletionMessage("Deletion requested. You can cancel during the seven-day window below.");
    } catch (e) {
      setDeletionError(accountError(e));
    } finally {
      setBusy("");
    }
  }
  async function cancel() {
    setBusy("cancel");
    setDeletionError("");
    try {
      await accountRequest("/api/account/privacy", "DELETE");
      setData(await accountRequest<PrivacyState>("/api/account/privacy"));
      setDeletionMessage("Your deletion request was cancelled. Your account stays available.");
    } catch (e) {
      setDeletionError(accountError(e));
    } finally {
      setBusy("");
    }
  }
  const formatted = (date: string) =>
    new Intl.DateTimeFormat("en", { timeZone, dateStyle: "long", timeStyle: "short" }).format(
      new Date(date),
    );
  const currentExport = download ? data.exports.find((e) => e.id === download.id) : null;
  return (
    <div className="space-y-6">
      {stale && (
        <p
          role="status"
          className="rounded-xl border border-accent/30 bg-warning px-5 py-3 text-xs leading-6"
        >
          Status couldn’t refresh. Last retrieved information is shown; check your connection before
          continuing.
        </p>
      )}
      <section className="settings-panel">
        <div>
          <span className="settings-icon">
            <FileJson size={21} strokeWidth={1.5} />
          </span>
          <p className="eyebrow mt-5 text-leaf">TAKE A COPY</p>
          <h2 className="mt-3 font-serif text-3xl">Your data, to go.</h2>
          <p className="mt-3 text-xs leading-7 text-muted-foreground">
            Download the information that makes this workspace yours.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Account export</h3>
          <p className="mt-3 text-xs leading-7 text-muted-foreground">
            We prepare a JSON file with your account, study profile and history, saved
            opportunities, application notes, evaluations, preferences and notification records.
            Passwords, sign-in tokens and verification codes are excluded.
          </p>
          <div className="mt-5 flex gap-3 rounded-xl border border-border bg-secondary/25 p-4">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-leaf" />
            <p className="text-[11px] leading-6 text-muted-foreground">
              Your export is encrypted while stored. Its download key stays only in this open page,
              and works once for 24 hours. The downloaded JSON is readable; store it privately.
              Leaving or reloading this page loses the key.
            </p>
          </div>
          {download && (
            <div className="mt-5 rounded-xl border border-primary/20 p-5">
              <p role="status" className="flex items-center gap-2 text-sm font-medium">
                {currentExport?.state === "ready" ? (
                  <CircleCheck size={17} className="text-leaf" />
                ) : (
                  <Clock3 size={17} className="text-leaf" />
                )}
                {currentExport?.state === "ready"
                  ? "Your export is ready"
                  : currentExport?.state === "expired"
                    ? "This export has expired"
                    : currentExport?.state === "failed"
                      ? "Export preparation needs attention"
                      : "Preparing your account export…"}
              </p>
              <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
                {currentExport?.error ||
                  "Keep this page open. Preparation runs in the background; interrupted jobs remain queued for the account worker."}
              </p>
              {currentExport?.state === "ready" && (
                <Button className="mt-4" onClick={() => void downloadFile()} disabled={!!busy}>
                  <Download size={15} />
                  {busy === "download" ? "Downloading…" : "Download JSON once"}
                </Button>
              )}
            </div>
          )}
          {exportError && (
            <p role="alert" className="mt-4 text-xs leading-6 text-danger-foreground">
              {exportError}
            </p>
          )}
          {exportMessage && (
            <p role="status" className="mt-4 text-xs leading-6 text-primary">
              {exportMessage}
            </p>
          )}
          <div className="mt-6 flex justify-end">
            <Button
              variant={download ? "outline" : "default"}
              onClick={() => void request()}
              disabled={!!busy}
            >
              {busy === "export"
                ? "Requesting…"
                : download
                  ? "Request a new export"
                  : "Request account export"}
            </Button>
          </div>
          {!download && data.exports.length > 0 && (
            <p className="mt-4 text-[10px] leading-6 text-muted-foreground">
              Last request: {formatted(data.exports[0].createdAt)} · {data.exports[0].state}. If you
              left the page before downloading, request a new copy after the five-minute cooldown.
            </p>
          )}
        </div>
      </section>
      <section className="settings-panel border-danger-foreground/20">
        <div>
          <span className="settings-icon border-danger-foreground/15 bg-danger/5 text-danger-foreground">
            <Trash2 size={20} strokeWidth={1.5} />
          </span>
          <p className="eyebrow mt-5 text-danger-foreground">LEAVING GRANTPATH</p>
          <h2 className="mt-3 font-serif text-3xl">Close your account.</h2>
          <p className="mt-3 text-xs leading-7 text-muted-foreground">
            A considered goodbye, with time to change your mind.
          </p>
        </div>
        <div>
          {data.deletion ? (
            <div className="rounded-xl border border-danger-foreground/20 bg-danger/5 p-5">
              <h3 className="text-sm font-semibold">Deletion requested</h3>
              <p className="mt-3 text-xs leading-7">
                You can cancel until <strong>{formatted(data.deletion.scheduledAt)}</strong> (
                {timeZone}). After that, sign-in is blocked and a background worker erases the
                account and queues removal of its uploaded photos.
              </p>
              <p className="mt-3 text-[11px] leading-6 text-muted-foreground">
                The date is the end of your cancellation window. Erasure depends on the next
                successful worker run; it is not an exact completion time.
              </p>
              <Button
                className="mt-5"
                variant="outline"
                onClick={() => void cancel()}
                disabled={!!busy}
              >
                {busy === "cancel" ? "Cancelling…" : "Cancel deletion request"}
              </Button>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-semibold">Account deletion</h3>
              <p className="mt-3 text-xs leading-7 text-muted-foreground">
                Confirm an email code to request deletion. You have seven days to cancel from this
                page. After the cancellation window, your profile, application notes, matches,
                notifications and sign-in access are removed by the account worker. Uploaded photos
                are queued for Cloudinary deletion.
              </p>
              <p className="mt-3 text-[11px] leading-6 text-muted-foreground">
                Shared scholarship evidence stays available with operator attribution anonymised.
                Hosting/database backups and email already accepted by the provider follow those
                providers’ retention policies.
              </p>
              {open ? (
                <form
                  className="mt-5 space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (challenge) void confirmDeletion();
                    else void deletionCode();
                  }}
                >
                  {challenge ? (
                    <SecurityCode
                      challenge={challenge}
                      email={email}
                      code={code}
                      onCode={setCode}
                      busy={!!busy}
                      onResend={() => void deletionCode()}
                      onBack={() => {
                        setChallenge(null);
                        setCode("");
                      }}
                    >
                      <label className="field-label mt-5" htmlFor="deletion-confirmation">
                        Type DELETE to confirm
                      </label>
                      <Input
                        id="deletion-confirmation"
                        autoComplete="off"
                        value={confirmation}
                        onChange={(e) => setConfirmation(e.target.value)}
                        required
                        pattern="DELETE"
                        disabled={!!busy}
                      />
                    </SecurityCode>
                  ) : (
                    <p className="rounded-lg border border-border p-4 text-xs leading-7">
                      We’ll send a verification code to{" "}
                      <strong className="break-all">{email}</strong>. Your account stays available
                      during the cancellation window.
                    </p>
                  )}
                  <div className="flex flex-wrap justify-end gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={!!busy}
                      onClick={() => {
                        setOpen(false);
                        setChallenge(null);
                        setCode("");
                        setConfirmation("");
                      }}
                    >
                      Keep my account
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={
                        !!busy || (!!challenge && (code.length !== 6 || confirmation !== "DELETE"))
                      }
                    >
                      {busy
                        ? "Please wait…"
                        : challenge
                          ? "Verify & request deletion"
                          : "Email verification code"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="mt-6 flex justify-end">
                  <Button
                    variant="outline"
                    className="border-danger-foreground/35 text-danger-foreground"
                    onClick={() => {
                      setOpen(true);
                      setDeletionError("");
                    }}
                    disabled={!!busy}
                  >
                    Request account deletion
                  </Button>
                </div>
              )}
            </>
          )}
          {deletionError && (
            <p role="alert" className="mt-4 text-xs leading-6 text-danger-foreground">
              {deletionError}
            </p>
          )}
          {deletionMessage && (
            <p role="status" className="mt-4 text-xs leading-6 text-primary">
              {deletionMessage}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
