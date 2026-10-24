import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { Badge } from "./ui/badge";
import { formatDate } from "@/lib/utils";
import {
  outcomeLabels,
  type RuleResult,
  type Assessment as AssessmentType,
} from "@/server/eligibility/engine";
const icons = { pass: CheckCircle2, fail: XCircle, unknown: CircleHelp };
function Result({ result }: { result: RuleResult }) {
  const Icon = icons[result.state];
  return (
    <li className="border-b border-border py-4 last:border-0">
      <div className="flex gap-3">
        <Icon
          size={16}
          className={`mt-1 shrink-0 ${result.state === "fail" ? "text-red-800" : result.state === "unknown" ? "text-[#795410]" : "text-primary"}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-6">{result.label}</p>
          <p className="mt-1 text-[11px] leading-6 text-muted-foreground">{result.explanation}</p>
          {result.evidenceKey && (
            <a
              href={`#evidence-${result.evidenceKey}`}
              className="mt-2 inline-block text-[11px] underline underline-offset-4"
            >
              Official evidence ↗
            </a>
          )}
          {result.children && (
            <details className="mt-3">
              <summary className="cursor-pointer text-[11px] underline">
                Inspect alternatives and conditions
              </summary>
              <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                A failed or unknown alternative does not invalidate a passing OR group. This
                section’s status is the group’s combined result.
              </p>
              <ul className="ml-2">
                <ResultList results={result.children} />
              </ul>
            </details>
          )}
          <span className="mt-2 block text-[9px] text-muted-foreground">Reason: {result.code}</span>
        </div>
      </div>
    </li>
  );
}
function ResultList({ results }: { results: RuleResult[] }) {
  return results.map((r) => <Result key={r.id} result={r} />);
}
export function Assessment({
  assessment,
  profileVersion,
  scholarshipVersion,
  current,
}: {
  assessment: AssessmentType & { ranking?: { score: number; factors: string[] } };
  profileVersion: number;
  scholarshipVersion: number;
  current: boolean;
}) {
  const results = assessment.tree.children || [assessment.tree];
  return (
    <div className="mt-6">
      <div
        className={`border-l-2 p-5 ${!current || assessment.outcome === "potential" ? "border-accent bg-[#f3eedf]" : assessment.outcome === "not_eligible" ? "border-red-700 bg-[#f7e9e3]" : "border-primary bg-secondary"}`}
      >
        <Badge
          tone={
            !current || assessment.outcome === "potential"
              ? "amber"
              : assessment.outcome === "not_eligible"
                ? "red"
                : "green"
          }
        >
          {current ? "Current assessment" : "Historical · updating needed"}
        </Badge>
        <h3 className="mt-3 font-serif text-2xl">{outcomeLabels[assessment.outcome]}</h3>
        <p className="mt-3 text-[11px] leading-6 text-muted-foreground">
          Profile v{profileVersion} · Scholarship v{scholarshipVersion} · Engine{" "}
          {assessment.engineVersion} · Evaluated {formatDate(assessment.evaluatedAt)}
        </p>
      </div>
      <div className="mt-5 space-y-5">
        {(
          [
            ["pass", "Requirements met"],
            ["unknown", "Needs your confirmation"],
            ["fail", "Known requirements not met"],
          ] as const
        ).map(([state, label]) => {
          const entries = results.filter((r) => r.state === state);
          if (!entries.length) return null;
          return (
            <section key={state}>
              <h3 className="eyebrow border-b border-border pb-3 text-muted-foreground">{label}</h3>
              <ul>
                <ResultList results={entries} />
              </ul>
            </section>
          );
        })}
      </div>
      {assessment.ranking && (
        <details className="mt-6 border-t border-border pt-4">
          <summary className="cursor-pointer text-xs">
            Preference ranking · {assessment.ranking.score} points
          </summary>
          <p className="mt-3 text-[11px] leading-6 text-muted-foreground">
            Preference points order relevant opportunities. They are separate from eligibility and
            do not predict an award.
          </p>
          <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            {assessment.ranking.factors.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
