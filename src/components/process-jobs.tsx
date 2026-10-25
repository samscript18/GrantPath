"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
export function ProcessJobs() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <div className="mt-4">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await fetch("/api/operator/jobs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ limit: 10 }),
            });
            const result = await r.json();
            setMessage(
              r.ok
                ? "Bounded job batch completed. Inspect delivery and event diagnostics below."
                : result.message || "Job processing failed.",
            );
            if (r.ok) router.refresh();
          } catch {
            setMessage("Unable to process jobs; retry after checking diagnostics.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Processing…" : "Process up to 10 pending jobs"}
      </Button>
      <p role="status" className="mt-2 text-xs">
        {message}
      </p>
    </div>
  );
}
