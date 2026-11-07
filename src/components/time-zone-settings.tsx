"use client";
import { useState } from "react";
import { Clock3, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChoiceField } from "./choice-field";
import { Button } from "./ui/button";
import { accountRequest, accountError } from "./account-api";
export function TimeZoneSettings({
  initial,
  version: initialVersion,
  options,
  previewAt,
}: {
  initial: string;
  version: number;
  options: string[];
  previewAt: string;
}) {
  const [timeZone, setTimeZone] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [version, setVersion] = useState(initialVersion);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  let preview = "Choose a recognised time zone to preview its date and time.";
  try {
    preview = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(previewAt));
  } catch {
    /* Validation also runs on the server. */
  }
  return (
    <form
      className="settings-panel mt-7"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setMessage("");
        try {
          const result = await accountRequest<{ version: number }>(
            "/api/account/time-zone",
            "PATCH",
            { timeZone, version },
          );
          setVersion(result.version);
          setSaved(timeZone);
          setMessage("Your time zone is saved across your account.");
          router.refresh();
        } catch (e) {
          setError(accountError(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <span className="settings-icon">
          <Clock3 size={20} strokeWidth={1.5} />
        </span>
        <p className="eyebrow mt-5 text-leaf">YOUR LOCAL TIME</p>
        <h2 className="mt-3 font-serif text-3xl">Dates & time zone</h2>
        <p className="mt-3 text-xs leading-7 text-muted-foreground">
          See confirmed scholarship deadlines in the time zone that works for you. Unconfirmed
          closing times stay uncertain.
        </p>
      </div>
      <div className="space-y-5">
        <ChoiceField
          label="Time zone"
          options={options}
          value={[timeZone]}
          onChange={(v) => {
            if (v[0]) setTimeZone(v[0]);
            setMessage("");
          }}
          custom
          hint="Search by city or region, for example Africa/Lagos or Europe/London."
        />
        <div className="rounded-xl border border-border bg-secondary/25 p-5">
          <p className="eyebrow text-[9px] text-muted-foreground">DATE & TIME PREVIEW</p>
          <p className="mt-3 text-sm leading-7">{preview}</p>
          <p className="mt-2 text-[10px] text-muted-foreground">Based on when this page opened.</p>
        </div>
        {error && (
          <p role="alert" className="text-xs leading-6 text-danger-foreground">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="flex items-center gap-2 text-xs leading-6 text-primary">
            <Check size={14} />
            {message}
          </p>
        )}
        <div className="flex justify-end">
          <Button disabled={busy || timeZone === saved}>
            {busy ? "Saving…" : "Save time zone"}
          </Button>
        </div>
      </div>
    </form>
  );
}
