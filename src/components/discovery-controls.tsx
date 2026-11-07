"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
export function DiscoveryControls({
  directory,
  candidate,
  observation,
}: {
  directory?: { id: string; enabled: boolean; autoPublish: boolean };
  candidate?: string;
  observation?: { id: string; data: unknown };
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  async function send(body: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/operator/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await r.json();
      setMessage(r.ok ? "Decision saved." : result.message || "Request failed.");
      if (r.ok) router.refresh();
    } catch {
      setMessage("Could not save. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        let data: unknown;
        try {
          if (observation && f.get("data")) data = JSON.parse(String(f.get("data")));
        } catch {
          setMessage("Candidate JSON is invalid.");
          return;
        }
        void send(
          directory
            ? {
                action: "configure",
                id: directory.id,
                enabled: f.get("enabled") === "on",
                autoPublish: f.get("automatic") === "on",
                reason: String(f.get("reason")),
              }
            : observation
              ? {
                  action: "decide",
                  id: observation.id,
                  decision: String(f.get("decision")),
                  reason: String(f.get("reason")),
                  data,
                }
              : { action: "retry", id: candidate, reason: String(f.get("reason")) },
        );
      }}
    >
      {directory && (
        <div className="flex flex-wrap gap-5 text-xs">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="enabled" defaultChecked={directory.enabled} />
            Source enabled
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="automatic" defaultChecked={directory.autoPublish} />
            Validated automatic publication
          </label>
        </div>
      )}
      {observation && (
        <>
          <label className="field-label">
            Review decision
            <select className="input mt-2" name="decision">
              <option value="reject">Reject candidate</option>
              <option value="accept">Accept reviewed candidate</option>
            </select>
          </label>
          <details>
            <summary className="cursor-pointer text-xs underline">
              Inspect or correct candidate JSON
            </summary>
            <label className="sr-only" htmlFor={`data-${observation.id}`}>
              Reviewed candidate JSON
            </label>
            <textarea
              id={`data-${observation.id}`}
              name="data"
              className="input mt-3 min-h-52 w-full font-mono text-xs"
              defaultValue={JSON.stringify(observation.data, null, 2)}
            />
          </details>
        </>
      )}
      <label
        className="field-label"
        htmlFor={`reason-${directory?.id || candidate || observation?.id}`}
      >
        Reason
      </label>
      <Input
        id={`reason-${directory?.id || candidate || observation?.id}`}
        name="reason"
        minLength={10}
        maxLength={1000}
        required
        placeholder="Record the source policy or evidence reviewed"
      />
      <Button size="sm" variant="outline" disabled={busy}>
        {busy
          ? "Saving…"
          : directory
            ? "Save source policy"
            : observation
              ? "Save review decision"
              : "Retry bounded retrieval"}
      </Button>
      <p role="status" className="text-xs">
        {message}
      </p>
    </form>
  );
}
