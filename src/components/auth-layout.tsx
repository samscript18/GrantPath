import { Logo } from "./logo";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { ThemeControl } from "./theme-control";
import { OpportunityArt } from "./opportunity-art";
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="auth-scene min-h-screen p-3 sm:p-5 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-24px)] auth-frame max-w-[1600px] overflow-hidden rounded-2xl border border-border bg-paper sm:min-h-[calc(100vh-40px)] lg:min-h-[calc(100vh-48px)] lg:grid-cols-[.85fr_1.15fr]">
        <aside className="auth-story relative hidden flex-col overflow-hidden bg-brand px-10 py-10 text-white lg:flex xl:px-14">
          <Logo light />
          <div className="relative z-10 mt-14">
            <p className="eyebrow text-[#d4a64e]">THE FUTURE IS STILL YOURS TO WRITE</p>
            <h2 className="editorial mt-5 text-[45px] leading-[1.15] xl:text-[54px]">
              A little direction.
              <br />
              <em className="text-[#d8dfb9]">A world of possibility.</em>
            </h2>
            <p className="mt-5 max-w-xs text-[13px] leading-7 text-white/65">
              Find real scholarships, understand the requirements, and make space for your next
              chapter.
            </p>
          </div>
          <OpportunityArt dark className="mx-auto -mt-2 w-full max-w-[330px] xl:max-w-[380px]" />
          <div className="relative z-10 mt-auto flex items-center gap-3 border-t border-white/15 pt-6 text-[11px] text-white/65">
            <ShieldCheck size={16} strokeWidth={1.3} aria-hidden="true" />
            Official evidence. Clearer next steps.
          </div>
        </aside>
        <main
          id="main"
          className="auth-content flex min-w-0 flex-col px-6 py-6 sm:px-10 sm:py-8 xl:px-16"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="lg:hidden">
              <Logo />
            </div>
            <Link
              href="/scholarships"
              className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground hover:text-primary sm:inline-flex"
            >
              Explore scholarships <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
            <ThemeControl compactOnMobile />
          </div>
          <div className="auth-form-content mx-auto my-auto w-full max-w-[430px] py-10 sm:py-12">
            <p className="eyebrow mb-5 flex items-center gap-2.5 text-muted-foreground">
              <span className="h-px w-6 bg-accent" aria-hidden="true" />
              YOUR NEXT CHAPTER
            </p>
            <h1 className="editorial text-[40px] leading-tight sm:text-[44px]">{title}</h1>
            <p className="mt-3 mb-8 text-[13px] leading-7 text-muted-foreground">{subtitle}</p>
            {children}
          </div>
          <p className="text-center text-[10px] leading-6 text-muted-foreground">
            Your ambition deserves a clearer path.
          </p>
        </main>
      </div>
    </div>
  );
}
