import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "./logo";
import { OpportunityArt } from "./opportunity-art";
import { ThemeControl } from "./theme-control";

export function StatePage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="state-scene flex min-h-screen flex-col px-6 py-7 sm:px-10">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Logo />
        <ThemeControl compactOnMobile />
      </header>
      <main
        id="main"
        className="mx-auto my-auto grid w-full max-w-4xl items-center gap-10 py-16 md:grid-cols-[1.2fr_.8fr]"
      >
        <div>
          <p className="eyebrow text-muted-foreground">{eyebrow}</p>
          <h1 className="editorial mt-5 text-[42px] leading-tight sm:text-5xl">{title}</h1>
          <p className="mt-6 max-w-md text-sm leading-8 text-muted-foreground">{description}</p>
          <div className="mt-8 flex flex-wrap gap-3">{children}</div>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 text-xs text-muted-foreground"
          >
            <ArrowLeft size={13} />
            Back to GrantPath
          </Link>
        </div>
        <OpportunityArt className="mx-auto hidden w-full max-w-xs opacity-80 md:block" />
      </main>
      <footer className="mx-auto w-full max-w-6xl border-t border-border pt-6 text-[10px] text-muted-foreground">
        A clearer path to your next chapter.
      </footer>
    </div>
  );
}
