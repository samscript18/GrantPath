import { Logo } from "./logo";
import Link from "next/link";
import { ThemeControl } from "./theme-control";
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
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-brand p-14 text-white lg:flex lg:flex-col">
        <Logo light />
        <div className="relative z-10 my-auto max-w-md py-20">
          <p className="eyebrow text-accent">POSSIBILITY STARTS HERE</p>
          <h2 className="editorial mt-7 text-6xl leading-[1.12]">
            Your ambition.
            <br />A world of
            <br />
            <em className="text-[#d8dfb9]">opportunity.</em>
          </h2>
          <p className="mt-8 max-w-xs text-sm leading-7 text-white/60">
            Real scholarships. Clear requirements. A little more confidence in your next step.
          </p>
        </div>
        <p className="text-xs text-white/40">A clearer path to your next chapter.</p>
        <div
          aria-hidden
          className="absolute -right-45 -bottom-60 size-[650px] rounded-full border border-white/10"
        />
        <div
          aria-hidden
          className="absolute -right-32 -bottom-50 size-[530px] rounded-full border border-white/10"
        />
      </aside>
      <main id="main" className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="lg:hidden">
            <Logo />
          </span>
          <Link href="/scholarships" className="ml-auto text-xs text-muted-foreground">
            Explore scholarships ↗
          </Link>
          <ThemeControl />
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-16">
          <p className="eyebrow mb-5 text-muted-foreground">THE NEXT CHAPTER</p>
          <h1 className="editorial text-4xl">{title}</h1>
          <p className="mt-3 mb-9 text-sm leading-6 text-muted-foreground">{subtitle}</p>
          {children}
        </div>
        <p className="text-center text-[10px] text-muted-foreground">
          Eligibility guidance, grounded in official evidence.
        </p>
      </main>
    </div>
  );
}
