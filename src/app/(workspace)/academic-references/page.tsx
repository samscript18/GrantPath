import Link from "next/link";
import Form from "next/form";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { academicReferences } from "@/data/academic-references";
export const metadata = { title: "Official academic grading references" };
export default async function References({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = ((await searchParams).q || "").slice(0, 120);
  const rows = academicReferences.filter((row) =>
    [row.provider, row.region, row.type, row.summary]
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="KEEP THE ORIGINAL. CHECK THE PROVIDER."
        title="Grades, with the context they need."
        description="Official grading scales and published equivalence guidance. Researched 24 October 2026; a focused reference collection, not an exhaustive global conversion database."
      />
      <div className="mb-7 rounded-r-xl border-l-[3px] border-accent bg-warning p-5 text-[13px] leading-7">
        A result on a 5-point scale cannot be multiplied into a 4-point GPA and treated as official.
        Record the original value, scale and classification. Only the scholarship or admitting
        institution can confirm which equivalence applies to your qualification.
      </div>
      <Form action="/academic-references" scroll={false} className="mb-8 flex gap-3" role="search">
        <label className="sr-only" htmlFor="reference-search">
          Search grading references
        </label>
        <Input
          id="reference-search"
          name="q"
          defaultValue={q}
          placeholder="Search provider, region or scale…"
        />
        <Button>Search</Button>
      </Form>
      <div className="mb-4 flex items-center gap-2 text-[11px] text-muted-foreground">
        <BookOpen size={14} aria-hidden="true" />
        {rows.length} official {rows.length === 1 ? "reference" : "references"}
      </div>
      <div className="paper divide-y divide-border overflow-hidden">
        {rows.map((row) => (
          <article
            key={row.provider}
            className="grid gap-5 px-6 py-8 md:grid-cols-[210px_1fr] sm:px-7"
          >
            <div>
              <p className="eyebrow text-muted-foreground">{row.region}</p>
              <h2 className="mt-3 font-serif text-2xl">{row.provider}</h2>
            </div>
            <div>
              <p className="text-xs font-semibold">{row.type}</p>
              <p className="mt-3 max-w-2xl text-[13px] leading-7 text-muted-foreground">
                {row.summary}
              </p>
              <a
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold underline underline-offset-4"
                href={row.url}
                target="_blank"
                rel="noreferrer"
              >
                Read official guidance <ArrowUpRight size={13} />
              </a>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Reference reviewed 24 Oct 2026 · Recheck the official source before applying
              </p>
            </div>
          </article>
        ))}
      </div>
      {!rows.length && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No matching references.{" "}
          <Link className="underline" href="/academic-references">
            Clear your search
          </Link>
        </p>
      )}
      <p className="mt-6 flex items-start gap-3 text-xs leading-7 text-muted-foreground">
        <BookOpen className="mt-1 shrink-0" size={17} />
        These references do not silently change your GrantPath eligibility. Unsupported scales,
        inverted grading and unpublished equivalences require provider confirmation.
      </p>
    </>
  );
}
