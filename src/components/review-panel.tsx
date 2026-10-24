"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { ScholarshipData } from "@/server/scholarships/schema";
export function ReviewPanel({
  review,
}: {
  review: { id: string; baseVersion: number; cycle: string; candidate: ScholarshipData };
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const f = new FormData(e.currentTarget);
        const decision =
          (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") || "reject";
        try {
          const candidate = JSON.parse(String(f.get("candidate")));
          const r = await fetch("/api/operator/monitoring", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "review",
              id: review.id,
              decision,
              candidate,
              confirmedFields: f.getAll("confirmedFields"),
              sameCycleConfirmed: f.get("sameCycleConfirmed") === "on",
              reason: f.get("reason"),
            }),
          });
          const result = await r.json();
          setMessage(
            r.ok
              ? `Review ${result.state}. Accepted facts are versioned and downstream work is durable.`
              : `${result.message}${result.issues ? " " + JSON.stringify(result.issues) : ""}`,
          );
          if (r.ok) router.refresh();
        } catch {
          setMessage("Check candidate JSON syntax and retry. The accepted record was preserved.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-[11px] leading-6 text-muted-foreground">
        Base version {review.baseVersion}. Automated extraction proposes values; only an operator’s
        evidence review can mark a proposed field checked.
      </p>
      <fieldset className="space-y-2 border border-border p-4">
        <legend className="px-2 text-xs font-semibold">
          Fields you checked against the official source
        </legend>
        {review.candidate.evidence
          .filter((e) => e.state !== "verified")
          .map((e) => (
            <label key={e.field} className="flex gap-2 text-[11px] leading-5">
              <input
                type="checkbox"
                name="confirmedFields"
                value={e.field}
                className="mt-1 accent-primary"
              />
              <span>
                {e.field}:{" "}
                <a href={e.url} target="_blank" rel="noreferrer" className="underline">
                  inspect source ↗
                </a>
                <span className="mt-1 block text-muted-foreground">{e.passage.slice(0, 250)}</span>
              </span>
            </label>
          ))}
      </fieldset>
      <label className="flex items-start gap-3 border-l-2 border-accent py-2 pl-3 text-xs leading-6">
        <input type="checkbox" name="sameCycleConfirmed" className="mt-1 accent-primary" />
        <span>
          I checked that this update belongs to cycle {review.cycle}. A new cycle must be created as
          a separate opportunity, preserving this record.
        </span>
      </label>
      <details>
        <summary className="cursor-pointer text-xs underline">
          Inspect or correct structured candidate before accepting
        </summary>
        <label htmlFor={`candidate-${review.id}`} className="field-label mt-4">
          Candidate JSON (including rules and evidence)
        </label>
        <textarea
          id={`candidate-${review.id}`}
          name="candidate"
          rows={14}
          defaultValue={JSON.stringify(review.candidate, null, 2)}
          className="w-full rounded-md border border-border bg-background p-3 font-mono text-[10px]"
        />
      </details>
      <div>
        <label className="field-label" htmlFor={`review-reason-${review.id}`}>
          Decision reason
        </label>
        <Input name="reason" id={`review-reason-${review.id}`} minLength={10} required />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button name="decision" value="accept" disabled={busy}>
          Accept reviewed version
        </Button>
        <Button name="decision" value="reject" variant="outline" disabled={busy}>
          Reject candidate
        </Button>
      </div>
      {message && (
        <p role="status" className="text-xs leading-6">
          {message}
        </p>
      )}
    </form>
  );
}
