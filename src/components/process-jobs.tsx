"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { processOperatorJobs } from "@/server/operator/jobs";
import { Workflow } from "lucide-react";
import { Button } from "./ui/button";
type JobResult = Awaited<ReturnType<typeof processOperatorJobs>>;
export function ProcessJobs({ initialQueue }: { initialQueue: JobResult["queue"] }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [queue, setQueue] = useState<JobResult["queue"]>(initialQueue);
  const router = useRouter();
  const visibleQueue =
    Date.parse(queue.checkedAt) > Date.parse(initialQueue.checkedAt) ? queue : initialQueue;
  async function process(maxBatches: number) {
    setBusy(true);
    let completed = 0;
    try {
      for (let batch = 0; batch < maxBatches; batch++) {
        const response = await fetch("/api/operator/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 10 }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Job processing failed.");
        const data = result as JobResult;
        completed += data.events.completed;
        setQueue(data.queue);
        setMessage(`Processed ${completed} events across ${batch + 1} bounded batch(es).`);
        if (data.events.failed || data.deliveries.retry_or_failed) {
          setMessage(
            "Some work failed or is waiting for retry. Inspect diagnostics before continuing.",
          );
          break;
        }
        if (!data.queue.events && !data.queue.deliveries) {
          setMessage("Queue drained: 0 pending events and 0 pending deliveries.");
          break;
        }
        if (!data.queue.ready) {
          setMessage(
            "Remaining work is waiting for a retry time or another active worker. The queue has not drained.",
          );
          break;
        }
        if (batch + 1 === maxBatches)
          setMessage(
            `Batch limit reached. ${data.queue.ready} runnable jobs remain; process another bounded batch to continue.`,
          );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to process jobs; check diagnostics and retry.",
      );
    } finally {
      setBusy(false);
      router.refresh();
    }
  }
  return (
    <div className="paper overflow-hidden">
      <div className="flex items-start gap-4 p-6">
        <span className="rounded-xl border border-border bg-secondary p-3 text-leaf">
          <Workflow size={21} aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-serif text-xl">Queue control</h3>
          <p className="mt-2 max-w-xl text-xs leading-6 text-muted-foreground">
            Process accepted changes and notifications. Failed or uncertain deliveries stay visible
            for review.
          </p>
        </div>
      </div>
      {visibleQueue && (
        <dl
          aria-label="Queue status"
          className="grid grid-cols-2 divide-x divide-border border-y border-border bg-muted/30 sm:grid-cols-4"
        >
          {[
            ["Pending events", visibleQueue.events],
            ["Pending deliveries", visibleQueue.deliveries],
            ["Runnable jobs", visibleQueue.ready],
            ["Needs review", visibleQueue.needsReview],
          ].map(([label, count]) => (
            <div key={label} className="p-5">
              <dt className="text-[11px] text-muted-foreground">{label}</dt>
              <dd className="mt-2 font-serif text-3xl">{count}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="p-6">
        <div className="flex flex-wrap gap-3">
          <Button size="sm" disabled={busy} onClick={() => process(10)}>
            {busy ? "Processing queued jobs…" : "Process queued jobs"}
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => process(1)}>
            Process up to 10 pending jobs
          </Button>
        </div>
        <p className="mt-4 text-[11px] leading-6 text-muted-foreground">
          Each run processes at most 10 batches of 10 events and deliveries. Work waiting for a
          retry or an active worker remains in the queue.
        </p>
        {message && (
          <p
            role="status"
            className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-xs leading-6"
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
