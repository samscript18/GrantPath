"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
export function RetryEvent({ id }: { id: string }) {
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <form
      className="mt-3 flex flex-wrap gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const r = await fetch("/api/operator/monitoring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "retry-event", id, reason: f.get("reason") }),
        });
        const result = await r.json();
        setMessage(r.ok ? "Retry queued with the same event identity." : result.message);
        if (r.ok) router.refresh();
      }}
    >
      <label htmlFor={`retry-${id}`} className="sr-only">
        Retry reason
      </label>
      <input
        id={`retry-${id}`}
        name="reason"
        required
        minLength={10}
        className="min-w-0 flex-1 rounded border border-border px-3 py-2 text-xs"
        placeholder="Record the fix or recovery reason"
      />
      <Button size="sm" variant="outline">
        Retry failed event
      </Button>
      {message && (
        <p role="status" className="w-full text-xs">
          {message}
        </p>
      )}
    </form>
  );
}
