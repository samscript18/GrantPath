import { OperatorCatalogue } from "@/components/operator-catalogue";
import { OperatorWorkspace } from "@/components/operator-workspace";
import { ArrowUpRight, BookOpen, Radio, ScanLine, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        title="Operator Studio"
        description="Manage scholarships, review changes and check source health."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/scholarships">
            View catalogue <ArrowUpRight size={15} />
          </Link>
        </Button>
      </PageHeading>
      <div className="studio-metrics">
        {[
          {
            value: overview.scholarships.length,
            label: "Catalogue records",
            icon: BookOpen,
            note: "Accepted records & drafts",
          },
          {
            value: overview.discovery.directories.length,
            label: "Discovery directories",
            icon: Radio,
            note: `${overview.sources.length} registered detail sources`,
          },
          {
            value: overview.reviews.length + discoveryReviews,
            label: "Awaiting review",
            icon: ScanLine,
            note: "Discovery & source changes",
          },
          {
            value: overview.failures.length,
            label: "Delivery follow-up",
            icon: Send,
            note: "Pending, failed or uncertain",
          },
        ].map(({ value, label, icon: Icon, note }) => (
          <div key={label} className="studio-metric">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon size={17} strokeWidth={1.5} className="text-leaf" aria-hidden="true" />
            </div>
            <p className="my-3 font-serif text-4xl tracking-tight">{value}</p>
            <p className="text-[11px] text-muted-foreground">{note}</p>
          </div>
        ))}
      </div>
      <OperatorWorkspace
        key={edit || publication || "workspace"}
        initialSection={edit ? "catalogue" : "discovery"}
        counts={{
          catalogue: overview.scholarships.length,
          reviews: overview.reviews.length,
          deliveries: overview.failures.length,
        }}
        panels={{
          operations: (
            <section id="operations" className="space-y-6">
              <div className="studio-section-heading">
                <p className="eyebrow text-leaf">DURABLE WORKFLOWS</p>
                <h2>Application jobs</h2>
                <p>Process waiting updates and notifications.</p>
              </div>
              <ProcessJobs initialQueue={overview.queue} />
              {controlledFixturesEnabled() && <ControlledSourceControls />}
              {controlledFixturesEnabled() && (
                <p className="my-4 border border-amber/30 bg-secondary p-4 text-xs">
                  Isolated release verification is enabled. Controlled snapshots require an
                  authenticated operator; fictional records are labelled [TEST ONLY] and cannot
                  notify real email accounts.
                </p>
              )}
            </section>
          ),
          discovery: (
            <section id="discovery" className="mb-9 space-y-5">
              <div className="studio-section-heading">
                <p className="eyebrow text-muted-foreground">OFFICIAL SOURCES</p>
                <h2 className="mt-3 font-serif text-3xl">Scholarship discovery</h2>
                <p className="mt-3 text-xs leading-6 text-muted-foreground">
                  Sources run outside the app. Pause retrieval or automatic publication
                  independently; accepted records and evidence are retained.
                </p>
              </div>
              <div className="flex flex-wrap gap-2" aria-label="Discovery shortcuts">
                <a className="studio-edit-button" href="#discovery-exceptions">
                  Exceptions <span className="ml-2 text-muted-foreground">{discoveryReviews}</span>
                </a>
                <a className="studio-edit-button" href="#automatic-publications">
                  Publication history
                </a>
              </div>
              <details className="paper p-6">
                <summary className="cursor-pointer text-sm font-medium">Available sources</summary>
                <p className="mt-3 text-xs text-muted-foreground">
                  Add a reason when changing a source. Access rules are checked on every visit.
                </p>
                <p className="mt-3 text-xs">
                  Adapters: {overview.discovery.adapters.map((adapter) => adapter.id).join(", ")}
                </p>
                <div className="mt-4 space-y-4">
                  {overview.discovery.availableDirectories
                    .filter((source) => source.id !== "controlled-release")
                    .map((source) => (
                      <article key={source.id} className="border-t pt-3">
                        <h3 className="text-sm font-medium">
                          {source.id} · {source.registered ? "Registered" : "Not registered"}
                        </h3>
                        <p className="mt-2 text-xs">
                          {source.directoryAdapter} / {source.detailAdapter}
                        </p>
                        {source.review && (
                          <>
                            <p className="mt-2 text-xs">
                              Reviewed {source.review.reviewedAt}: {source.review.rationale}
                            </p>
                            <ul className="mt-2 list-disc pl-5 text-xs">
                              {source.review.limitations.map((limitation) => (
                                <li key={limitation}>{limitation}</li>
                              ))}
                            </ul>
                          </>
                        )}
                        {!source.registered && source.supported && (
                          <DiscoveryControls
                            directory={{ id: source.id, enabled: false, autoPublish: false }}
                          />
                        )}
                      </article>
                    ))}
                </div>
              </details>
              {!overview.discovery.directories.length && (
                <p className="paper p-6 text-sm">
                  No discovery policies registered. Use the approved-directory CLI to register a
                  reviewed source.
                </p>
              )}
              <div className="studio-source-grid grid gap-4 xl:grid-cols-2">
                {overview.discovery.directories.map((directory) => (
                  <article key={directory.id} className="paper p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-serif text-xl capitalize break-words">
                        {directory.id.replaceAll("-", " ")}
                      </h3>
                      <Badge tone={directory.health === "healthy" ? "green" : "amber"}>
                        {directory.health.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <a
                      className="action-link mt-3"
                      href={directory.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Visit official directory ↗
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
                        <p key={check.id} className="mt-3 text-xs text-danger-foreground">
                          {check.error}
                        </p>
                      ))}
                    <details className="mt-5 border-t border-border pt-4">
                      <summary className="cursor-pointer text-xs font-semibold">
                        Manage source policy
                      </summary>
                      <DiscoveryControls directory={directory} />
                    </details>
                  </article>
                ))}
              </div>
              <details id="discovery-exceptions" className="paper p-6" open={discoveryReviews > 0}>
                <summary className="cursor-pointer font-serif text-xl">
                  Candidates to review ({overview.discovery.candidates.length})
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
                      {candidate.error && (
                        <p className="mt-3 text-xs text-danger-foreground">{candidate.error}</p>
                      )}
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
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs font-semibold">
                            Retrieval controls
                          </summary>
                          <DiscoveryControls candidate={candidate.id} />
                        </details>
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
                  {publication ? "Publication history" : "Recently published"} (
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
                      <h3 className="font-serif text-lg">
                        {decision.title || "Accepted opportunity"}
                      </h3>
                      <p>
                        {decision.baseVersion === 0 ? "New scholarship" : "Updated scholarship"} ·
                        Version {decision.resultingVersion} · {formatTimestamp(decision.createdAt)}
                      </p>
                      <p>{decision.reasonCodes.join(" · ")}</p>
                      <p className="text-muted-foreground">
                        {decision.policyVersion} · {decision.actorId} · {decision.eventIds.length}{" "}
                        durable event(s)
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
                          {JSON.stringify(
                            { before: decision.before, after: decision.after },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    </li>
                  ))}
                </ol>
              </details>
              <details className="paper p-6">
                <summary className="cursor-pointer text-sm font-medium">
                  Checked, no changes ({overview.discovery.recentChecks.length})
                </summary>
                <ol className="mt-3 space-y-2 text-xs">
                  {overview.discovery.recentChecks.map((check) => (
                    <li key={check.id}>
                      {check.title || "Accepted opportunity"} · Unchanged · Version{" "}
                      {check.resultingVersion} · {formatTimestamp(check.createdAt)}
                    </li>
                  ))}
                </ol>
              </details>
            </section>
          ),
          catalogue: (
            <>
              {selected ? (
                <section className="paper mb-8 p-6">
                  <div className="mb-6 flex justify-between">
                    <h2 className="font-serif text-2xl">Edit {selected.title}</h2>
                    <Link href="/operator#catalogue" className="studio-edit-button">
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
                  <summary className="cursor-pointer font-serif text-xl">Add a scholarship</summary>
                  <div className="mt-6">
                    <OperatorEditor />
                  </div>
                </details>
              )}
              <section id="catalogue">
                <div className="studio-section-heading">
                  <p className="eyebrow text-leaf">CATALOGUE</p>
                  <h2 className="mt-3 font-serif text-3xl">Scholarship catalogue</h2>
                </div>
                <OperatorCatalogue
                  records={overview.scholarships.map(
                    ({ id, slug, title, cycle, version, published, availability }) => ({
                      id,
                      slug,
                      title,
                      cycle,
                      version,
                      published,
                      availability,
                    }),
                  )}
                />
              </section>
              <details id="provider-images" className="paper mt-6 mb-8 p-6 sm:p-8">
                <summary className="cursor-pointer font-serif text-2xl">Provider images</summary>
                <p className="mt-3 text-xs leading-7 text-muted-foreground">
                  Add an official logo or provider image once. It appears across their scholarships,
                  including students’ saved opportunities. Keep a link to its official source.
                </p>
                <div className="mt-4">
                  {[
                    ...new Map(
                      overview.scholarships.map((s) => [
                        s.programme.provider.id,
                        s.programme.provider,
                      ]),
                    ).values(),
                  ].map((provider) => (
                    <ProviderImageEditor
                      key={provider.id}
                      provider={{ ...provider, version: providerImageVersion(provider.imageUrl) }}
                    />
                  ))}
                </div>
              </details>
            </>
          ),
          sources: (
            <section id="sources" className="studio-section">
              <div className="studio-section-heading">
                <p className="eyebrow text-leaf">OFFICIAL SOURCE MONITORING</p>
                <h2>Source registry</h2>
              </div>
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
                      <p>
                        {source.requestedAt ? "Manual check queued" : "No manual check pending"}
                      </p>
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
          ),
          reviews: (
            <section id="reviews" className="studio-section">
              <div className="studio-section-heading">
                <p className="eyebrow text-leaf">REVIEW CHANGES</p>
                <h2>Review source changes</h2>
              </div>
              <div
                className={
                  overview.reviews.length ? "mt-3 text-sm text-muted-foreground" : "studio-empty"
                }
              >
                {!overview.reviews.length && (
                  <ScanLine size={24} className="mx-auto mb-4 text-leaf" aria-hidden="true" />
                )}
                <p>
                  {overview.reviews.length
                    ? `${overview.reviews.length} candidate changes await review.`
                    : "No candidate changes awaiting review."}
                </p>
                {!overview.reviews.length && (
                  <p>New source changes will appear here with their supporting evidence.</p>
                )}
              </div>
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
          ),
          deliveries: (
            <section id="deliveries" className="studio-section">
              <div className="studio-section-heading">
                <p className="eyebrow text-leaf">DELIVERY STATUS</p>
                <h2>Delivery & activity</h2>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {overview.failures.length} pending or failed deliveries · {overview.events.length}{" "}
                pending events.
              </p>
              <p className="mt-3 text-[11px] leading-6 text-muted-foreground">
                Email “accepted” means the provider accepted the request, not recipient receipt.
                Local “captured” messages stay in the isolated sink. Uncertain requests are held for
                provider investigation.
              </p>
              {!overview.failures.length && (
                <div className="studio-empty">
                  <Send size={22} className="mx-auto mb-3 text-leaf" aria-hidden="true" />
                  <h3>No delivery follow-up</h3>
                  <p>
                    No pending, failed or uncertain deliveries were returned by the latest check.
                  </p>
                </div>
              )}
              <div className="mt-5 space-y-4">
                {overview.failures.map((delivery) => (
                  <article key={delivery.id} className="paper p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-xs font-semibold">{delivery.subject}</h3>
                      <Badge
                        tone={
                          delivery.state === "failed" || delivery.state === "uncertain"
                            ? "red"
                            : "amber"
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
                      <summary className="cursor-pointer text-[11px] underline">
                        Attempt history
                      </summary>
                      {delivery.history.map((attempt) => (
                        <p key={attempt.id} className="mt-2 text-[10px] leading-5">
                          Attempt {attempt.number}: {attempt.state} ·{" "}
                          {attempt.createdAt.toISOString()}
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
                  Completed events remain here after processing. The pending count above tracks
                  unfinished work.
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
                        {event.completedAt && (
                          <> · Completed {formatTimestamp(event.completedAt)}</>
                        )}
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
          ),
        }}
      />
    </div>
  );
}
