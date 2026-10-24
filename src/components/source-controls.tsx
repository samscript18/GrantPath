"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
export function SourceControls({
  source,
}: {
  source: { id: string; enabled: boolean; cadenceHours: number };
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function send(body: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/operator/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await r.json();
      setMessage(
        r.ok
          ? "Request recorded. Source checks run in the standalone ingestion worker; check history will show the actual result."
          : result.message,
      );
      if (r.ok) router.refresh();
    } catch {
      setMessage("Request failed. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-4 space-y-3">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => send({ action: "check", id: source.id })}
      >
        Queue manual check
      </Button>
      <details>
        <summary className="cursor-pointer text-[11px] underline">Cadence & access policy</summary>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void send({
              action: "configure",
              id: source.id,
              enabled: f.get("enabled") === "on",
              cadenceHours: Number(f.get("cadence")),
              reason: String(f.get("reason")),
            });
          }}
        >
          <label className="flex gap-2 text-[11px]">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={source.enabled}
              className="accent-primary"
            />
            Enable scheduled checks after reviewing source access terms
          </label>
          <div>
            <label className="field-label" htmlFor={`cadence-${source.id}`}>
              Target cadence (hours)
            </label>
            <Input
              id={`cadence-${source.id}`}
              name="cadence"
              type="number"
              min={24}
              max={720}
              defaultValue={source.cadenceHours}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor={`policy-${source.id}`}>
              Access-policy review reason
            </label>
            <Input
              id={`policy-${source.id}`}
              name="reason"
              required
              minLength={10}
              placeholder="Record terms checked and permitted scope"
            />
          </div>
          <Button size="sm" disabled={busy}>
            Save source policy
          </Button>
        </form>
      </details>
      {message && (
        <p role="status" className="text-[11px] leading-6">
          {message}
        </p>
      )}
    </div>
  );
}
export function RegisterSource({
  scholarships,
}: {
  scholarships: { id: string; title: string }[];
}) {
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <details className="paper mt-5 p-5">
      <summary className="cursor-pointer font-serif text-xl">Register a supported source</summary>
      <form
        className="mt-5 grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          try {
            const r = await fetch("/api/operator/monitoring", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "register",
                scholarshipId: f.get("scholarshipId"),
                adapter: f.get("adapter"),
                url: f.get("url"),
                cadenceHours: Number(f.get("cadence")),
                reason: f.get("reason"),
              }),
            });
            const body = await r.json();
            setMessage(
              r.ok ? "Registered, with scheduled checking paused for policy review." : body.message,
            );
            if (r.ok) router.refresh();
          } catch {
            setMessage("Unable to register the source. Please retry.");
          }
        }}
      >
        <div>
          <label className="field-label" htmlFor="source-scholarship">
            Opportunity cycle
          </label>
          <select className="form-select" id="source-scholarship" name="scholarshipId">
            {scholarships.map((s) => (
              <option value={s.id} key={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="source-adapter">
            Explicit adapter
          </label>
          <select className="form-select" id="source-adapter" name="adapter">
            <option value="ucl-scholarship">UCL Global scholarships</option>
            <option value="oxford-clarendon">Oxford Clarendon</option>
            <option value="csc-masters">CSC Master’s</option>
            <option value="twente-uts">Twente UTS</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="source-url">
            Allowlisted official page URL
          </label>
          <Input id="source-url" name="url" type="url" required />
        </div>
        <div>
          <label className="field-label" htmlFor="source-cadence">
            Target cadence (hours)
          </label>
          <Input
            id="source-cadence"
            name="cadence"
            type="number"
            defaultValue={24}
            min={24}
            max={720}
            required
          />
        </div>
        <div>
          <label className="field-label" htmlFor="source-reason">
            Registration reason
          </label>
          <Input id="source-reason" name="reason" minLength={10} required />
        </div>
        <Button>Register source</Button>
        {message && (
          <p role="status" className="text-xs leading-6">
            {message}
          </p>
        )}
      </form>
    </details>
  );
}
