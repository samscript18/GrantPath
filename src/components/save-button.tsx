"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, LoaderCircle } from "lucide-react";
import { Button } from "./ui/button";
export function SaveButton({
  scholarshipId,
  saved: initial,
  title = "opportunity",
  refresh = true,
}: {
  scholarshipId: string;
  saved: boolean;
  title?: string;
  refresh?: boolean;
}) {
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const label = saved ? `Unsave ${title}` : `Save ${title}`;
  return (
    <span className="save-control relative inline-flex shrink-0">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={`save-icon rounded-full ${saved ? "border-primary/25 bg-secondary text-primary" : "text-muted-foreground"}`}
        aria-label={label}
        aria-pressed={saved}
        aria-busy={busy}
        title={busy ? "Updating saved opportunity…" : label}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          setError("");
          try {
            const response = await fetch("/api/applications", {
              method: saved ? "DELETE" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(saved ? { action: "unsave", scholarshipId } : { scholarshipId }),
            });
            const result = await response.json();
            if (!response.ok) setError(result.message || "Couldn’t update this opportunity.");
            else {
              setSaved(!saved);
              setMessage(
                saved
                  ? "Opportunity unsaved. Application notes and progress are kept."
                  : "Opportunity saved.",
              );
              if (refresh) router.refresh();
            }
          } catch {
            setError("Couldn’t save. Check your connection and retry.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? (
          <LoaderCircle
            size={18}
            className="animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <Bookmark
            size={18}
            strokeWidth={1.6}
            fill={saved ? "currentColor" : "none"}
            aria-hidden="true"
          />
        )}
      </Button>
      <span role="status" className="sr-only">
        {message}
      </span>
      {error && (
        <span
          role="alert"
          className="save-error absolute top-full right-0 z-20 mt-2 w-60 rounded-lg border border-border bg-paper p-3 text-xs leading-6 shadow-lg"
        >
          {error}
        </span>
      )}
    </span>
  );
}
