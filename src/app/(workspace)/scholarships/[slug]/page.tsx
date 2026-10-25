import { ProviderImage } from "@/components/provider-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  MapPin,
  GraduationCap,
  CalendarDays,
  ShieldCheck,
  CircleHelp,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { currentUser } from "@/server/accounts/session";
import { scholarshipBySlug } from "@/server/scholarships";
import { evidenceHealth } from "@/server/evidence";
import { fundingLabels, scholarshipDataSchema } from "@/server/scholarships/schema";
import { ChangeTimeline } from "@/components/change-timeline";
import { formatDate, formatTimestamp } from "@/lib/utils";
import { applicationForScholarship } from "@/server/applications";
import { SaveButton } from "@/components/save-button";
import { ApplicationEditor } from "@/components/application-editor";
import { studentAssessment } from "@/server/eligibility";
import { Assessment } from "@/components/assessment";
import { Recalculate } from "@/components/recalculate";
import { getProfile } from "@/server/profiles";
import type { Rule } from "@/server/eligibility/rules";
import { OpportunitySections } from "@/components/opportunity-sections";
function Rules({ rule }: { rule: Rule }) {
  return rule.kind === "requirement" ? (
    <li className="flex gap-3 border-b border-border py-4">
      <CircleHelp size={16} className="mt-0.5 shrink-0 text-warning-foreground" />
      <div>
        <p className="text-sm">{rule.label}</p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {rule.verified
            ? "Official condition · add your profile to assess"
            : "Needs provider confirmation"}{" "}
          ·{" "}
          <a href={`#evidence-${rule.evidenceKey}`} className="underline">
            Evidence
          </a>
        </p>
      </div>
    </li>
  ) : (
    <li>
      <p className="eyebrow mt-5 text-muted-foreground">
        {rule.label} · {rule.kind === "all" ? "all required" : "any alternative"}
      </p>
      <ul>
        {rule.rules.map((r) => (
          <Rules key={r.id} rule={r} />
        ))}
      </ul>
    </li>
  );
}
export default async function ScholarshipDetail({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ version?: string; evaluation?: string }>;
}) {
  const { slug } = await params;
  const [actor, s] = await Promise.all([currentUser(), scholarshipBySlug(slug)]);
  if (!s) notFound();
  const query = await searchParams;
  const requested = query.version;
  const selected = requested
    ? s.versions.find((v) => String(v.number) === requested)
    : s.versions[0];
  if (!selected) notFound();
  const historical = selected.number !== s.version;
  const [match, application, viewerProfile] = actor
    ? await Promise.all([
        studentAssessment(actor, s.id, selected.number, query.evaluation),
        applicationForScholarship(actor, s.id),
        getProfile(actor),
      ])
    : [null, null, null];
  const viewerTimeZone = viewerProfile?.data.timeZone || "UTC";
  const d = scholarshipDataSchema.parse(selected.data);
  const health = evidenceHealth(d);
  return (
    <>
      <Link
        href="/scholarships"
        className="mb-7 flex w-fit items-center gap-2 text-xs text-muted-foreground"
      >
        <ArrowLeft size={13} />
        Back to scholarships
      </Link>
      {historical && (
        <div className="mb-6 border-l-2 border-accent bg-warning p-4 text-xs leading-6">
          You’re inspecting accepted version {selected.number}. Its evidence and assessment are
          historical; the current application window is shown separately.{" "}
          <Link href={`/scholarships/${s.slug}`} className="font-semibold underline">
            Return to the current record ↗
          </Link>
        </div>
      )}
      <header className="detail-hero relative overflow-hidden rounded-2xl border border-border bg-paper px-6 py-7 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto flex min-w-0 items-center gap-4">
            <ProviderImage provider={s.programme.provider} className="size-18 text-5xl" />
            <div>
              <p className="eyebrow text-muted-foreground">{s.programme.provider.name}</p>
              {s.programme.provider.imageSourceUrl && (
                <a
                  href={s.programme.provider.imageSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-[10px] text-muted-foreground underline underline-offset-4"
                >
                  Image source
                </a>
              )}
            </div>
          </div>
          <Badge tone={s.currentAvailability === "open" ? "green" : "amber"}>
            {s.currentAvailability === "unknown"
              ? "Availability to confirm"
              : `${s.currentAvailability[0].toUpperCase()}${s.currentAvailability.slice(1)}`}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{s.cycle}</span>
        </div>
        <h1 className="editorial relative mt-5 max-w-3xl text-[36px] leading-[1.12] sm:text-[48px]">
          {d.title}
        </h1>
        <div className="mt-5 flex flex-wrap gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <MapPin size={14} />
            {s.destination}
          </span>
          <span className="flex items-center gap-2">
            <GraduationCap size={15} />
            {d.levels.join(" / ")}
          </span>
          <span>{d.fields.join(" · ")}</span>
        </div>
      </header>
      <div className="scholarship-detail mt-9 grid grid-cols-1 gap-9 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <OpportunitySections key={`${s.id}:${selected.number}`} />
          <section id="overview">
            <p className="text-sm leading-7 text-muted-foreground">{d.summary}</p>
            {d.recordKind === "overview" && (
              <p className="mt-4 rounded-lg border border-border bg-secondary p-4 text-xs leading-6">
                Scheme overview. This is guidance about the programme; an application cycle and
                opening date have not been confirmed.
              </p>
            )}
            {d.studyLocations && (
              <div className="mt-6">
                <h2 className="font-serif text-xl">Where you could study</h2>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {d.studyLocations.scope === "participating"
                    ? "Locations depend on your chosen programme pathway; you will not necessarily study in every listed country."
                    : "Study locations listed in the official programme information."}
                </p>
                <ul className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  {d.studyLocations.institutions.map((institution) => (
                    <li
                      key={institution.name}
                      className="border-l-2 border-primary/20 pl-3 leading-6"
                    >
                      {institution.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="funding-panel mt-7 rounded-xl border border-primary/10 bg-secondary/65 p-6 sm:p-7">
              <p className="eyebrow text-muted-foreground">WHAT THE AWARD SUPPORTS</p>
              <h2 className="mt-3 font-serif text-2xl">{fundingLabels[d.fundingType]}</h2>
              <p className="mt-3 text-sm leading-6">{d.fundingSummary}</p>
              <ul className="mt-4 space-y-2">
                {d.funding.map((f, i) => (
                  <li key={i} className="flex gap-3 text-xs leading-6">
                    <span className="capitalize text-muted-foreground">{f.component}:</span>
                    {f.description}
                  </li>
                ))}
              </ul>
              <a
                href="#evidence-funding"
                className="mt-4 inline-flex items-center gap-2 text-xs underline underline-offset-4"
              >
                Inspect funding evidence <ArrowUpRight size={12} />
              </a>
            </div>
          </section>
          <section id="requirements" className="mt-12">
            <p className="eyebrow text-muted-foreground">KNOW WHERE YOU STAND</p>
            <h2 className="editorial mt-3 text-3xl">A clearer look at the requirements.</h2>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              Eligibility and application availability are assessed separately. Missing information
              requires confirmation, rather than silently passing.
            </p>
            <div>
              {match?.evaluation ? (
                <Assessment
                  assessment={match.evaluation.assessment}
                  profileVersion={match.evaluation.profileVersion}
                  scholarshipVersion={match.evaluation.scholarshipVersion}
                  current={match.current}
                />
              ) : (
                <ul>
                  <Rules rule={d.requirements} />
                </ul>
              )}
              {actor && !match?.current && !historical && (
                <div className="mt-5">
                  <Recalculate pending={1} />
                </div>
              )}
            </div>
            <Button asChild variant="outline" className="mt-5">
              <Link href={actor ? "/profile" : "/register"}>
                Personalise this assessment <ArrowUpRight size={14} />
              </Link>
            </Button>
          </section>
          <section id="evidence" className="evidence-section mt-12">
            <p className="eyebrow text-muted-foreground">FOLLOW THE SOURCE</p>
            <h2 className="editorial mt-3 text-3xl">Evidence you can inspect.</h2>
            <p className="mt-3 mb-5 text-xs leading-6 text-muted-foreground">
              Supporting wording from the official provider. Version {selected.number}, accepted{" "}
              {formatDate(selected.createdAt)}. Unresolved fields are clearly labelled.
            </p>
            {d.evidence.map((e, i) => (
              <article
                id={`evidence-${e.field}`}
                key={`${e.field}-${i}`}
                className="evidence-entry mt-4 rounded-xl border border-border bg-paper p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold capitalize">
                    {e.field.replaceAll("-", " ")}
                  </h3>
                  <Badge tone={e.state === "verified" ? "green" : "amber"}>
                    {e.state === "verified"
                      ? "Checked against official source"
                      : e.state === "conflicting"
                        ? "Conflicting information"
                        : e.state === "unavailable"
                          ? "Source unavailable"
                          : "Needs confirmation"}
                  </Badge>
                </div>
                {e.state === "verified" ? (
                  <blockquote className="mt-3 border-l-2 border-accent/60 pl-4 font-serif text-base leading-7">
                    {e.passage}
                  </blockquote>
                ) : (
                  <p className="mt-3 border-l-2 border-accent/60 pl-4 text-xs leading-7">
                    <span className="font-semibold">Recorded uncertainty: </span>
                    {e.passage}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap justify-between gap-2 text-[10px] text-muted-foreground">
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1 break-all underline"
                  >
                    {new URL(e.url).hostname}
                    <ExternalLink size={10} />
                  </a>
                  <span>
                    {e.state === "verified" ? "Checked" : "Recorded"} {formatDate(e.retrievedAt)}
                  </span>
                </div>
              </article>
            ))}
          </section>
          <section id="history" className="mt-12">
            <p className="eyebrow text-muted-foreground">THE ACCEPTED RECORD</p>
            <h2 className="editorial mt-3 mb-5 text-3xl">A path you can trace.</h2>
            <ChangeTimeline
              slug={s.slug}
              versions={s.versions.map((v) => ({
                ...v,
                data: scholarshipDataSchema.parse(v.data),
              }))}
            />
          </section>
        </div>
        <aside>
          <div className="application-panel paper p-6 xl:sticky xl:top-24 xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto">
            <p className="eyebrow flex items-center gap-2 text-muted-foreground">
              <CalendarDays size={14} />
              APPLICATION TIMING
            </p>
            <h2 className="mt-4 font-serif text-2xl">
              {d.deadline ? formatDate(d.deadline, viewerTimeZone) : "Check the closing date"}
            </h2>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              {d.deadlineLabel || "A closing date has not been confirmed."}
            </p>
            {d.deadline && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                Closes{" "}
                {new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: viewerTimeZone,
                }).format(new Date(d.deadline))}{" "}
                · {viewerTimeZone}
              </p>
            )}
            {d.deadlineState !== "confirmed" && (
              <p className="mt-3 flex gap-2 text-[11px] leading-5 text-warning-foreground">
                <CircleHelp size={14} className="mt-0.5 shrink-0" />
                No exact countdown or reminder until the closing instant is confirmed.
              </p>
            )}
            <div className="mt-6 flex items-center gap-2.5">
              <Button asChild className="min-w-0 flex-1">
                <a
                  href={d.applicationUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Official application guidance"
                >
                  Official guidance <ArrowUpRight size={14} />
                </a>
              </Button>
              {actor ? (
                <SaveButton
                  scholarshipId={s.id}
                  saved={application?.saved || false}
                  title={s.title}
                />
              ) : (
                <Button asChild variant="outline" size="icon" className="shrink-0 rounded-full">
                  <Link
                    href="/login"
                    aria-label={`Sign in to save ${s.title}`}
                    title="Sign in to save"
                  >
                    <Bookmark size={18} strokeWidth={1.6} />
                  </Link>
                </Button>
              )}
            </div>
            {application && (
              <details className="mt-5 border-t border-border pt-4">
                <summary className="cursor-pointer text-xs font-semibold">
                  My application plan · {application.status}
                </summary>
                <div className="mt-5">
                  <ApplicationEditor key={application.id} application={application} />
                </div>
              </details>
            )}
            <div className="mt-6 border-t border-border pt-5">
              <p className="flex items-center gap-2 text-xs">
                <ShieldCheck size={15} />
                Evidence & source freshness
              </p>
              <p className="mt-3 text-[11px] leading-6 text-muted-foreground">
                Accepted evidence checked: {formatDate(health.lastVerified)}
                {health.stale ? " · A fresh check is needed." : ""}
              </p>
              {s.monitored.length > 0 &&
                s.monitored.map((source) => (
                  <div
                    key={source.id}
                    className="mt-3 border-t border-border pt-3 text-[10px] leading-6 text-muted-foreground"
                  >
                    <p>
                      {source.directory.enabled
                        ? `${source.directory.cadenceHours}-hour target cadence`
                        : "Scheduled checks paused"}
                    </p>
                    <p>
                      Programme last successfully checked:{" "}
                      {formatTimestamp(source.observations[0]?.retrievedAt)}
                    </p>
                    <p>
                      Directory latest attempt: {formatTimestamp(source.directory.lastAttemptAt)}
                    </p>
                    <p>
                      Directory last successful check:{" "}
                      {formatTimestamp(source.directory.lastSuccessAt)}
                    </p>
                    {source.state === "failed" && (
                      <p>
                        A new programme check could not finish. Previously accepted information is
                        retained.
                      </p>
                    )}
                    {source.state === "review" && (
                      <p>
                        New information needs confirmation; the accepted details above are retained.
                      </p>
                    )}
                  </div>
                ))}
              {s.sources.length ? (
                s.sources.map((source) => (
                  <div
                    key={source.id}
                    className="mt-3 border-t border-border pt-3 text-[10px] leading-6 text-muted-foreground"
                  >
                    <p>
                      {source.enabled
                        ? `${source.cadenceHours}-hour target cadence`
                        : "Scheduled checks not enabled"}{" "}
                      · {source.health.replaceAll("_", " ")}
                    </p>
                    <p>Latest attempt: {formatTimestamp(source.lastAttemptAt)}</p>
                    <p>Last successful check: {formatTimestamp(source.lastSuccessAt)}</p>
                  </div>
                ))
              ) : !s.monitored.length ? (
                <p className="mt-3 text-[10px] leading-5 text-muted-foreground">
                  Manually researched. Automated monitoring is not supported for this source.
                </p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
