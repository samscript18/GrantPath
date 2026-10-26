import { ControlledSourceControls } from "@/components/controlled-source-controls";
import { ProcessJobs } from "@/components/process-jobs";
import { controlledFixturesEnabled } from "@/server/discovery/controlled";
import { DiscoveryControls } from "@/components/discovery-controls";
import { ProviderImageEditor } from "@/components/provider-image-editor";
import { providerImageVersion } from "@/server/scholarships/images";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/accounts/session";
import { operatorOverview } from "@/server/operator";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { SourceControls, RegisterSource } from "@/components/source-controls";
import { ReviewPanel } from "@/components/review-panel";
import { scholarshipDataSchema } from "@/server/scholarships/schema";
import { materialChanges } from "@/server/scholarships/changes";
import { formatDate, formatTimestamp } from "@/lib/utils";
import { RetryEvent } from "@/components/delivery-diagnostics";
import { OperatorEditor } from "@/components/operator-editor";
export const metadata = { title: "Operator studio" };
export default async function OperatorPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; publication?: string }>;
}) {
  const actor = await requireUser();
  if (actor.role !== "operator") notFound();
  const { edit, publication } = await searchParams;
  const overview = await operatorOverview(actor, publication);
  const selected = overview.scholarships.find((s) => s.id === edit);
  const discoveryReviews = overview.discovery.candidates.filter(
    (candidate) => candidate.state === "review",
  ).length;
  return (
    <div className="operator-studio">
      <PageHeading
        eyebrow="OPERATOR STUDIO"
        title="Keep the path trustworthy."
        description="Review official evidence, maintain accepted records, and inspect operational health."
      />
      <div className="operator-summary studio-overview mb-7 grid grid-cols-2 divide-x divide-border rounded-xl border border-border bg-paper sm:grid-cols-4">
        {[
          [overview.scholarships.length, "Catalogue records"],
          [overview.sources.length, "Registered sources"],
          [overview.reviews.length + discoveryReviews, "Awaiting review"],
          [overview.failures.length, "Delivery follow-up"],
        ].map(([value, label]) => (
          <div key={label} className="px-5 py-5">
            <p className="font-serif text-3xl">{value}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <nav
        aria-label="Operator sections"
        className="section-navigation studio-navigation mb-8 flex gap-1 overflow-x-auto rounded-lg border border-border bg-paper p-1 text-xs"
      >
        <a href="#catalogue">Catalogue</a>
        <a href="#provider-images">Provider images</a>
        <a href="#sources">Sources</a>
        <a href="#discovery">Discovery & automatic publication</a>
        <a href="#discovery-exceptions">Discovery exceptions ({discoveryReviews})</a>
        <a href="#reviews">Source-change review ({overview.reviews.length})</a>
        <a href="#deliveries">Delivery diagnostics</a>
      </nav>
      <ProcessJobs />
      {controlledFixturesEnabled() && <ControlledSourceControls />}
      {controlledFixturesEnabled() && (
        <p className="my-4 border border-amber/30 bg-secondary p-4 text-xs">
          Isolated release verification is enabled. Controlled snapshots require an authenticated
          operator; fictional records are labelled [TEST ONLY] and cannot notify real email
          accounts.
        </p>
      )}
      <section id="discovery" className="mb-9 space-y-5">
        <div>
          <p className="eyebrow text-muted-foreground">APPROVED OFFICIAL DIRECTORIES</p>
          <h2 className="mt-3 font-serif text-3xl">Discovery & publication</h2>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            Sources run outside the app. Pause retrieval or automatic publication independently;
            accepted records and evidence are retained.
          </p>
        </div>
        {!overview.discovery.directories.length && (
          <p className="paper p-6 text-sm">
            No discovery policies registered. Use the approved-directory CLI to register a reviewed
            source.
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          {overview.discovery.directories.map((directory) => (
            <article key={directory.id} className="paper p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-serif text-xl">{directory.id}</h3>
                <Badge tone={directory.health === "healthy" ? "green" : "amber"}>
                  {directory.health}
                </Badge>
              </div>
              <a
                className="mt-3 block break-all text-xs underline"
                href={directory.url}
                target="_blank"
                rel="noreferrer"
              >
                Official directory
              </a>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Last attempted</dt>
                  <dd className="mt-1">
                    {directory.lastAttemptAt
                      ? formatTimestamp(directory.lastAttemptAt)
                      : "Not yet checked"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Last successful</dt>
                  <dd className="mt-1">
                    {directory.lastSuccessAt
                      ? formatTimestamp(directory.lastSuccessAt)
                      : "No successful check"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Candidates</dt>
                  <dd>{directory._count.candidates}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Policy version</dt>
                  <dd>{directory.policyVersion}</dd>
                </div>
              </dl>
              {directory.checks
                .filter((c) => c.error)
                .map((check) => (
                  <p key={check.id} className="mt-3 text-xs text-error">
                    {check.error}
                  </p>
                ))}
              <DiscoveryControls directory={directory} />
            </article>
          ))}
        </div>
        <details
          id="discovery-exceptions"
          className="paper p-6"
          open={overview.discovery.candidates.some((c) => c.state === "review")}
        >
          <summary className="cursor-pointer font-serif text-xl">
            Candidate exceptions & work queue ({overview.discovery.candidates.length})
          </summary>
          <div className="mt-5 divide-y divide-border">
            {overview.discovery.candidates.map((candidate) => (
              <article key={candidate.id} className="py-5 first:pt-0">
                <h3 className="mb-3 font-serif text-lg">
                  {candidate.title || "New official opportunity"}
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge>{candidate.state}</Badge>
                  <a
                    className="break-all text-xs underline"
                    href={candidate.canonicalUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {candidate.canonicalUrl}
                  </a>
                </div>
                <p className="mt-3 break-all text-xs text-muted-foreground">
                  Discovered from: {candidate.discoveredFrom}
                </p>
                {candidate.error && <p className="mt-3 text-xs text-error">{candidate.error}</p>}
                {candidate.observations[0]?.decisions.map((decision) => (
                  <div key={decision.id} className="mt-3 text-xs leading-6">
                    <p>{decision.reasonCodes.join(" · ")}</p>
                    <dl
                      className="mt-2 flex flex-wrap gap-x-6 gap-y-1"
                      aria-label="Publication outcome"
                    >
                      <div className="flex gap-2">
                        <dt>Accepted version after decision:</dt>
                        <dd>{decision.resultingVersion ?? "None"}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt>Publication events:</dt>
                        <dd>{decision.eventIds.length}</dd>
                      </div>
                    </dl>
                    <p className="text-muted-foreground">
                      {decision.policyVersion} · {decision.decision}
                    </p>
                  </div>
                ))}
                {candidate.state === "review" && candidate.observations[0] ? (
                  <DiscoveryControls
                    observation={{
                      id: candidate.observations[0].id,
                      data: candidate.observations[0].data,
                    }}
                  />
                ) : (
                  <DiscoveryControls candidate={candidate.id} />
                )}
              </article>
            ))}
          </div>
        </details>
        <details
          id="automatic-publications"
          className="paper p-6 scroll-mt-28"
          open={Boolean(publication)}
        >
          <summary className="cursor-pointer font-serif text-xl">
            {publication ? "Publication history" : "Recent automatic publications"} (
            {overview.discovery.decisions.length})
          </summary>
          {publication && (
            <Link
              className="mt-3 inline-block text-xs font-semibold underline"
              href="/operator#automatic-publications"
            >
              Show recent publications across all opportunities
            </Link>
          )}
          {!overview.discovery.decisions.length && (
            <p className="mt-4 text-sm text-muted-foreground">
              No accepted automatic publications found.
            </p>
          )}
          <ol className="mt-5 divide-y divide-border">
            {overview.discovery.decisions.map((decision) => (
              <li key={decision.id} className="py-4 text-xs leading-6">
                <h3 className="font-serif text-lg">{decision.title || "Accepted opportunity"}</h3>
                <p>
                  Version {decision.resultingVersion} · {formatTimestamp(decision.createdAt)}
                </p>
                <p>{decision.reasonCodes.join(" · ")}</p>
                <p className="text-muted-foreground">
                  {decision.policyVersion} · {decision.actorId} · {decision.eventIds.length} durable
                  event(s)
                </p>
                <dl className="mt-3 space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
                  <div>
                    <dt className="font-semibold">Publication decision</dt>
                    <dd className="break-all font-mono text-[10px]">{decision.id}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Durable publication event IDs</dt>
                    <dd>
                      {decision.eventIds.length
                        ? decision.eventIds.map((id) => (
                            <code key={id} className="block break-all text-[10px]">
                              {id}
                            </code>
                          ))
                        : "No downstream events"}
                    </dd>
                  </div>
                </dl>
                <details>
                  <summary className="cursor-pointer underline">
                    Inspect before / after and evidence
                  </summary>
                  <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-all text-[10px]">
                    {JSON.stringify({ before: decision.before, after: decision.after }, null, 2)}
                  </pre>
                </details>
              </li>
            ))}
          </ol>
        </details>
      </section>
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
      <details id="provider-images" className="paper mb-8 p-6 sm:p-8">
        <summary className="cursor-pointer font-serif text-2xl">
          University & foundation images
        </summary>
        <p className="mt-3 text-xs leading-7 text-muted-foreground">
          Add an official logo or provider image once. It appears across their scholarships,
          including students’ saved opportunities. Keep a link to its official source.
        </p>
        <div className="mt-4">
          {[
            ...new Map(
              overview.scholarships.map((s) => [s.programme.provider.id, s.programme.provider]),
            ).values(),
          ].map((provider) => (
            <ProviderImageEditor
              key={provider.id}
              provider={{ ...provider, version: providerImageVersion(provider.imageUrl) }}
            />
          ))}
        </div>
      </details>
      <section id="catalogue">
        <div className="mb-5">
          <p className="eyebrow text-leaf">THE PUBLISHED COLLECTION</p>
          <h2 className="mt-3 font-serif text-3xl">Accepted catalogue</h2>
        </div>
        <div className="operator-table paper overflow-x-auto">
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
                <p>Last attempted check: {formatTimestamp(source.lastAttemptAt)}</p>
                <p>Last successful check: {formatTimestamp(source.lastSuccessAt)}</p>
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
                    {o.error && <p className="mt-2 text-danger-foreground">{o.error}</p>}
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
        <h2 className="font-serif text-2xl">Source-change review</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {overview.reviews.length
            ? `${overview.reviews.length} candidate changes await review.`
            : "No candidate changes awaiting review."}
        </p>
        <div className="mt-5 space-y-5">
          {overview.reviews.map((review) => {
            const candidate = scholarshipDataSchema.parse(review.candidate);
            const observed = review.observation?.candidate;
            const warnings =
              observed &&
              typeof observed === "object" &&
              !Array.isArray(observed) &&
              Array.isArray(observed.warnings)
                ? observed.warnings.filter((w): w is string => typeof w === "string")
                : [];
            const accepted = overview.scholarships.find((s) => s.id === review.scholarshipId)
              ?.versions[0];
            const changes = materialChanges(
              accepted ? scholarshipDataSchema.parse(accepted.data) : null,
              candidate,
            );
            return (
              <article key={review.id} className="paper p-6">
                <h3 className="mb-4 font-serif text-2xl">{review.scholarship.title}</h3>
                {warnings.length > 0 && (
                  <div className="mb-5 border-l-2 border-accent bg-accent/10 p-4">
                    <p className="text-xs font-semibold">Extraction needs your review</p>
                    <ul className="mt-2 list-disc space-y-2 pl-4 text-xs leading-6">
                      {warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
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
                  review={{
                    id: review.id,
                    baseVersion: review.baseVersion,
                    cycle: review.scholarship.cycle,
                    candidate,
                  }}
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
        <p className="mt-3 text-[11px] leading-6 text-muted-foreground">
          Email “accepted” means the provider accepted the request, not recipient receipt. Local
          “captured” messages stay in the isolated sink. Uncertain requests are held for provider
          investigation.
        </p>
        <div className="mt-5 space-y-4">
          {overview.failures.map((delivery) => (
            <article key={delivery.id} className="paper p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xs font-semibold">{delivery.subject}</h3>
                <Badge
                  tone={
                    delivery.state === "failed" || delivery.state === "uncertain" ? "red" : "amber"
                  }
                >
                  {delivery.state}
                </Badge>
              </div>
              <p className="mt-3 text-[10px] text-muted-foreground">
                Channel: {delivery.channel} · Attempts: {delivery.attempts} · Delivery ID:{" "}
                {delivery.id}
              </p>
              {delivery.error && <p className="mt-3 text-xs leading-6">{delivery.error}</p>}
              <details className="mt-3">
                <summary className="cursor-pointer text-[11px] underline">Attempt history</summary>
                {delivery.history.map((attempt) => (
                  <p key={attempt.id} className="mt-2 text-[10px] leading-5">
                    Attempt {attempt.number}: {attempt.state} · {attempt.createdAt.toISOString()}
                    {` · Provider: ${attempt.provider || "legacy / unknown"}`}
                    {attempt.error ? ` · ${attempt.error}` : ""}
                    {attempt.providerKey && (
                      <span className="block break-all font-mono">
                        Idempotency key: {attempt.providerKey}
                      </span>
                    )}
                  </p>
                ))}
              </details>
            </article>
          ))}
        </div>
        <details className="mt-7">
          <summary className="cursor-pointer font-serif text-xl">
            Persisted application events · {overview.recentEvents.length} recent
          </summary>
          <p className="mt-3 text-xs text-muted-foreground">
            Completed events remain here after processing. The pending count above tracks unfinished
            work.
          </p>
          <ol aria-label="Recent persisted event history" className="mt-4 space-y-3">
            {overview.recentEvents.map((event) => (
              <li key={event.id} className="paper p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold">{event.topic}</p>
                  <Badge tone={event.state === "done" ? "green" : "amber"}>
                    {event.state === "done" ? "Completed" : event.state}
                  </Badge>
                </div>
                <p className="mt-2 break-all font-mono text-[10px]">{event.id}</p>
                <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">
                  Event key: {event.key}
                </p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Created {formatTimestamp(event.createdAt)} · Attempts {event.attempts}
                  {event.completedAt && <> · Completed {formatTimestamp(event.completedAt)}</>}
                </p>
              </li>
            ))}
          </ol>
        </details>
        <details className="mt-7">
          <summary className="cursor-pointer font-serif text-xl">
            Unfinished application events · {overview.events.length}
          </summary>
          <div className="mt-4 space-y-3">
            {overview.events.map((event) => (
              <article key={event.id} className="paper p-4">
                <p className="text-xs font-semibold">
                  {event.topic} · {event.state}
                </p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Attempts {event.attempts} · Available {formatDate(event.availableAt)}
                </p>
                {event.error && <p className="mt-2 text-xs">{event.error}</p>}
                {event.state === "failed" && <RetryEvent id={event.id} />}
              </article>
            ))}
          </div>
        </details>
        <details className="mt-8">
          <summary className="cursor-pointer font-serif text-xl">
            Recent operator audit trail
          </summary>
          <ol className="mt-4 space-y-3">
            {overview.audits.map((a) => (
              <li key={a.id} className="border-l border-border pl-4 text-[11px] leading-6">
                <p className="font-semibold">{a.action}</p>
                <p>{a.reason}</p>
                <p className="text-[10px] text-muted-foreground">
                  {a.createdAt.toISOString()} · Actor {a.actorId}
                </p>
              </li>
            ))}
          </ol>
        </details>
      </section>
    </div>
  );
}
