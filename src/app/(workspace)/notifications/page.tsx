import Link from "next/link";
import { ArrowUpRight, Bell, CalendarDays, RefreshCw, Compass } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { MarkRead } from "@/components/notification-controls";
import { requireUser } from "@/server/accounts/session";
import { getProfile } from "@/server/profiles";
import { inbox } from "@/server/notifications";
export const metadata = { title: "Your updates" };
export default async function Notifications({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const actor = await requireUser();
  const query = await searchParams;
  const unreadOnly = query.filter === "unread";
  const [data, profile] = await Promise.all([
    inbox(actor, { page: Number(query.page || 1), unread: unreadOnly }),
    getProfile(actor),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE DIRECTION, WHEN IT MATTERS"
        title="Keep your possibilities in view."
        description="Relevant updates, reviewed changes, and confirmed deadlines. Your preferences lead the way."
      >
        <Badge tone={data.unread ? "amber" : "neutral"}>{data.unread} unread</Badge>
      </PageHeading>
      <div className="grid items-start gap-8 xl:grid-cols-[1fr_300px]">
        <section>
          <div className="inbox-toolbar mb-5 flex flex-wrap items-center justify-between gap-3">
            <nav
              aria-label="Inbox filters"
              className="segmented-control flex gap-1 rounded-lg border border-border bg-paper p-1 text-xs"
            >
              <Link
                href="/notifications"
                aria-current={!unreadOnly ? "page" : undefined}
                className={`rounded-md px-4 py-2.5 ${!unreadOnly ? "bg-secondary font-semibold text-primary" : "text-muted-foreground"}`}
              >
                All updates
              </Link>
              <Link
                href="/notifications?filter=unread"
                aria-current={unreadOnly ? "page" : undefined}
                className={`rounded-md px-4 py-2.5 ${unreadOnly ? "bg-secondary font-semibold text-primary" : "text-muted-foreground"}`}
              >
                Unread
              </Link>
            </nav>
            {data.unread > 0 && <MarkRead />}
          </div>
          {data.rows.length ? (
            <div className="inbox-list paper px-5 sm:px-7">
              {data.rows.map((n) => {
                const Icon =
                  n.topic === "deadline"
                    ? CalendarDays
                    : n.topic === "change"
                      ? RefreshCw
                      : Compass;
                return (
                  <article
                    key={n.id}
                    className={`relative border-b border-border py-7 last:border-0 ${!n.readAt ? "notification-unread" : ""}`}
                  >
                    <div className="flex items-start gap-4">
                      <span
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/50 ${n.readAt ? "bg-muted" : "bg-secondary"}`}
                      >
                        <Icon size={17} strokeWidth={1.5} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="eyebrow text-[8px] text-muted-foreground">
                            {n.topic === "newMatch"
                              ? "New possibility"
                              : n.topic === "change"
                                ? "Accepted change"
                                : "Confirmed deadline"}
                          </p>
                          {!n.readAt && <Badge tone="amber">Unread</Badge>}
                        </div>
                        <h2 className="mt-3 font-serif text-xl leading-snug">{n.title}</h2>
                        <p className="mt-3 text-[13px] leading-7 text-muted-foreground">{n.body}</p>
                        <p className="mt-3 text-[10px] text-muted-foreground">
                          {new Intl.DateTimeFormat("en-GB", {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: profile.data.timeZone,
                          }).format(n.createdAt)}{" "}
                          · {profile.data.timeZone}
                        </p>
                        <div className="mt-4 flex flex-wrap justify-between gap-3">
                          <Link
                            href={n.href}
                            className="inline-flex items-center gap-2 text-xs font-semibold"
                          >
                            Inspect the evidence <ArrowUpRight size={13} />
                          </Link>
                          {!n.readAt && <MarkRead id={n.id} />}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title={unreadOnly ? "You’re all caught up." : "A quiet moment on your path."}
            >
              <Bell className="mx-auto my-4 text-primary/45" size={22} strokeWidth={1.3} />
              <p>
                {unreadOnly
                  ? "There are no unread updates. Your earlier updates are kept in All updates."
                  : "New relevant matches, reviewed changes to saved opportunities and confirmed deadline reminders will appear here when processed."}
              </p>
              <Link href="/scholarships" className="mt-4 inline-block underline">
                Explore opportunities ↗
              </Link>
            </EmptyState>
          )}
          {data.total > 20 && (
            <nav aria-label="Inbox pagination" className="mt-5 flex justify-between text-xs">
              {data.page > 1 ? (
                <Link
                  href={`/notifications?page=${data.page - 1}${unreadOnly ? "&filter=unread" : ""}`}
                >
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              <span>Page {data.page}</span>
              {data.page * 20 < data.total && (
                <Link
                  href={`/notifications?page=${data.page + 1}${unreadOnly ? "&filter=unread" : ""}`}
                >
                  Next →
                </Link>
              )}
            </nav>
          )}
        </section>
        <aside className="rounded-xl border border-border bg-secondary/45 p-6">
          <Bell size={25} strokeWidth={1.2} className="mb-6 text-leaf" aria-hidden="true" />
          <h2 className="mb-6 font-serif text-2xl">Your inbox, your terms.</h2>
          <p className="text-xs leading-7 text-muted-foreground">
            Choose the updates you want and where you receive them. Manage your topics and channels
            in Settings.
          </p>
          <Link
            href="/settings/notifications"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
          >
            Notification settings <ArrowUpRight size={14} />
          </Link>
        </aside>
      </div>
    </>
  );
}
