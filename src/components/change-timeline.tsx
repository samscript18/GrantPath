import Link from "next/link";
import { materialChanges } from "@/server/scholarships/changes";
import type { ScholarshipData } from "@/server/scholarships/schema";
import type { Rule } from "@/server/eligibility/rules";
import { formatDate } from "@/lib/utils";
const labels: Record<string, string> = {
  deadline: "Closing instant",
  deadlineLabel: "Deadline guidance",
  deadlineState: "Deadline certainty",
  availability: "Application window",
  requirements: "Eligibility requirements",
  funding: "Funding components",
  fundingType: "Funding coverage",
  fundingSummary: "Funding guidance",
  applicationUrl: "Official application link",
  levels: "Study levels",
  sourceFacts: "Official source wording",
};
function ruleText(r: Rule): string {
  return r.kind === "requirement"
    ? `${r.label}${r.verified ? "" : " (needs confirmation)"}`
    : `${r.kind === "all" ? "All required" : "Any alternative"}: ${r.rules.map(ruleText).join("; ")}`;
}
function describe(field: string, value: unknown): string {
  if (value === null || value === undefined) return "Not confirmed";
  if (field === "requirements") return ruleText(value as Rule);
  if (field === "funding" && Array.isArray(value))
    return (
      value.map((v) => `${v.component}: ${v.description}`).join("; ") ||
      "Package needs confirmation"
    );
  if (field === "sourceFacts" && typeof value === "object")
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
  if (Array.isArray(value)) return value.join(" · ");
  if (typeof value === "string") return value.replaceAll("_", " ");
  return String(value);
}
export function ChangeTimeline({
  versions,
  slug,
}: {
  versions: {
    id: string;
    number: number;
    createdAt: Date;
    reason: string;
    data: ScholarshipData;
  }[];
  slug: string;
}) {
  return (
    <ol className="ml-2 pt-2">
      {versions.map((v, i) => {
        const previous = versions[i + 1];
        const changes = previous ? materialChanges(previous.data, v.data) : [];
        return (
          <li key={v.id} className="relative border-l border-primary/20 pb-9 pl-6 last:pb-2">
            <span
              aria-hidden
              className="absolute top-1 -left-1 size-2 rounded-full bg-primary ring-4 ring-background"
            />
            <p className="text-xs font-semibold">
              Accepted version {v.number} · {formatDate(v.createdAt)}
            </p>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">{v.reason}</p>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Effective date:{" "}
              {v.data.effectiveAt ? formatDate(v.data.effectiveAt) : "not separately confirmed"}
            </p>
            {changes.length ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs underline">
                  What changed from version {previous.number}
                </summary>
                <div className="mt-4 space-y-4">
                  {changes.map((c) => (
                    <section key={c.field}>
                      <h3 className="mb-2 text-xs font-semibold">{labels[c.field] || c.field}</h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="max-h-64 overflow-auto rounded-lg border border-border bg-muted p-4">
                          <p className="eyebrow mb-2 text-[8px] text-muted-foreground">BEFORE</p>
                          <p className="whitespace-pre-wrap break-words text-[11px] leading-6">
                            {describe(c.field, c.before)}
                          </p>
                        </div>
                        <div className="max-h-64 overflow-auto rounded-lg border border-primary/15 bg-secondary/65 p-4">
                          <p className="eyebrow mb-2 text-[8px] text-muted-foreground">
                            ACCEPTED CHANGE
                          </p>
                          <p className="whitespace-pre-wrap break-words text-[11px] leading-6">
                            {describe(c.field, c.after)}
                          </p>
                        </div>
                      </div>
                    </section>
                  ))}
                </div>
              </details>
            ) : (
              <p className="mt-3 text-[11px] text-muted-foreground">
                Initial accepted record. No earlier version is recorded.
              </p>
            )}
            <Link
              href={`/scholarships/${slug}?version=${v.number}#evidence`}
              className="mt-3 inline-block text-[11px] underline underline-offset-4"
            >
              Evidence for this accepted version ↗
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
