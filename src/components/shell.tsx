"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Compass,
  Bookmark,
  Columns3,
  Bell,
  Settings2,
  ShieldCheck,
  ArrowUpRight,
  ChevronRight,
  Sprout,
  UserRound,
  BookOpen,
} from "lucide-react";
import { Logo } from "./logo";
import type { Actor } from "@/server/accounts/auth";
import { SignOut } from "./sign-out";
import { ThemeControl } from "./theme-control";
import { Button } from "./ui/button";
import { Avatar } from "./avatar";

const nav = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/scholarships", "Discover scholarships", Compass],
  ["/saved", "Saved opportunities", Bookmark],
  ["/applications", "My applications", Columns3],
  ["/notifications", "Notifications", Bell],
  ["/academic-references", "Academic references", BookOpen],
  ["/profile", "Profile", UserRound],
  ["/settings", "Settings", Settings2],
] as const;

function NavigationHint() {
  const { pending } = useLinkStatus();
  return <span aria-hidden="true" className={`nav-pending ${pending ? "is-pending" : ""}`} />;
}

export function Shell({
  children,
  actor,
  unread = 0,
}: {
  children: React.ReactNode;
  actor: Actor | null;
  unread?: number;
}) {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = headerRef.current;
    const workspace = workspaceRef.current;
    if (!header || !workspace) return;
    const updateHeight = () => {
      workspace.style.setProperty(
        "--workspace-header-height",
        `${header.getBoundingClientRect().height}px`,
      );
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  const pathname = usePathname();
  const active = nav.find(([href]) => pathname === href || pathname.startsWith(`${href}/`))?.[0];
  const section = nav.find(([href]) => href === active)?.[1] || "Operator studio";
  return (
    <div ref={workspaceRef} className="workspace min-h-screen lg:pl-[252px]">
      <aside className="workspace-sidebar fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col overflow-y-auto px-5 py-8 text-white/75 lg:flex">
        <div className="px-3">
          <Logo light />
        </div>
        <p className="eyebrow mt-13 mb-4 px-3 text-[9px] text-white/45">YOUR NEXT CHAPTER</p>
        <nav aria-label="Main navigation" className="space-y-1">
          {nav.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              aria-current={active === href ? "page" : undefined}
              className={`workspace-nav-link group relative flex items-center gap-3 rounded-lg px-3.5 py-3.5 text-[12px] ${active === href ? "is-active" : "hover:bg-white/6 hover:text-white"}`}
            >
              <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {href === "/notifications" && unread > 0 && (
                <span className="nav-count">{unread > 99 ? "99+" : unread}</span>
              )}
              <NavigationHint />
            </Link>
          ))}
          {actor?.role === "operator" && (
            <Link
              href="/operator"
              aria-current={pathname === "/operator" ? "page" : undefined}
              className={`workspace-nav-link mt-5 flex items-center gap-3 rounded-lg px-3.5 py-3.5 text-xs ${pathname === "/operator" ? "is-active" : "hover:bg-white/6"}`}
            >
              <ShieldCheck size={18} aria-hidden="true" />
              Operator studio
            </Link>
          )}
        </nav>
        <div className="mt-auto pt-10">
          <div className="sidebar-note relative mb-7 overflow-hidden rounded-xl border border-white/10 px-5 py-6">
            <Sprout
              size={24}
              strokeWidth={1.2}
              className="mb-4 text-[#c7d4ae]"
              aria-hidden="true"
            />
            <p className="font-serif text-[25px] leading-[1.3] tracking-tight text-[#f0eedb]">
              Big ambitions.
              <br />
              <em>A clearer path.</em>
            </p>
            <Link
              href="/scholarships"
              className="mt-5 inline-flex items-center gap-2 text-[11px] text-white/70 hover:text-white"
            >
              Find your opportunity <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
          <div className="flex items-center gap-3 border-t border-white/12 px-1 pt-5">
            <Link
              href={actor ? "/profile" : "/login"}
              aria-label={actor ? "Your profile" : "Sign in"}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/8 text-[11px] text-white"
            >
              <Avatar
                name={actor?.name || "GrantPath"}
                image={actor?.image}
                className="size-9 rounded-full text-[11px]"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-white">{actor?.name || "Welcome, explorer"}</p>
              <p className="mt-1 text-[10px] text-white/45">
                {actor ? "Your personal workspace" : "A world of possibility"}
              </p>
            </div>
            {actor && <SignOut />}
          </div>
        </div>
      </aside>
      <header
        ref={headerRef}
        className="workspace-header sticky top-0 z-20 border-b border-border/70 px-5 py-4 sm:px-9 lg:px-11"
      >
        <div className="flex min-h-8 items-center justify-between gap-3">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="hidden items-center gap-3 text-xs lg:flex">
            <span className="text-muted-foreground">Your workspace</span>
            <ChevronRight size={12} className="text-muted-foreground/60" aria-hidden="true" />
            <span className="font-medium">{section}</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <ThemeControl compactOnMobile />
            {actor ? (
              <Link
                href="/notifications"
                aria-label={`Notification inbox${unread ? `, ${unread} unread updates` : ""}`}
                className="relative flex size-9 items-center justify-center rounded-full border border-border/80 bg-paper text-foreground transition-colors hover:bg-secondary"
              >
                <Bell size={17} strokeWidth={1.5} aria-hidden="true" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] leading-4 font-semibold text-[#183e2e]">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
            ) : (
              <Button asChild size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
            )}
            {actor && <div className="hidden h-5 w-px bg-border sm:block" />}
            {actor && (
              <Link
                href="/profile"
                aria-label="Your profile"
                className="hidden size-8 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold sm:flex"
              >
                <Avatar
                  name={actor.name}
                  image={actor.image}
                  className="size-8 rounded-full text-[10px]"
                />
              </Link>
            )}
            {actor && (
              <span className="lg:hidden">
                <SignOut />
              </span>
            )}
          </div>
        </div>
        <nav
          aria-label="Mobile navigation"
          className="-mx-5 mt-4 flex gap-1 overflow-x-auto border-t border-border/60 px-4 pt-3 lg:hidden"
        >
          {nav.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              aria-current={active === href ? "page" : undefined}
              className={`relative flex shrink-0 items-center gap-2 rounded-md px-3 py-2.5 text-[11px] ${active === href ? "bg-secondary font-semibold text-primary" : "text-muted-foreground"}`}
            >
              <Icon size={14} aria-hidden="true" />
              {label.replace(" scholarships", "").replace(" opportunities", "")}
              <NavigationHint />
            </Link>
          ))}
          {actor?.role === "operator" && (
            <Link href="/operator" className="shrink-0 px-3 py-2.5 text-[11px]">
              Operator
            </Link>
          )}
        </nav>
      </header>
      <main
        id="main"
        className="workspace-content mx-auto min-h-[calc(100vh-156px)] max-w-[1480px] px-5 py-8 sm:px-9 lg:px-11 lg:py-11"
      >
        {children}
      </main>
      <footer className="mx-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 py-6 text-[10px] text-muted-foreground sm:mx-9 lg:mx-11">
        <span>© {new Date().getFullYear()} GrantPath</span>
        <span className="flex items-center gap-2">
          <Sprout size={12} strokeWidth={1.5} aria-hidden="true" />
          Evidence first. Your ambition, always.
        </span>
      </footer>
    </div>
  );
}
