"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { statuses } from "@/server/applications/constants";
type Item = { id: string; label: string; done: boolean };
export function ApplicationEditor({
  application,
}: {
  application: {
    id: string;
    revision: number;
    status: string;
    notes: string;
    checklist: Item[];
    saved: boolean;
  };
}) {
  const [status, setStatus] = useState(application.status);
  const [notes, setNotes] = useState(application.notes);
  const [checklist, setChecklist] = useState(application.checklist);
  const [saved, setSaved] = useState(application.saved);
  const [revision, setRevision] = useState(application.revision);
  const [item, setItem] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: application.id,
          data: { revision, status, notes, checklist, saved },
        }),
      });
      const result = await r.json();
      if (!r.ok) setMessage(result.message);
      else {
        setRevision(result.revision);
        setMessage("Your plan is saved.");
        router.refresh();
      }
    } catch {
      setMessage("Couldn’t save. Keep this page open and retry; your edits are still here.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="application-editor space-y-5">
      <div>
        <label className="field-label" htmlFor={`status-${application.id}`}>
          My application progress
        </label>
        <select
          id={`status-${application.id}`}
          className="form-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
          Your personal status is separate from the provider’s application window.
        </p>
      </div>
      <div>
        <label className="field-label" htmlFor={`notes-${application.id}`}>
          Private notes
        </label>
        <textarea
          id={`notes-${application.id}`}
          value={notes}
          maxLength={5000}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Questions to ask, ideas to explore, a plan for your next step…"
          className="w-full rounded-lg border border-border bg-background/60 p-3 text-[13px] leading-7 focus:border-primary/60 focus:outline-none focus:ring-3 focus:ring-primary/10"
        />
      </div>
      <div>
        <p className="field-label">My preparation checklist</p>
        <p className="mb-3 text-[10px] leading-5 text-muted-foreground">
          A personal planning aid. Check official guidance for required documents.
        </p>
        <ul className="divide-y divide-border/60">
          {checklist.map((c) => (
            <li key={c.id} className="flex items-start gap-3 py-3">
              <label className="flex min-w-0 flex-1 items-start gap-2 text-xs leading-5">
                <input
                  className="mt-1 accent-primary"
                  type="checkbox"
                  checked={c.done}
                  onChange={(e) =>
                    setChecklist(
                      checklist.map((x) => (x.id === c.id ? { ...x, done: e.target.checked } : x)),
                    )
                  }
                />
                <span className={c.done ? "text-muted-foreground line-through" : ""}>
                  {c.label}
                </span>
              </label>
              <button
                type="button"
                aria-label={`Remove checklist item: ${c.label}`}
                onClick={() => setChecklist(checklist.filter((x) => x.id !== c.id))}
                className="p-1 text-muted-foreground"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (item.trim() && checklist.length < 30) {
              setChecklist([
                ...checklist,
                { id: crypto.randomUUID(), label: item.trim(), done: false },
              ]);
              setItem("");
            }
          }}
        >
          <Input
            aria-label="New preparation item"
            value={item}
            maxLength={200}
            onChange={(e) => setItem(e.target.value)}
            placeholder="Add a preparation step"
          />
          <Button
            variant="outline"
            size="icon"
            aria-label="Add preparation item"
            disabled={!item.trim() || checklist.length >= 30}
          >
            <Plus size={15} />
          </Button>
        </form>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={saved}
          className="accent-primary"
          onChange={(e) => setSaved(e.target.checked)}
        />
        Keep in Saved opportunities
      </label>
      <p className="text-[10px] leading-5 text-muted-foreground">
        Unsaving stops saved-only future alerts while keeping these notes and progress.
      </p>
      <Button onClick={save} disabled={busy} className="w-full">
        <Check size={14} />
        {busy ? "Saving…" : "Save my plan"}
      </Button>
      {message && (
        <p role="status" className="text-xs leading-6">
          {message}
        </p>
      )}
      <details className="border-t border-border pt-4 text-[10px]">
        <summary className="cursor-pointer text-muted-foreground">
          Remove this personal application record
        </summary>
        <p className="my-3 leading-5">
          This permanently removes your notes, checklist and status history for this opportunity.
          The scholarship is kept in the catalogue.
        </p>
        <button
          className="text-danger-foreground underline"
          onClick={async () => {
            if (
              !window.confirm(
                "Permanently remove your personal notes, checklist and application history?",
              )
            )
              return;
            const r = await fetch("/api/applications", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "remove",
                id: application.id,
                confirmation: "REMOVE",
              }),
            });
            if (r.ok) router.refresh();
            else setMessage("Couldn’t remove the record. Please retry.");
          }}
        >
          Permanently remove my record
        </button>
      </details>
    </div>
  );
}
