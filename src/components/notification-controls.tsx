"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import type { Preferences } from "@/server/notifications";
export function NotificationPreferences({ preferences }: { preferences: Preferences }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
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
          if (r.ok) router.refresh();
        } catch {
          setMessage("Couldn’t save. Please retry.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset className="space-y-4">
        <legend className="eyebrow mb-5 text-muted-foreground">UPDATES THAT MATTER TO YOU</legend>
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
          <label key={name} className="flex items-start gap-3">
            <input
              className="mt-1 accent-primary"
              type="checkbox"
              name={name}
              defaultChecked={preferences[name]}
            />
            <span>
              <span className="block text-xs font-semibold">{label}</span>
              <span className="mt-1 block text-[11px] leading-6 text-muted-foreground">
                {description}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <fieldset className="mt-6 space-y-4 border-t border-border pt-5">
        <legend className="eyebrow px-1 text-muted-foreground">WHERE YOU HEAR FROM US</legend>
        <label className="flex items-center gap-3 text-xs">
          <input
            type="checkbox"
            name="inApp"
            defaultChecked={preferences.inApp}
            className="accent-primary"
          />
          In-app inbox
        </label>
        <label className="flex items-center gap-3 text-xs">
          <input
            type="checkbox"
            name="email"
            defaultChecked={preferences.email}
            className="accent-primary"
          />
          Email
        </label>
      </fieldset>
      <p className="mt-5 text-[10px] leading-6 text-muted-foreground">
        Account verification and security messages are separate. Email provider acceptance does not
        prove receipt. Unknown closing times do not produce reminders.
      </p>
      <Button className="mt-5 w-full" disabled={busy}>
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
