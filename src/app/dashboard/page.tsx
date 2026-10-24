import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Bookmark,
  CalendarDays,
  Sprout,
  FileCheck2,
} from "lucide-react";
import { requireUser } from "@/server/accounts/session";
import { matchOverview } from "@/server/eligibility";
import { applications } from "@/server/applications";
import { Shell } from "@/components/shell";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Recalculate } from "@/components/recalculate";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/utils";
export const metadata = { title: "Your overview" };
export default async function Dashboard() {
  const actor = await requireUser();
  const [overview, plans] = await Promise.all([matchOverview(actor), applications(actor)]);
  const relevant = overview.matches.filter(
    (s) =>
      s.evaluationCurrent &&
      s.evaluation?.outcome !== "not_eligible" &&
      ["open", "upcoming"].includes(s.currentAvailability),
  );
  const potential = overview.matches.filter(
    (s) =>
      s.evaluationCurrent &&
      s.evaluation?.outcome === "potential" &&
      s.currentAvailability !== "closed",
  );
  const saved = plans.filter((a) => a.saved);
  const now = new Date();
  const deadlines = plans
    .filter(
      (a) =>
        a.scholarship.deadline &&
        a.scholarship.deadline > now &&
        a.scholarship.currentAvailability === "open" &&
        !["No longer pursuing", "Not awarded", "Awarded"].includes(a.status),
    )
    .sort((a, b) => a.scholarship.deadline!.getTime() - b.scholarship.deadline!.getTime())
    .slice(0, 4);
  const profile = overview.profile.data;
  const priorities = [
    !profile.citizenships.length && [
      "Tell us where you’re a citizen",
      "Some providers distinguish citizenship from residence.",
    ],
    !profile.qualification && [
      "Add your current education",
      "Keep your qualification separate from future study plans.",
    ],
    !profile.targetLevel && [
      "Set your next study goal",
      "Your intended level helps us assess relevant requirements.",
    ],
  ].filter(Boolean) as string[][];
  return (
    <Shell actor={actor} active="/dashboard">
      <PageHeading
        eyebrow="YOUR NEXT CHAPTER"
        title={`A little closer, ${actor.name.split(" ")[0]}.`}
        description="Big ambitions move forward with small, intentional steps."
      >
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <CheckCircle2 size={12} />
          {overview.profile.version
            ? `Profile v${overview.profile.version} saved`
            : "Your journey starts here"}
        </span>
      </PageHeading>
      <section className="relative grid overflow-hidden bg-primary px-7 py-8 text-white sm:px-9 md:grid-cols-[1fr_180px]">
        <div className="relative z-10">
          <p className="eyebrow text-[#c0cfac]">MAKE ROOM FOR WHAT COMES NEXT</p>
          <h2 className="editorial mt-4 max-w-xl text-4xl leading-tight">
            Your future has possibilities.
            <br />
            <em className="text-[#d8dfb9]">Let’s give them a direction.</em>
          </h2>
          <p className="mt-5 max-w-lg text-xs leading-7 text-white/65">
            {overview.profile.version
              ? "Explore opportunities grounded in official evidence, see what needs checking, and build a plan that feels like yours."
              : "Tell us a little about your education and your plans. We’ll help you make sense of the requirements, one opportunity at a time."}
          </p>
          <Button asChild variant="secondary" className="mt-6">
            <Link href={overview.profile.version ? "/scholarships" : "/profile"}>
              {overview.profile.version ? "Explore my possibilities" : "Build my profile"}
              <ArrowUpRight size={14} />
            </Link>
          </Button>
        </div>
        <div aria-hidden className="relative hidden items-center justify-center md:flex">
          <div className="absolute size-64 rounded-full border border-white/15" />
          <div className="absolute size-48 rounded-full border border-white/15" />
          <Sprout size={85} strokeWidth={0.65} className="text-[#bdcba7]" />
        </div>
      </section>
      <div className="my-8 grid grid-cols-3 divide-x divide-border border-y border-border py-5">
        {[
          [
            relevant.length,
            "Ready to explore",
            "Current potential or eligible · open/upcoming",
            CheckCircle2,
          ],
          [
            potential.length,
            "Needs confirmation",
            "A question can be a useful next step",
            CircleHelp,
          ],
          [saved.length, "Saved opportunities", "Possibilities you’re keeping close", Bookmark],
        ].map(([count, label, desc, Icon]) => {
          const I = Icon as typeof CheckCircle2;
          return (
            <div key={String(label)} className="px-3 first:pl-0 sm:px-7">
              <div className="flex items-center justify-between gap-2">
                <span className="font-serif text-4xl">{String(count)}</span>
                <I size={17} strokeWidth={1.3} className="hidden text-primary/55 sm:block" />
              </div>
              <p className="mt-2 text-[11px] font-semibold sm:text-xs">{String(label)}</p>
              <p className="mt-2 hidden text-[10px] leading-5 text-muted-foreground sm:block">
                {String(desc)}
              </p>
            </div>
          );
        })}
      </div>
      {overview.pending > 0 && overview.profile.version > 0 && (
        <Recalculate pending={overview.pending} />
      )}
      <div className="grid gap-9 xl:grid-cols-[1fr_285px]">
        <div>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-muted-foreground">A PLACE TO BEGIN</p>
              <h2 className="editorial mt-3 text-3xl">Possibilities for your path.</h2>
            </div>
            <Link href="/scholarships" className="flex shrink-0 items-center gap-2 text-[11px]">
              Explore all <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="paper px-5 sm:px-6">
            {relevant.length ? (
              relevant.slice(0, 4).map((s) => (
                <article key={s.id} className="border-b border-border py-6 last:border-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="eyebrow text-[8px] text-muted-foreground">
                      {s.programme.provider.name}
                    </p>
                    <Badge tone={s.evaluation?.outcome === "eligible" ? "green" : "amber"}>
                      {s.evaluation?.outcome === "eligible"
                        ? "Eligible based on available information"
                        : "Potential · confirm requirements"}
                    </Badge>
                  </div>
                  <Link
                    href={`/scholarships/${s.slug}#requirements`}
                    className="mt-3 flex items-start justify-between gap-3 font-serif text-[23px] leading-tight"
                  >
                    {s.title}
                    <ArrowUpRight size={16} className="mt-1 shrink-0" />
                  </Link>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    {s.destination} · {s.data.levels.join(" / ")} · {s.cycle}
                  </p>
                  <p className="mt-3 text-[11px] leading-6 text-muted-foreground">
                    {s.data.fundingSummary}
                  </p>
                  <Link
                    href={`/scholarships/${s.slug}#requirements`}
                    className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold"
                  >
                    See my requirements <ArrowRight size={12} />
                  </Link>
                </article>
              ))
            ) : (
              <EmptyState
                title={
                  overview.pending
                    ? "Your next direction is taking shape."
                    : "A wider view can open a new path."
                }
              >
                <p>
                  {overview.pending
                    ? "Complete a profile and update your assessments to see explained opportunities here."
                    : "There are no current open or upcoming matches in your profile assessment. Explore the catalogue for timing to confirm, or update your plans."}
                </p>
                <Link
                  href={overview.profile.version ? "/scholarships" : "/profile"}
                  className="mt-3 inline-block underline"
                >
                  {overview.profile.version ? "Explore scholarships" : "Start my profile"} ↗
                </Link>
              </EmptyState>
            )}
          </div>
          <section className="mt-8">
            <div className="mb-5 flex items-center gap-2">
              <FileCheck2 size={17} strokeWidth={1.3} />
              <h2 className="font-serif text-2xl">A useful next step.</h2>
            </div>
            {priorities.length ? (
              priorities.map(([title, description]) => (
                <Link
                  href="/profile"
                  key={title}
                  className="flex items-center justify-between gap-4 border-t border-border py-5"
                >
                  <div>
                    <h3 className="text-xs font-semibold">{title}</h3>
                    <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                  <ArrowUpRight size={15} />
                </Link>
              ))
            ) : (
              <Link
                href="/applications"
                className="flex items-center justify-between gap-4 border-t border-border py-5"
              >
                <div>
                  <h3 className="text-xs font-semibold">
                    Turn an opportunity into a preparation plan
                  </h3>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Add personal notes, confirm requirements, and check off your next step.
                  </p>
                </div>
                <ArrowUpRight size={15} />
              </Link>
            )}
          </section>
        </div>
        <aside>
          <div className="border-t-2 border-primary pt-5">
            <p className="eyebrow flex items-center gap-2 text-muted-foreground">
              <CalendarDays size={13} />
              KEEP IN VIEW
            </p>
            <h2 className="mt-4 font-serif text-[25px]">Dates on your horizon.</h2>
            <p className="mt-3 text-[11px] leading-6 text-muted-foreground">
              Confirmed closing instants for your personal plans. Times shown in {profile.timeZone}.
            </p>
            {deadlines.length ? (
              deadlines.map((a) => (
                <Link
                  key={a.id}
                  href={`/scholarships/${a.scholarship.slug}`}
                  className="mt-5 block border-t border-border pt-4"
                >
                  <p className="text-[10px] font-semibold text-[#795410]">
                    {formatDate(a.scholarship.deadline, profile.timeZone)}
                  </p>
                  <h3 className="mt-2 font-serif text-lg leading-snug">{a.scholarship.title}</h3>
                  <p className="mt-2 text-[10px] text-muted-foreground">My progress: {a.status}</p>
                </Link>
              ))
            ) : (
              <div className="mt-5 border-t border-border pt-5">
                <p className="text-xs">No confirmed deadlines ahead.</p>
                <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
                  Save an opportunity with a confirmed closing time to keep it in view. Unknown
                  deadlines never become invented reminders.
                </p>
              </div>
            )}
          </div>
          <div className="mt-8 bg-[#e9eddf] p-6">
            <p className="eyebrow text-muted-foreground">GOOD TO REMEMBER</p>
            <h2 className="mt-4 font-serif text-2xl leading-tight">
              A match is
              <br />
              <em>a starting point.</em>
            </h2>
            <p className="mt-4 text-[11px] leading-6 text-muted-foreground">
              Eligibility is not an award prediction. Inspect the evidence, ask the unresolved
              questions, and apply through the official provider.
            </p>
            <Link
              href="/notifications"
              className="mt-5 flex justify-between border-t border-primary/20 pt-4 text-xs"
            >
              Your updates <ArrowUpRight size={13} />
            </Link>
          </div>
        </aside>
      </div>
    </Shell>
  );
}
