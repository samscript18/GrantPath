"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import type { Preferences } from "@/server/notifications";
import { Switch } from "./ui/switch";
export function NotificationPreferences({ preferences }: { preferences: Preferences }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(preferences);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const f = new FormData(e.currentTarget);
        const preferences = Object.fromEntries(
          ["newMatch", "change", "deadline", "inApp", "email"].map((key) => [
            key,
            f.get(key) === "on",
          ]),
        );
        try {
          const r = await fetch("/api/notifications", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "preferences", preferences }),
          });
          const body = await r.json();
          setMessage(
            r.ok
              ? "Preferences saved. Queued alerts use these settings before delivery."
              : body.message,
          );
        } catch {
          setMessage("Couldn’t save. Please retry.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset className="space-y-0">
        <legend className="eyebrow mb-2 text-muted-foreground">UPDATES THAT MATTER TO YOU</legend>
        {(
          [
            [
              "newMatch",
              "New relevant opportunities",
              "New potential or eligible matches with an open or upcoming cycle.",
            ],
            [
              "change",
              "Accepted scholarship changes",
              "Reviewed updates for opportunities you have saved.",
            ],
            [
              "deadline",
              "Deadline reminders",
              "Seven days and one day before a confirmed closing instant.",
            ],
          ] as const
        ).map(([name, label, description]) => (
          <div
            key={name}
            className="flex items-center justify-between gap-6 border-b border-border/70 py-6 last:border-0"
          >
            <span>
              <span className="block text-[13px] font-semibold">{label}</span>
              <span className="mt-1.5 block max-w-md text-xs leading-6 text-muted-foreground">
                {description}
              </span>
            </span>
            <Switch
              name={name}
              label={label}
              checked={draft[name]}
              disabled={busy}
              onCheckedChange={(value) => setDraft({ ...draft, [name]: value })}
            />
          </div>
        ))}
      </fieldset>
      <fieldset className="mt-5 space-y-5 border-t border-border pt-6">
        <legend className="eyebrow pr-4 text-muted-foreground">WHERE YOU HEAR FROM US</legend>
        {(
          [
            ["inApp", "In-app inbox"],
            ["email", "Email"],
          ] as const
        ).map(([name, label]) => (
          <div key={name} className="flex items-center justify-between gap-4 text-xs">
            <span>{label}</span>
            <Switch
              name={name}
              label={label}
              checked={draft[name]}
              disabled={busy}
              onCheckedChange={(value) => setDraft({ ...draft, [name]: value })}
            />
          </div>
        ))}
      </fieldset>
      <p className="mt-6 max-w-lg text-[11px] leading-6 text-muted-foreground">
        Account verification and security emails remain on to help keep your account safe.
      </p>
      <Button className="mt-6 w-full sm:w-auto" disabled={busy}>
        {busy ? "Saving…" : "Save my preferences"}
      </Button>
      {message && (
        <p role="status" className="mt-3 text-xs leading-6">
          {message}
        </p>
      )}
    </form>
  );
}
export function MarkRead({ id }: { id?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <button
        className="text-[11px] underline underline-offset-4 disabled:opacity-50"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await fetch("/api/notifications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "read", id }),
            });
            if (r.ok) router.refresh();
            else setMessage("Couldn’t mark this read. Retry in a moment.");
          } catch {
            setMessage("Couldn’t mark this read. Retry in a moment.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Updating…" : id ? "Mark as read" : "Mark all as read"}
      </button>
      {message && (
        <p role="status" className="mt-2 text-xs">
          {message}
        </p>
      )}
    </div>
  );
}
