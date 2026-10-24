"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
export function Recalculate({ pending }: { pending: number }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <div className="mb-6 border-l-2 border-accent bg-[#f3eedf] p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold">{pending} assessments need updating</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Earlier results are historical until they match your latest profile and the accepted
            requirements.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMessage("");
            try {
              const r = await fetch("/api/matches", { method: "POST" });
              const result = await r.json();
              if (!r.ok) setMessage(result.message);
              else {
                setMessage(
                  result.remaining
                    ? `${result.processed} updated. Continue to update the rest.`
                    : "Your current assessments are ready.",
                );
                router.refresh();
              }
            } catch {
              setMessage(
                "Update could not finish. Your queued work is retained; retry in a moment.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
          {busy ? "Updating…" : "Update my matches"}
        </Button>
      </div>
      {message && (
        <p role="status" className="mt-3 text-xs">
          {message}
        </p>
      )}
    </div>
  );
}
