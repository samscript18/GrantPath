import Link from "next/link";
import { Shell } from "@/components/shell";
import { PageHeading } from "@/components/page-heading";
import { ScholarshipCard } from "@/components/scholarship-card";
import { SaveButton } from "@/components/save-button";
import { EmptyState } from "@/components/empty-state";
import { requireUser } from "@/server/accounts/session";
import { applications } from "@/server/applications";
export const metadata = { title: "Saved opportunities" };
export default async function Saved() {
  const actor = await requireUser();
  const rows = await applications(actor, true);
  return (
    <Shell actor={actor} active="/saved">
      <PageHeading
        eyebrow="KEEP THE POSSIBILITIES CLOSE"
        title="Worth coming back to."
        description="Your shortlist, at your own pace. Saved opportunities and personal progress belong only to you."
      />
      <div className="grid gap-8 xl:grid-cols-[1fr_260px]">
        <div className="paper px-5 py-6 sm:px-7">
          {rows.length ? (
            rows.map((a) => (
              <section key={a.id} className="mb-7 last:mb-0">
                <ScholarshipCard row={a.scholarship} />
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
                  <Link
                    href={`/scholarships/${a.scholarship.slug}#requirements`}
                    className="text-xs underline"
                  >
                    My progress: {a.status} ↗
                  </Link>
                  <SaveButton scholarshipId={a.scholarshipId} saved={a.saved} />
                </div>
              </section>
            ))
          ) : (
            <EmptyState title="Your shortlist starts with a possibility.">
              <p>
                Save an opportunity from its details page. It will be here when you’re ready to
                plan.
              </p>
              <Link href="/scholarships" className="mt-4 inline-block text-primary underline">
                Find an opportunity ↗
              </Link>
            </EmptyState>
          )}
        </div>
        <aside className="border-t-2 border-primary pt-5">
          <p className="eyebrow">A NOTE FOR YOUR NEXT STEP</p>
          <h2 className="mt-4 font-serif text-2xl">
            From “maybe”
            <br />
            to a plan.
          </h2>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            Move your preparation forward in My applications. Add notes, make a checklist and follow
            your progress.
          </p>
          <Link href="/applications" className="mt-5 inline-block text-xs underline">
            Open my applications ↗
          </Link>
          <p className="mt-6 text-[10px] leading-5 text-muted-foreground">
            Unsaving keeps your personal application record and stops future saved-only alerts.
          </p>
        </aside>
      </div>
    </Shell>
  );
}
