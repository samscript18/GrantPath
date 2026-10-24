import Link from "next/link";
import { ArrowUpRight, Check, Compass, FileCheck2, Sprout } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { connection } from "next/server";
import { featuredScholarships } from "@/server/scholarships";
import { fundingLabels } from "@/server/scholarships/schema";
import { Badge } from "@/components/ui/badge";
export default async function Home() {
  await connection();
  const featured = process.env.DATABASE_URL ? await featuredScholarships() : [];
  return (
    <div>
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-7 sm:px-12">
        <Logo />
        <nav aria-label="Public navigation" className="flex items-center gap-6 text-xs">
          <Link className="hidden sm:inline" href="/scholarships">
            Find a scholarship
          </Link>
          <Link href="/login">Sign in</Link>
          <Button asChild size="sm">
            <Link href="/register">
              Get started <ArrowUpRight size={14} />
            </Link>
          </Button>
        </nav>
      </header>
      <main id="main">
        <section className="relative mx-auto grid max-w-7xl gap-12 px-6 pt-14 pb-20 sm:px-12 lg:grid-cols-[1.1fr_1fr] lg:pt-22">
          <div>
            <p className="eyebrow flex items-center gap-2 text-muted-foreground">
              <span className="size-1.5 rounded-full bg-accent" />
              FOR THE CHAPTER YOU HAVEN’T WRITTEN YET
            </p>
            <h1 className="editorial mt-7 text-6xl leading-[1.06] sm:text-7xl lg:text-[83px]">
              Big ambitions.
              <br />
              Meet your
              <br />
              <em className="text-[#688052]">next opportunity.</em>
            </h1>
            <p className="mt-7 max-w-md text-sm leading-7 text-muted-foreground">
              A scholarship can change your direction. Find real opportunities, understand where you
              stand, and make a plan for what comes next.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/register">
                  Find my path <ArrowUpRight size={16} />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/scholarships">Explore scholarships</Link>
              </Button>
            </div>
            <p className="mt-6 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Check size={13} />
              Official sources. Clear requirements. Your own pace.
            </p>
          </div>
          <div className="relative min-h-[390px] overflow-hidden bg-[#e9eddf] p-8 sm:p-12">
            <div
              aria-hidden
              className="absolute -top-20 -right-30 size-100 rounded-full border border-primary/15"
            />
            <div
              aria-hidden
              className="absolute -top-8 -right-18 size-76 rounded-full border border-primary/15"
            />
            <Sprout size={60} strokeWidth={0.8} className="relative mt-4 text-[#688052]" />
            <p className="editorial relative mt-8 text-[42px] leading-tight">
              The right opportunity
              <br />
              starts with
              <br />
              <em>a little clarity.</em>
            </p>
            <div className="relative mt-9 space-y-4 border-t border-primary/20 pt-6">
              {[
                "Does this scholarship fit my future plans?",
                "Which requirements do I already meet?",
                "What should I do next?",
              ].map((s, i) => (
                <div key={s} className="flex gap-4 text-xs">
                  <span className="font-serif text-primary/50">0{i + 1}</span>
                  {s}
                  <ArrowUpRight className="ml-auto shrink-0" size={14} />
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="border-y border-border bg-[#eeeee5]">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-9 sm:grid-cols-3 sm:px-12">
            {[
              [
                Compass,
                "Find your possibilities",
                "A focused catalogue of real, officially sourced scholarships.",
              ],
              [
                FileCheck2,
                "Know where you stand",
                "Requirements explained as met, not met, or needing confirmation.",
              ],
              [
                Sprout,
                "Turn possibility into a plan",
                "Save opportunities, prepare documents, and follow your progress.",
              ],
            ].map(([Icon, title, desc]) => {
              const I = Icon as typeof Compass;
              return (
                <div key={String(title)} className="flex gap-4">
                  <I size={24} strokeWidth={1.2} className="mt-1 shrink-0" />
                  <div>
                    <h2 className="font-serif text-lg">{String(title)}</h2>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">{String(desc)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-6 pt-18 sm:px-12">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-muted-foreground">
                REAL OPPORTUNITIES. REAL POSSIBILITIES.
              </p>
              <h2 className="editorial mt-4 text-4xl sm:text-5xl">
                A glimpse of what’s out there.
              </h2>
            </div>
            <Link
              href="/scholarships"
              className="inline-flex items-center gap-2 text-xs underline underline-offset-4"
            >
              Explore the catalogue <ArrowUpRight size={14} />
            </Link>
          </div>
          {featured.length ? (
            <div className="grid border-y border-border md:grid-cols-3">
              {featured.map((s, i) => (
                <article
                  key={s.id}
                  className={`py-7 ${i ? "border-t border-border md:border-t-0 md:border-l md:pl-7" : ""} md:pr-7`}
                >
                  <p className="eyebrow text-[9px] text-muted-foreground">
                    {s.programme.provider.name}
                  </p>
                  <Link
                    href={`/scholarships/${s.slug}`}
                    className="mt-4 flex items-start justify-between gap-3 font-serif text-[25px] leading-snug"
                  >
                    {s.title}
                    <ArrowUpRight size={15} className="mt-1.5 shrink-0" />
                  </Link>
                  <p className="mt-4 text-[11px] text-muted-foreground">
                    {s.destination} · {s.data.levels.join(" / ")} · {s.cycle}
                  </p>
                  <p className="mt-4 text-xs leading-6 text-muted-foreground">
                    {s.data.fundingSummary}
                  </p>
                  <Badge
                    className="mt-5"
                    tone={s.fundingType === "comprehensive" ? "green" : "neutral"}
                  >
                    {fundingLabels[s.data.fundingType]}
                  </Badge>
                  <p className="mt-3 text-[10px] text-muted-foreground">
                    {s.currentAvailability === "open" ? "Applications open" : "Upcoming cycle"} ·
                    Inspect official conditions
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="border-y border-border py-8 text-sm leading-7 text-muted-foreground">
              The catalogue is being prepared. Opportunities appear here only after source-backed
              records have been accepted.
            </p>
          )}
        </section>
        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 sm:px-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-muted-foreground">CONFIDENCE COMES FROM CLARITY</p>
            <h2 className="editorial mt-5 text-4xl sm:text-5xl">
              Less guesswork.
              <br />
              More forward motion.
            </h2>
          </div>
          <div className="space-y-6">
            <p className="text-sm leading-7 text-muted-foreground">
              Scholarship information can be complicated. GrantPath keeps the important distinctions
              clear: your citizenship and residence, your current qualification and future studies,
              eligibility and whether applications are open.
            </p>
            <p className="text-sm leading-7 text-muted-foreground">
              Every accepted requirement connects to official evidence. When information is missing,
              we say so. When a supported source changes, you can inspect what changed.
            </p>
            <Link
              href="/scholarships"
              className="inline-flex items-center gap-3 border-b border-primary pb-2 text-sm"
            >
              Explore the catalogue <ArrowUpRight size={15} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="bg-primary px-6 py-10 text-white/65 sm:px-12">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6">
          <Logo light />
          <p className="text-xs">Your ambition deserves a clearer path.</p>
          <span className="text-[10px]">© {new Date().getFullYear()} GrantPath</span>
        </div>
      </footer>
    </div>
  );
}
