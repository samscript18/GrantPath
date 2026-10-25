"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
export function ControlledSourceControls() {
  const [scenario, setScenario] = useState("publication"),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<{
      decision?: string;
      reasonCodes?: string[];
      resultingVersion?: number;
      scholarshipId?: string;
      message?: string;
    } | null>(null);
  const router = useRouter();
  async function run(mode: string) {
    setBusy(true);
    try {
      const r = await fetch("/api/operator/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "controlled-snapshot", mode, scenario }),
      });
      const body = await r.json();
      setResult(body);
      if (r.ok) router.refresh();
    } catch {
      setResult({ message: "Snapshot processing failed. Please retry." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="paper my-6 p-6">
      <summary className="cursor-pointer font-serif text-xl">Isolated source verification</summary>
      <p className="mt-3 text-xs leading-6 text-muted-foreground">
        Fictional, labelled source snapshots use the actual publication service in this isolated
        test database. They do not fetch official URLs or notify real email accounts.
      </p>
      <label className="field-label mt-4" htmlFor="controlled-scenario">
        Isolated scenario
      </label>
      <select
        id="controlled-scenario"
        className="input"
        value={scenario}
        onChange={(e) => setScenario(e.target.value)}
      >
        <option value="publication">Publication and replay</option>
        <option value="change">Eligibility and notifications</option>
      </select>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button size="sm" disabled={busy} onClick={() => run("valid")}>
          Publish valid snapshot
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run("ambiguous")}>
          Inspect ambiguous snapshot
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run("changed")}>
          Publish changed requirement
        </Button>
      </div>
      {result && (
        <div
          role="status"
          className="mt-4 rounded-lg border border-border bg-secondary p-4 text-xs leading-6"
        >
          <p>{result.message || result.decision}</p>
          {result.resultingVersion && <p>Accepted version {result.resultingVersion}</p>}
          <p>{result.reasonCodes?.join(" · ")}</p>
        </div>
      )}
    </details>
  );
}
