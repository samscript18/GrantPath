import { ProviderImage } from "@/components/provider-image";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  Compass,
  FileCheck2,
  Bookmark,
  MapPin,
  Plus,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { connection } from "next/server";
import { featuredScholarships } from "@/server/scholarships";
import { fundingLabels } from "@/server/scholarships/schema";
import { Badge } from "@/components/ui/badge";
import { ThemeControl } from "@/components/theme-control";
import { OpportunityArt } from "@/components/opportunity-art";
const faqs = [
  {
    question: "What can I do with GrantPath?",
    answer:
      "Discover real scholarships, inspect official evidence, understand how the requirements relate to your profile, and organise your applications. Save opportunities, keep personal notes, and build a preparation checklist in your own workspace.",
  },
  {
    question: "Do I need an account to explore scholarships?",
    answer:
      "You can browse the catalogue and read scholarship details without an account. Create an account when you want personalised assessments, saved opportunities, application tracking, and notification preferences. You can build your profile in stages and leave uncertain answers blank.",
  },
  {
    question: "Does an eligible match mean I will receive the scholarship?",
    answer:
      "No. An assessment explains which known requirements you meet, do not meet, or need to confirm. It does not predict an award or guarantee admission. The provider makes the final decision, and application availability is shown separately from eligibility.",
  },
  {
    question: "Are all the scholarships fully funded?",
    answer:
      "Funding varies. An opportunity may cover tuition, living costs, part of your expenses, or a package that still needs confirmation. Each scholarship explains its recorded funding components and links to supporting evidence so you can check what is included.",
  },
  {
    question: "Where does the information come from, and how current is it?",
    answer:
      "Accepted records link to official provider sources and show when supporting evidence was checked. Automated monitoring covers supported sources only; check histories distinguish the latest attempt from the last successful check. Unknown deadlines and conflicting information stay labelled for confirmation.",
  },
  {
    question: "Can I submit my scholarship application through GrantPath?",
    answer:
      "Submit your application through the official provider using the link on the scholarship page. GrantPath helps you prepare and track your personal progress; changing a stage in your workspace does not submit an application or change the provider’s official status.",
  },
];
export default async function Home() {
  await connection();
  const featured = process.env.DATABASE_URL ? await featuredScholarships() : [];
  const spotlight = featured[0];
  return (
    <div className="landing-page">
      <header className="landing-header mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-x-4 gap-y-4 px-6 py-4 sm:px-10 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-14 lg:py-6">
        <Logo />
        <nav
          aria-label="Public navigation"
          className="col-span-2 row-start-2 flex items-center justify-center gap-5 border-t border-border/60 pt-3 text-xs lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:gap-7 lg:border-0 lg:pt-0"
        >
          <Link
            className="whitespace-nowrap text-muted-foreground transition-colors hover:text-primary"
            href="#how-it-works"
          >
            How it works
          </Link>
          <Link
            className="whitespace-nowrap text-muted-foreground transition-colors hover:text-primary"
            href="/scholarships"
          >
            Find a scholarship
          </Link>
          <Link
            href="#faqs"
            className="whitespace-nowrap text-muted-foreground transition-colors hover:text-primary"
          >
            FAQs
          </Link>
        </nav>
        <div className="col-start-2 row-start-1 flex items-center justify-self-end gap-3 text-xs lg:col-start-3">
          <ThemeControl compactOnMobile />
          <Button asChild size="sm" variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/register">
              Get started <ArrowUpRight size={14} />
            </Link>
          </Button>
        </div>
      </header>
      <main id="main">
        <section className="landing-hero mx-auto grid max-w-7xl items-center gap-12 px-6 pt-12 pb-16 sm:px-10 lg:grid-cols-[1.15fr_.85fr] lg:gap-8 lg:px-14 lg:pt-16 lg:pb-22">
          <div>
            <p className="eyebrow flex items-center gap-3 text-muted-foreground">
              <span className="h-px w-8 bg-accent" />
              FOR THE CHAPTER YOU HAVEN’T WRITTEN YET
            </p>
            <h1 className="editorial mt-7 max-w-2xl text-[46px] leading-[1.06] sm:text-[76px] lg:text-[88px]">
              Big ambitions.
              <br />
              Meet your
              <br />
              <em className="text-leaf">next opportunity.</em>
            </h1>
            <p className="mt-7 max-w-[420px] text-[15px] leading-8 text-muted-foreground">
              A scholarship can change your direction. Find the possibilities, understand where you
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
              <ShieldCheck size={14} strokeWidth={1.5} />
              Official sources. Clear requirements. Your own pace.
            </p>
          </div>
          <div className="landing-visual relative mx-auto w-full max-w-[440px]">
            <div className="landing-art relative rounded-t-[180px] rounded-b-2xl border border-border bg-secondary/55 px-7 pt-5 pb-8">
              <OpportunityArt className="landing-artwork mx-auto w-full" />
            </div>
            {spotlight && (
              <Link
                href={`/scholarships/${spotlight.slug}`}
                className="landing-spotlight group relative mt-4 flex items-center gap-4 rounded-xl border border-border bg-paper p-4 shadow-sm sm:-ml-8 sm:mr-8 sm:-mt-12 sm:p-5"
              >
                <ProviderImage
                  provider={spotlight.programme.provider}
                  className="size-12 text-4xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="eyebrow text-[8px] text-leaf">FROM THE OFFICIAL-SOURCE CATALOGUE</p>
                  <h2 className="mt-2 font-serif text-xl leading-tight tracking-tight">
                    {spotlight.title}
                  </h2>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {spotlight.destination} · {fundingLabels[spotlight.data.fundingType]}
                  </p>
                </div>
                <ArrowUpRight
                  size={17}
                  className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            )}
          </div>
        </section>
        <div className="border-y border-border bg-paper/70">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-4 px-6 py-6 sm:px-10 lg:px-14">
            {[
              [Compass, "Real opportunities"],
              [FileCheck2, "Explainable requirements"],
              [Bookmark, "Your personal application plan"],
            ].map(([Icon, label]) => {
              const I = Icon as typeof Compass;
              return (
                <p
                  key={String(label)}
                  className="flex items-center gap-3 text-xs text-muted-foreground"
                >
                  <I size={18} strokeWidth={1.4} className="text-leaf" />
                  {String(label)}
                </p>
              );
            })}
          </div>
        </div>
        <section className="mx-auto max-w-7xl px-6 py-16 sm:px-10 lg:px-14 lg:py-22">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="eyebrow text-muted-foreground">POSSIBILITY, GROUNDED IN EVIDENCE</p>
              <h2 className="editorial mt-4 text-4xl sm:text-5xl">A world worth exploring.</h2>
            </div>
            <Link
              href="/scholarships"
              className="inline-flex items-center gap-2 border-b border-primary/35 pb-2 text-xs font-medium"
            >
              Explore the catalogue <ArrowUpRight size={14} />
            </Link>
          </div>
          {featured.length ? (
            <div className="grid gap-5 md:grid-cols-3">
              {featured.map((s, i) => (
                <article
                  key={s.id}
                  className="featured-opportunity group flex flex-col rounded-xl border border-border bg-paper p-6 sm:p-7"
                >
                  <div className="mb-7 flex items-center justify-between">
                    <ProviderImage provider={s.programme.provider} className="size-16 text-4xl" />
                    <span className="text-[10px] text-muted-foreground">0{i + 1} / EXPLORE</span>
                  </div>
                  <p className="eyebrow text-[9px] leading-5 text-muted-foreground">
                    {s.programme.provider.name}
                  </p>
                  <Link
                    href={`/scholarships/${s.slug}`}
                    className="mt-3 font-serif text-[26px] leading-tight tracking-tight hover:text-leaf"
                  >
                    {s.title}
                  </Link>
                  <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <MapPin size={12} />
                    {s.destination} · {s.cycle}
                  </p>
                  <p className="mt-4 mb-6 text-xs leading-7 text-muted-foreground">
                    {s.data.fundingSummary}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-5">
                    <Badge tone={s.fundingType === "comprehensive" ? "green" : "neutral"}>
                      {fundingLabels[s.data.fundingType]}
                    </Badge>
                    <Link
                      href={`/scholarships/${s.slug}`}
                      className="ml-auto flex size-8 items-center justify-center rounded-full border border-border transition-colors group-hover:bg-secondary"
                      aria-label={`Explore ${s.title}`}
                    >
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                  <p className="mt-3 text-[10px] text-muted-foreground">
                    {s.currentAvailability === "open"
                      ? "Applications open"
                      : s.currentAvailability === "upcoming"
                        ? "Upcoming cycle"
                        : s.currentAvailability === "closed"
                          ? "Closed cycle"
                          : "Availability to confirm"}{" "}
                    · Inspect official conditions
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-8 text-sm leading-7 text-muted-foreground">
              The catalogue is being prepared. Opportunities appear here after source-backed records
              have been accepted.
            </p>
          )}
        </section>
        <section id="how-it-works" className="border-y border-border bg-secondary/35">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:px-10 lg:grid-cols-[.85fr_1.15fr] lg:gap-20 lg:px-14 lg:py-20">
            <div>
              <p className="eyebrow text-muted-foreground">LESS GUESSWORK. MORE DIRECTION.</p>
              <h2 className="editorial mt-5 text-4xl leading-[1.12] sm:text-5xl">
                From “what if”
                <br />
                to <em className="text-leaf">what’s next.</em>
              </h2>
              <p className="mt-6 max-w-sm text-sm leading-8 text-muted-foreground">
                Keep your possibilities, questions, and preparation in one place. Take the next step
                when you’re ready.
              </p>
              <Link
                href="/register"
                className="mt-7 inline-flex items-center gap-3 text-xs font-semibold"
              >
                Start your chapter <ArrowRight size={15} />
              </Link>
            </div>
            <ol className="divide-y divide-primary/15">
              {[
                [
                  "Discover what’s possible",
                  "Search real scholarships by destination, study level and funding. Every accepted record connects to official sources.",
                ],
                [
                  "Understand where you stand",
                  "Build your profile and see the requirements you meet, those you don’t, and what needs confirmation.",
                ],
                [
                  "Give your ambition a plan",
                  "Save opportunities, organise documents and follow your personal application progress.",
                ],
              ].map(([title, description], i) => (
                <li key={title} className="flex gap-5 py-7 first:pt-0 last:pb-0">
                  <span className="mt-1 font-serif text-xl text-leaf/70">0{i + 1}</span>
                  <div>
                    <h3 className="font-serif text-2xl tracking-tight">{title}</h3>
                    <p className="mt-3 max-w-md text-[13px] leading-7 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section
          id="faqs"
          aria-labelledby="faq-title"
          className="mx-auto grid max-w-7xl scroll-mt-8 gap-9 px-6 pt-16 sm:px-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-16 lg:px-14 lg:pt-20"
        >
          <div>
            <p className="eyebrow text-muted-foreground">A LITTLE MORE CLARITY</p>
            <h2 id="faq-title" className="editorial mt-5 text-4xl leading-tight sm:text-5xl">
              Good questions.
              <br />
              <em className="text-leaf">Clearer next steps.</em>
            </h2>
            <p className="mt-5 max-w-sm text-[13px] leading-7 text-muted-foreground">
              A few things to know as you find your way around GrantPath.
            </p>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {faqs.map(({ question, answer }, index) => (
              <details key={question} name="landing-faq" open={index === 0} className="group py-1">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-5 py-5 text-[13px] font-semibold leading-6 [&::-webkit-details-marker]:hidden">
                  <span>{question}</span>
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-paper transition-colors group-open:bg-secondary">
                    <Plus
                      size={13}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="transition-transform group-open:rotate-45"
                    />
                  </span>
                </summary>
                <p className="max-w-xl pr-8 pb-5 text-[13px] leading-7 text-muted-foreground">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-6 py-16 sm:px-10 lg:px-14 lg:py-20">
          <div className="relative overflow-hidden rounded-2xl bg-brand px-7 py-12 text-white sm:px-12 sm:py-14">
            <div className="relative z-10 max-w-2xl">
              <p className="eyebrow text-[#c3ceaf]">YOUR AMBITION DESERVES A CLEARER PATH</p>
              <h2 className="editorial mt-5 text-4xl leading-tight sm:text-5xl">
                The next chapter
                <br />
                <em className="text-[#d8dfb9]">could start right here.</em>
              </h2>
              <Button asChild variant="secondary" className="mt-7">
                <Link href="/register">
                  Find my path <ArrowUpRight size={15} />
                </Link>
              </Button>
            </div>
            <OpportunityArt
              dark
              className="absolute -right-10 -bottom-20 hidden w-[380px] opacity-65 lg:block"
            />
          </div>
        </section>
      </main>
      <footer className="mx-auto max-w-7xl px-6 pb-8 sm:px-10 lg:px-14">
        <div className="flex flex-wrap items-center justify-between gap-6 border-t border-border pt-7">
          <Logo />
          <div className="flex flex-wrap gap-5 text-[11px] text-muted-foreground">
            <Link href="/scholarships">Scholarships</Link>
            <Link href="/academic-references">Academic references</Link>
            <span>© {new Date().getFullYear()} GrantPath</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
