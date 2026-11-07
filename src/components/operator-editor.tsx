"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
export function OperatorEditor({
  record,
}: {
  record?: { id: string; version: number; data: unknown };
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        const f = new FormData(e.currentTarget);
        try {
          const data = JSON.parse(String(f.get("data")));
          const input = record
            ? { id: record.id, version: record.version, data, reason: f.get("reason") }
            : {
                slug: f.get("slug"),
                cycle: f.get("cycle"),
                programmeSlug: f.get("programmeSlug"),
                providerSlug: f.get("providerSlug"),
                providerName: f.get("providerName"),
                providerUrl: f.get("providerUrl"),
                data,
                reason: f.get("reason"),
              };
          const response = await fetch("/api/operator", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: record ? "publish" : "create", input }),
          });
          const result = await response.json();
          setMessage(
            response.ok
              ? result.changed
                ? "Accepted version published. Recalculation is queued."
                : "No material changes. No event created."
              : `${result.message}${result.issues ? " " + JSON.stringify(result.issues) : ""}`,
          );
          if (response.ok) router.refresh();
        } catch {
          setMessage("Check the JSON syntax and retry. Nothing was published by this request.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {!record && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["slug", "Opportunity slug"],
            ["cycle", "Application cycle"],
            ["programmeSlug", "Programme slug"],
            ["providerSlug", "Provider slug"],
            ["providerName", "Provider name"],
            ["providerUrl", "Official provider URL"],
          ].map(([name, label]) => (
            <div key={name}>
              <label className="field-label" htmlFor={name}>
                {label}
              </label>
              <Input id={name} name={name} required />
            </div>
          ))}
        </div>
      )}
      <div>
        <label className="field-label" htmlFor={`data-${record?.id || "new"}`}>
          Structured scholarship, rules and field evidence (JSON)
        </label>
        <textarea
          id={`data-${record?.id || "new"}`}
          name="data"
          required
          rows={15}
          defaultValue={record ? JSON.stringify(record.data, null, 2) : ""}
          spellCheck={false}
          className="w-full rounded-lg border border-border bg-background p-4 font-mono text-xs leading-7 focus:border-primary/60 focus:outline-none focus:ring-3 focus:ring-primary/10"
        />
      </div>
      <div>
        <label className="field-label" htmlFor={`reason-${record?.id || "new"}`}>
          Review reason
        </label>
        <Input
          id={`reason-${record?.id || "new"}`}
          name="reason"
          minLength={10}
          required
          placeholder="Explain which official evidence supports this decision"
        />
      </div>
      <p className="text-[11px] leading-6 text-muted-foreground">
        Checked rules require matching checked field evidence and supporting wording. Missing values
        remain unknown. Publication creates an immutable version, audit entry and durable
        recalculation event.
      </p>
      <Button disabled={busy}>
        {busy ? "Validating…" : "Validate & publish accepted version"}
      </Button>
      {message && (
        <p role="status" className="break-words text-sm leading-6">
          {message}
        </p>
      )}
    </form>
  );
}
