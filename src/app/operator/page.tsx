import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/accounts/session";
import { operatorOverview } from "@/server/operator";
import { Shell } from "@/components/shell";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { SourceControls, RegisterSource } from "@/components/source-controls";
import { ReviewPanel } from "@/components/review-panel";
import { scholarshipDataSchema } from "@/server/scholarships/schema";
import { materialChanges } from "@/server/scholarships/changes";
import { formatDate } from "@/lib/utils";
import { OperatorEditor } from "@/components/operator-editor";
export const metadata = { title: "Operator studio" };
export default async function OperatorPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const actor = await requireUser();
  if (actor.role !== "operator") notFound();
  const overview = await operatorOverview(actor);
  const { edit } = await searchParams;
  const selected = overview.scholarships.find((s) => s.id === edit);
  return (
    <Shell actor={actor} active="/operator">
      <PageHeading
        eyebrow="OPERATOR STUDIO"
        title="Keep the path trustworthy."
        description="Review official evidence, maintain accepted records, and inspect operational health."
      />
      <nav className="mb-8 flex flex-wrap gap-6 border-b border-border pb-4 text-xs">
        <a href="#catalogue">Catalogue</a>
        <a href="#sources">Sources</a>
        <a href="#reviews">Review queue ({overview.reviews.length})</a>
        <a href="#deliveries">Delivery diagnostics</a>
      </nav>
      {selected ? (
        <section className="paper mb-8 p-6">
          <div className="mb-6 flex justify-between">
            <h2 className="font-serif text-2xl">Edit {selected.title}</h2>
            <Link href="/operator" className="text-xs underline">
              Close editor
            </Link>
          </div>
          <OperatorEditor
            key={`${selected.id}-${selected.version}`}
            record={{
              id: selected.id,
              version: selected.version,
              data: selected.versions[0]?.data,
            }}
          />
        </section>
      ) : (
        <details className="paper mb-8 p-6">
          <summary className="cursor-pointer font-serif text-xl">
            Create a sourced opportunity
          </summary>
          <div className="mt-6">
            <OperatorEditor />
          </div>
        </details>
      )}
      <section id="catalogue">
        <h2 className="mb-5 font-serif text-2xl">Accepted catalogue</h2>
        <div className="paper overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted text-[10px] uppercase tracking-wide">
              <tr>
                <th className="p-4">Opportunity / cycle</th>
                <th className="p-4">Version</th>
                <th className="p-4">State</th>
                <th className="p-4">Review</th>
              </tr>
            </thead>
            <tbody>
              {overview.scholarships.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-4">
                    <Link
                      href={`/scholarships/${s.slug}`}
                      className="font-semibold underline underline-offset-4"
                    >
                      {s.title}
                    </Link>
                    <p className="mt-2 text-[10px] text-muted-foreground">{s.cycle}</p>
                  </td>
                  <td className="p-4">{s.version}</td>
                  <td className="p-4">
                    <Badge>{s.published ? s.availability : "Draft"}</Badge>
                  </td>
                  <td className="p-4">
                    <Link className="underline" href={`/operator?edit=${s.id}`}>
                      Edit & publish
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!overview.scholarships.length && (
            <p className="p-7 text-sm">
              No accepted opportunities yet. Create a record with official evidence.
            </p>
          )}
        </div>
      </section>
      <section id="sources" className="mt-10">
        <h2 className="font-serif text-2xl">Source registry</h2>
        <p className="mt-3 text-xs text-muted-foreground">
          {overview.sources.length} registered sources. Fetching runs through the standalone
          ingestion worker. Access policies must be reviewed before enabling checks.
        </p>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {overview.sources.map((source) => (
            <article key={source.id} className="paper p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-serif text-xl">{source.scholarship.title}</h3>
                <Badge tone={source.health === "healthy" ? "green" : "amber"}>
                  {source.health.replaceAll("_", " ")}
                </Badge>
              </div>
              <a
                href={source.url}
                className="mt-3 block break-all text-[10px] underline"
                target="_blank"
                rel="noreferrer"
              >
                {source.url}
              </a>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Adapter: {source.adapter} · {source.cadenceHours}-hour target ·{" "}
                {source.enabled ? "scheduled" : "paused"}
              </p>
              <div className="mt-4 grid gap-2 text-[10px] text-muted-foreground">
                <p>Last attempted check: {formatDate(source.lastAttemptAt)}</p>
                <p>Last successful check: {formatDate(source.lastSuccessAt)}</p>
                <p>{source.requestedAt ? "Manual check queued" : "No manual check pending"}</p>
              </div>
              <SourceControls source={source} />
              <details className="mt-4">
                <summary className="cursor-pointer text-[11px] underline">
                  Check history ({source.observations.length} most recent)
                </summary>
                {source.observations.map((o) => (
                  <div
                    key={o.id}
                    className="mt-3 border-t border-border pt-3 text-[10px] leading-5"
                  >
                    <p>
                      {o.attemptedAt.toISOString()} · {o.state}
                    </p>
                    {o.error && <p className="mt-2 text-red-800">{o.error}</p>}
                    {o.excerpt && (
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap">
                        {o.excerpt}
                      </pre>
                    )}
                  </div>
                ))}
              </details>
            </article>
          ))}
        </div>
        <RegisterSource scholarships={overview.scholarships} />
      </section>
      <section id="reviews" className="mt-10">
        <h2 className="font-serif text-2xl">Review queue</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {overview.reviews.length
            ? `${overview.reviews.length} candidate changes await review.`
            : "No candidate changes awaiting review."}
        </p>
        <div className="mt-5 space-y-5">
          {overview.reviews.map((review) => {
            const candidate = scholarshipDataSchema.parse(review.candidate);
            const accepted = overview.scholarships.find((s) => s.id === review.scholarshipId)
              ?.versions[0];
            const changes = materialChanges(
              accepted ? scholarshipDataSchema.parse(accepted.data) : null,
              candidate,
            );
            return (
              <article key={review.id} className="paper p-6">
                <h3 className="mb-4 font-serif text-2xl">{review.scholarship.title}</h3>
                <div className="mb-5 space-y-3">
                  {changes.map((change) => (
                    <details key={change.field} className="border-t border-border pt-3">
                      <summary className="cursor-pointer text-xs font-semibold">
                        {change.field} · old / proposed
                      </summary>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-all bg-muted p-3 text-[10px]">
                          {JSON.stringify(change.before, null, 2)}
                        </pre>
                        <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-all bg-secondary p-3 text-[10px]">
                          {JSON.stringify(change.after, null, 2)}
                        </pre>
                      </div>
                    </details>
                  ))}
                </div>
                <ReviewPanel
                  review={{ id: review.id, baseVersion: review.baseVersion, candidate }}
                />
              </article>
            );
          })}
        </div>
      </section>
      <section id="deliveries" className="mt-10">
        <h2 className="font-serif text-2xl">Delivery diagnostics</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {overview.failures.length} pending or failed deliveries · {overview.events.length} pending
          events.
        </p>
      </section>
    </Shell>
  );
}
