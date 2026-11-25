import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { ScholarshipCard } from "@/components/scholarship-card";
import { SaveButton } from "@/components/save-button";
import { EmptyState } from "@/components/empty-state";
import { requireUser } from "@/server/accounts/session";
import { applications } from "@/server/applications";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Bookmark } from "lucide-react";
export const metadata = { title: "Saved opportunities" };
export default async function Saved() {
  const actor = await requireUser();
  const rows = await applications(actor, true);
  return (
    <>
      <PageHeading
        eyebrow="KEEP THE POSSIBILITIES CLOSE"
        title="Saved scholarships"
        description="Keep your favourite scholarships here, then plan your applications."
      >
        <Badge>
          {rows.length} saved {rows.length === 1 ? "opportunity" : "opportunities"}
        </Badge>
      </PageHeading>
      <div className="grid gap-8 xl:grid-cols-[1fr_260px]">
        <div className="space-y-5">
          {rows.length ? (
            rows.map((a) => (
              <section key={a.id} className="saved-opportunity paper overflow-hidden px-5 sm:px-7">
                <ScholarshipCard
                  row={a.scholarship}
                  action={
                    <SaveButton
                      scholarshipId={a.scholarshipId}
                      saved={a.saved}
                      title={a.scholarship.title}
                    />
                  }
                />
                <div className="-mx-5 flex flex-wrap items-center justify-between gap-4 border-t border-border bg-muted/35 px-5 py-4 sm:-mx-7 sm:px-7">
                  <Link
                    href={`/applications?view=list#application-${a.id}`}
                    className="inline-flex items-center gap-2 text-xs font-medium"
                  >
                    <span className="text-muted-foreground">My plan</span>
                    <Badge>{a.status}</Badge>
                    <span>Open plan</span>
                    <ArrowUpRight size={13} />
                  </Link>
                </div>
              </section>
            ))
          ) : (
            <EmptyState title="No saved scholarships yet">
              <p>Use the bookmark button on a scholarship to save it here.</p>
              <Link href="/scholarships" className="action-link mt-5">
                Find an opportunity ↗
              </Link>
            </EmptyState>
          )}
        </div>
        <aside className="guide-note self-start rounded-xl border border-border bg-secondary/45 p-6">
          <Bookmark size={24} strokeWidth={1.3} className="mb-6 text-leaf" aria-hidden="true" />
          <p className="eyebrow">A NOTE FOR YOUR NEXT STEP</p>
          <h2 className="mt-4 font-serif text-2xl">
            From “maybe”
            <br />
            to a plan.
          </h2>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            Add notes, create a checklist and track your progress in My applications.
          </p>
          <Link href="/applications" className="action-link mt-5">
            Open my applications ↗
          </Link>
          <p className="mt-6 text-[10px] leading-5 text-muted-foreground">
            Unsaving keeps your personal application record and stops future saved-only alerts.
          </p>
        </aside>
      </div>
    </>
  );
}
