import { ProviderImage } from "@/components/provider-image";
import Link from "next/link";
import { ArrowUpRight, List, Columns3, ArrowRight, ShieldCheck } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/empty-state";
import { ApplicationEditor } from "@/components/application-editor";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/server/accounts/session";
import { applications, statuses } from "@/server/applications";
import { formatDate } from "@/lib/utils";
export const metadata = { title: "My applications" };
export default async function Applications({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const actor = await requireUser();
  const rows = await applications(actor);
  const { view } = await searchParams;
  const list = view === "list";
  return (
    <>
      <PageHeading
        eyebrow="POSSIBILITY, WITH A PLAN"
        title="Your applications, in motion."
        description="Organise your preparation, keep your notes close, and see how far you’ve come."
      >
        <div className="segmented-control flex gap-1 rounded-lg border border-border bg-paper p-1">
          <Link
            aria-label="Board view"
            aria-current={!list ? "page" : undefined}
            href="/applications"
            className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-xs ${!list ? "bg-secondary font-semibold text-primary" : "text-muted-foreground"}`}
          >
            <Columns3 size={13} />
            Board
          </Link>
          <Link
            aria-label="List view"
            aria-current={list ? "page" : undefined}
            href="/applications?view=list"
            className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-xs ${list ? "bg-secondary font-semibold text-primary" : "text-muted-foreground"}`}
          >
            <List size={13} />
            List
          </Link>
        </div>
      </PageHeading>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-paper px-4 py-3.5 text-[11px] leading-6 text-muted-foreground">
        <p className="flex items-center gap-2">
          <ShieldCheck size={14} className="shrink-0 text-leaf" aria-hidden="true" />
          Your private preparation space. Personal stages are separate from provider availability.
        </p>
        {!list && rows.length > 0 && (
          <span className="flex items-center gap-2">
            Scroll to explore stages <ArrowRight size={13} aria-hidden="true" />
          </span>
        )}
      </div>
      {!rows.length ? (
        <EmptyState title="Every application begins with a first step.">
          <p>
            Save a scholarship to start a personal plan. Your notes and checklist will stay private.
          </p>
          <Link href="/scholarships" className="mt-4 inline-block text-primary underline">
            Find your first opportunity ↗
          </Link>
        </EmptyState>
      ) : (
        <div
          role={list ? undefined : "region"}
          aria-label={list ? undefined : "Application board"}
          tabIndex={list ? undefined : 0}
          className={list ? "application-list space-y-8" : "application-board"}
        >
          {statuses.map((status) => {
            const entries = rows.filter((a) => a.status === status);
            if (list && !entries.length) return null;
            return (
              <section
                key={status}
                className={`${list ? "" : "board-column rounded-xl bg-muted/55 p-4"}`}
              >
                <div className="board-stage-heading mb-4 flex items-center gap-2 border-b border-border pb-4">
                  <span
                    className={`size-1.5 rounded-full ${status === "Awarded" ? "bg-primary" : status === "Applied" ? "bg-accent" : "bg-primary/35"}`}
                  />
                  <h2 className="text-xs font-semibold">{status}</h2>
                  <span className="ml-auto flex size-6 items-center justify-center rounded-full border border-border bg-paper text-[10px] text-muted-foreground">
                    {entries.length}
                  </span>
                </div>
                <div className={list ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-4"}>
                  {entries.length ? (
                    entries.map((a) => (
                      <article
                        id={`application-${a.id}`}
                        className="application-card paper p-5"
                        key={a.id}
                      >
                        <div className="flex items-center gap-3">
                          <ProviderImage
                            provider={a.scholarship.programme.provider}
                            className="size-10 text-3xl"
                          />
                          <p className="eyebrow text-[8px] leading-5 text-muted-foreground">
                            {a.scholarship.programme.provider.name}
                          </p>
                        </div>
                        <Link
                          href={`/scholarships/${a.scholarship.slug}`}
                          className="mt-3 flex justify-between gap-2 font-serif text-xl leading-tight"
                        >
                          {a.scholarship.title}
                          <ArrowUpRight size={14} className="mt-1 shrink-0" />
                        </Link>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge
                            tone={
                              a.scholarship.currentAvailability === "open" ? "green" : "neutral"
                            }
                          >
                            Provider: {a.scholarship.currentAvailability}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {a.scholarship.cycle}
                          </span>
                        </div>
                        <p className="mt-3 text-[10px] leading-5 text-muted-foreground">
                          {a.scholarship.deadline
                            ? `Confirmed close: ${formatDate(a.scholarship.deadline)}`
                            : "Closing instant to confirm"}
                        </p>
                        <div className="application-preparation mt-4 border-t border-border pt-4">
                          <p className="text-[10px] text-muted-foreground">
                            {a.checklist.filter((c) => c.done).length} of {a.checklist.length}{" "}
                            preparation steps checked
                          </p>
                          {a.checklist.length > 0 && (
                            <div
                              className="mt-3 h-1 overflow-hidden rounded-full bg-muted"
                              aria-hidden="true"
                            >
                              <div
                                className="h-full rounded-full bg-leaf"
                                style={{
                                  width: `${(a.checklist.filter((c) => c.done).length / a.checklist.length) * 100}%`,
                                }}
                              />
                            </div>
                          )}
                          <details className="plan-editor mt-4">
                            <summary className="cursor-pointer rounded-md border border-border bg-muted/35 px-3 py-2.5 text-xs font-medium">
                              Edit my plan
                            </summary>
                            <div className="mt-5">
                              <ApplicationEditor key={a.id} application={a} />
                            </div>
                          </details>
                          <details className="mt-3">
                            <summary className="cursor-pointer text-[10px] text-muted-foreground">
                              Progress history
                            </summary>
                            <ol className="mt-3 space-y-2 border-l border-border pl-3">
                              {a.history.map((h) => (
                                <li key={h.id} className="text-[10px] leading-5">
                                  {h.fromStatus ? `${h.fromStatus} → ` : "Started: "}
                                  {h.toStatus}
                                  <span className="block text-muted-foreground">
                                    {formatDate(h.createdAt)}
                                  </span>
                                </li>
                              ))}
                            </ol>
                          </details>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="rounded-lg border border-dashed border-border px-3 py-10 text-center text-[11px] leading-6 text-muted-foreground">
                      No opportunities at this stage yet.
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
