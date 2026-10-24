import { currentUser } from "@/server/accounts/session";
import { savedOpportunityIds } from "@/server/applications";
import { SaveButton } from "@/components/save-button";
import Link from "next/link";
import Form from "next/form";
import {
  Search,
  SlidersHorizontal,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Bookmark,
} from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScholarshipCard } from "@/components/scholarship-card";
import { EmptyState } from "@/components/empty-state";
import { catalogue } from "@/server/scholarships";
export const metadata = { title: "Discover scholarships" };
export default async function Scholarships({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const result = await catalogue(query);
  const actor = await currentUser();
  const savedIds = actor
    ? await savedOpportunityIds(
        actor,
        result.rows.map((row) => row.id),
      )
    : [];
  const { filters: f } = result;
  const pageLink = (page: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v) p.set(k, String(v));
    p.set("page", String(page));
    return `/scholarships?${p}`;
  };
  return (
    <>
      <PageHeading
        eyebrow="A WORLD OF POSSIBILITY"
        title="Find your next chapter."
        description="Real scholarships. Official evidence. A clearer view of what’s possible."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/profile">
            Personalise my matches <ArrowUpRight size={14} />
          </Link>
        </Button>
      </PageHeading>
      <div className="grid gap-8 xl:grid-cols-[1fr_260px]">
        <div>
          <Form
            className="catalogue-filters paper mb-6 space-y-4 p-4 sm:p-5"
            action="/scholarships"
            scroll={false}
          >
            <div className="relative">
              <Search className="absolute top-3.5 left-4 text-muted-foreground" size={17} />
              <Input
                name="q"
                aria-label="Search scholarships"
                defaultValue={f.q}
                placeholder="A scholarship, university, or field of possibility…"
                className="h-12 bg-paper pl-11 pr-22"
              />
              <Button size="sm" className="absolute top-1.5 right-1.5">
                Search
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <label className="sr-only" htmlFor="destination">
                Destination
              </label>
              <select
                className="form-select text-xs"
                id="destination"
                name="destination"
                defaultValue={f.destination}
              >
                <option value="">All destinations</option>
                {result.destinations.map((d) => (
                  <option key={d.destination}>{d.destination}</option>
                ))}
              </select>
              <label className="sr-only" htmlFor="level">
                Study level
              </label>
              <select
                id="level"
                name="level"
                className="form-select text-xs"
                defaultValue={f.level}
              >
                <option value="">All study levels</option>
                <option value="bachelor">Undergraduate</option>
                <option value="master">Master’s</option>
                <option value="doctorate">Doctorate</option>
              </select>
              <label className="sr-only" htmlFor="funding">
                Funding
              </label>
              <select
                id="funding"
                name="funding"
                className="form-select text-xs"
                defaultValue={f.funding}
              >
                <option value="">All funding</option>
                <option value="comprehensive">Tuition + living support</option>
                <option value="tuition">Tuition support</option>
                <option value="partial">Partial funding</option>
                <option value="unknown">Funding to confirm</option>
              </select>
              <label className="sr-only" htmlFor="availability">
                Availability
              </label>
              <select
                id="availability"
                name="availability"
                className="form-select text-xs"
                defaultValue={f.availability}
              >
                <option value="active">Exclude closed cycles</option>
                <option value="all">All cycles, including closed</option>
                <option value="open">Applications open</option>
                <option value="upcoming">Upcoming</option>
                <option value="unknown">Availability to confirm</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <details className="text-xs">
              <summary className="flex w-fit cursor-pointer items-center gap-2 text-muted-foreground">
                <SlidersHorizontal size={13} />
                More filters
              </summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="field-label" htmlFor="provider">
                    Provider
                  </label>
                  <select
                    name="provider"
                    id="provider"
                    defaultValue={f.provider}
                    className="form-select"
                  >
                    <option value="">All providers</option>
                    {result.providers.map((p) => (
                      <option value={p.slug} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="field">
                    Field of study
                  </label>
                  <Input
                    name="field"
                    id="field"
                    defaultValue={f.field}
                    placeholder="e.g. Humanities"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="deadlineBefore">
                    Confirmed deadline before
                  </label>
                  <Input
                    type="date"
                    name="deadlineBefore"
                    id="deadlineBefore"
                    defaultValue={f.deadlineBefore}
                  />
                </div>
              </div>
            </details>
            <div className="flex items-center justify-between text-[11px]">
              <p className="text-muted-foreground">
                {result.total} {result.total === 1 ? "opportunity" : "opportunities"} ·{" "}
                {f.availability === "active" ? "closed cycles excluded" : "your selected filters"}
              </p>
              <div className="flex items-center gap-4">
                <Link className="underline underline-offset-4" href="/scholarships">
                  Clear filters
                </Link>
                <Button variant="outline" size="sm">
                  Apply filters
                </Button>
              </div>
            </div>
          </Form>
          <div className="paper px-5 sm:px-7">
            {result.rows.length ? (
              result.rows.map((row) => (
                <ScholarshipCard
                  key={row.id}
                  row={row}
                  action={
                    actor ? (
                      <SaveButton
                        scholarshipId={row.id}
                        saved={savedIds.includes(row.id)}
                        title={row.title}
                        refresh={false}
                      />
                    ) : (
                      <Button asChild variant="outline" size="icon" className="rounded-full">
                        <Link
                          href="/login"
                          aria-label={`Sign in to save ${row.title}`}
                          title="Sign in to save"
                        >
                          <Bookmark size={18} strokeWidth={1.6} />
                        </Link>
                      </Button>
                    )
                  }
                />
              ))
            ) : (
              <EmptyState title="Room for a different direction.">
                <p>
                  No scholarships match these filters. Try another destination, include closed
                  cycles, or broaden your study level.
                </p>
                <Link href="/scholarships" className="mt-4 inline-block text-primary underline">
                  Reset filters
                </Link>
              </EmptyState>
            )}
          </div>
          {result.total > 8 && (
            <nav aria-label="Scholarship pagination" className="mt-6 flex justify-between text-xs">
              {f.page > 1 ? (
                <Link href={pageLink(f.page - 1)} className="flex items-center gap-2">
                  <ArrowLeft size={14} />
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground">
                Page {f.page} of {Math.ceil(result.total / 8)}
              </span>
              {f.page * 8 < result.total ? (
                <Link href={pageLink(f.page + 1)} className="flex items-center gap-2">
                  Next
                  <ArrowRight size={14} />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>
        <aside className="space-y-7">
          <div className="rounded-xl bg-secondary/65 p-6">
            <BookOpen size={25} strokeWidth={1.2} />
            <p className="eyebrow mt-7 text-muted-foreground">A NOTE ON ELIGIBILITY</p>
            <h2 className="mt-3 font-serif text-[27px] leading-tight">
              A match is a<br />
              <em>starting point.</em>
            </h2>
            <p className="mt-4 text-xs leading-6 text-muted-foreground">
              Your profile helps us explain what fits and what still needs checking. It isn’t an
              award prediction.
            </p>
            <Link
              href="/profile"
              className="mt-6 flex items-center justify-between border-t border-primary/20 pt-4 text-xs"
            >
              Build a clearer profile <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="border-t border-border pt-5">
            <p className="eyebrow">GROUNDED IN EVIDENCE</p>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              Each opportunity links to official guidance. Unknown dates stay unknown. Past cycles
              are kept for context, with their own history.
            </p>
          </div>
          <p className="text-[10px] leading-5 text-muted-foreground">
            Monitoring covers explicitly supported sources only. Scheduled checks are best-effort;
            see the actual check history on each opportunity.
          </p>
        </aside>
      </div>
    </>
  );
}
