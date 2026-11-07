import Link from "next/link";
import Form from "next/form";
import { ArrowUpRight, BookOpen, Search, Info } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { academicReferences } from "@/data/academic-references";
export const metadata = { title: "Official academic grading references" };
export default async function References({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const query = (await searchParams).q;
  const q = ((Array.isArray(query) ? query[0] : query) || "").slice(0, 120);
  const rows = academicReferences.filter((row) =>
    [row.provider, row.region, row.type, row.summary]
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  const regions = [...new Set(rows.map((row) => row.region))];
  const regionId = (region: string) =>
    `reference-${region.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="reference-library">
      <PageHeading
        eyebrow="THE ACADEMIC REFERENCE LIBRARY"
        title="Your grades, in context."
        description="Official grading scales and provider equivalence guidance. Keep your original result and check the provider’s conditions."
      />
      <Form
        action="/academic-references"
        scroll={false}
        className="reference-search mb-6 flex gap-2 rounded-xl border border-border bg-paper p-2"
        role="search"
      >
        <label className="sr-only" htmlFor="reference-search">
          Search grading references
        </label>
        <div className="relative min-w-0 flex-1">
          <Search
            size={17}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-3.5 text-muted-foreground"
          />
          <Input
            id="reference-search"
            name="q"
            defaultValue={q}
            placeholder="Search provider, region or scale…"
            className="border-transparent bg-transparent pl-10 shadow-none"
          />
        </div>
        <Button>Search</Button>
      </Form>
      <div className="reference-introduction mb-7 flex gap-4 rounded-xl border border-border bg-secondary/45 p-5 sm:p-6">
        <BookOpen
          size={23}
          strokeWidth={1.2}
          className="mt-1 shrink-0 text-leaf"
          aria-hidden="true"
        />
        <div>
          <h2 className="font-serif text-[23px]">Keep the original.</h2>
          <p className="mt-2 max-w-3xl text-[13px] leading-7 text-muted-foreground">
            Keep the value, scale and classification on your transcript. Only the scholarship or
            admitting institution can confirm which equivalence applies to you.
          </p>
        </div>
      </div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[11px] text-muted-foreground">
          {rows.length} official {rows.length === 1 ? "reference" : "references"} in this view
        </p>
        <nav aria-label="Reference regions" className="flex flex-wrap gap-2">
          {regions.map((region) => (
            <a
              key={region}
              href={`#${regionId(region)}`}
              className="rounded-full border border-border bg-paper px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              {region}
            </a>
          ))}
        </nav>
      </div>
      <div className="space-y-9">
        {regions.map((region) => (
          <section key={region} id={regionId(region)} className="reference-region">
            <div className="mb-4 flex items-center gap-4">
              <h2 className="font-serif text-2xl tracking-tight">{region}</h2>
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
            </div>
            <div className="paper overflow-hidden divide-y divide-border">
              {rows
                .filter((row) => row.region === region)
                .map((row) => (
                  <article
                    key={row.provider}
                    className="reference-entry grid gap-4 p-5 sm:p-7 lg:grid-cols-[minmax(180px,.65fr)_minmax(0,1.35fr)]"
                  >
                    <div>
                      <p className="eyebrow text-[9px] text-leaf">{row.type}</p>
                      <h3 className="mt-3 font-serif text-[25px] leading-tight tracking-tight">
                        {row.provider}
                      </h3>
                    </div>
                    <div>
                      <p className="text-[13px] leading-7 text-muted-foreground">{row.summary}</p>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <a
                          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[11px] font-semibold transition-colors hover:bg-secondary"
                          href={row.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Read official guidance <ArrowUpRight size={13} aria-hidden="true" />
                        </a>
                        <p className="text-[10px] text-muted-foreground">Reviewed 24 Oct 2026</p>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </div>
      {!rows.length && (
        <EmptyState title="A different search might help.">
          <p>No references match these terms. Try a provider name, country or grading scale.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/academic-references">Clear search</Link>
          </Button>
        </EmptyState>
      )}
      <p className="mt-8 flex items-start gap-3 border-t border-border pt-6 text-xs leading-7 text-muted-foreground">
        <Info className="mt-1 shrink-0 text-leaf" size={17} aria-hidden="true" />
        This is a reference collection, not an exhaustive conversion database. Unsupported scales
        and unpublished equivalences still require provider confirmation.
      </p>
    </div>
  );
}
