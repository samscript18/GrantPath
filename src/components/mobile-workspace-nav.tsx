"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Bookmark,
  Bell,
  Columns3,
  Compass,
  LayoutDashboard,
  Menu,
  Settings2,
  ShieldCheck,
  UserRound,
  X,
  ArrowUpRight,
} from "lucide-react";
import { Logo } from "./logo";
import { Avatar } from "./avatar";
import { SignOut } from "./sign-out";
import type { Actor } from "@/server/accounts/auth";

const links = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/scholarships", "Discover scholarships", Compass],
  ["/saved", "Saved opportunities", Bookmark],
  ["/applications", "My applications", Columns3],
  ["/notifications", "Notifications", Bell],
  ["/academic-references", "Academic references", BookOpen],
  ["/profile", "Profile", UserRound],
  ["/settings", "Settings", Settings2],
] as const;

export function MobileWorkspaceNav({ actor, unread }: { actor: Actor | null; unread: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);
  useEffect(() => {
    const desktop = matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (window.innerWidth >= 1024 && dialog.current?.open) dialog.current.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    window.addEventListener("resize", closeOnDesktop);
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      window.removeEventListener("resize", closeOnDesktop);
    };
  }, []);
  return (
    <>
      <button
        type="button"
        className="mobile-menu-trigger"
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls="workspace-mobile-menu"
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
      >
        <Menu size={21} aria-hidden="true" />
      </button>
      <dialog
        id="workspace-mobile-menu"
        ref={dialog}
        className="mobile-menu-dialog"
        aria-labelledby="mobile-menu-title"
        onClose={() => setOpen(false)}
        onToggle={(event) => setOpen(event.currentTarget.open)}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.target === event.currentTarget &&
            (event.clientX < rect.left ||
              event.clientX > rect.right ||
              event.clientY < rect.top ||
              event.clientY > rect.bottom)
          )
            dialog.current?.close();
        }}
      >
        <div className="mobile-menu-heading">
          <Logo />
          <form method="dialog">
            <button aria-label="Close navigation" className="mobile-menu-trigger">
              <X size={21} aria-hidden="true" />
            </button>
          </form>
        </div>
        <div className="mobile-menu-body">
          <h2 id="mobile-menu-title" className="eyebrow text-muted-foreground">
            YOUR WORKSPACE
          </h2>
          <nav aria-label="Mobile navigation" className="mobile-menu-links">
            {links.map(([href, label, Icon]) => (
              <Link
                key={href}
                href={href}
                onClick={() => dialog.current?.close()}
                aria-current={
                  pathname === href || pathname.startsWith(href + "/") ? "page" : undefined
                }
              >
                <Icon size={19} strokeWidth={1.5} aria-hidden="true" />
                <span>{label}</span>
                {href === "/notifications" && unread > 0 && (
                  <span className="mobile-menu-count">{unread > 99 ? "99+" : unread}</span>
                )}
              </Link>
            ))}
            {actor?.role === "operator" && (
              <Link
                href="/operator"
                onClick={() => dialog.current?.close()}
                aria-current={pathname === "/operator" ? "page" : undefined}
              >
                <ShieldCheck size={19} aria-hidden="true" />
                <span>Operator Studio</span>
              </Link>
            )}
          </nav>
        </div>
        <div className="mobile-menu-account">
          {actor ? (
            <>
              <Avatar
                name={actor.name}
                image={actor.image}
                className="size-10 shrink-0 rounded-full"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{actor.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">Your private workspace</p>
              </div>
              <SignOut />
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => dialog.current?.close()}
              className="action-link w-full"
            >
              Sign in <ArrowUpRight size={15} />
            </Link>
          )}
        </div>
      </dialog>
    </>
  );
}

/** The four frequent destinations stay within thumb reach; More opens the full menu. */
export function MobileBottomNav() {
  const pathname = usePathname();
  const secondary = !["/dashboard", "/scholarships", "/saved", "/applications"].some(
    (href) => pathname === href || pathname.startsWith(href + "/"),
  );
  return (
    <nav aria-label="Quick navigation" className="mobile-bottom-nav">
      {[
        ["/dashboard", "Home", LayoutDashboard],
        ["/scholarships", "Discover", Compass],
        ["/saved", "Saved", Bookmark],
        ["/applications", "Plans", Columns3],
      ].map(([href, label, Icon]) => {
        const I = Icon as typeof Compass;
        const active = pathname === href || pathname.startsWith(String(href) + "/");
        return (
          <Link key={String(href)} href={String(href)} aria-current={active ? "page" : undefined}>
            <I size={20} strokeWidth={active ? 2 : 1.6} aria-hidden="true" />
            <span>{String(label)}</span>
          </Link>
        );
      })}
      <button
        type="button"
        aria-label="More navigation"
        aria-current={secondary ? "page" : undefined}
        aria-controls="workspace-mobile-menu"
        onClick={() => {
          const dialog = document.getElementById("workspace-mobile-menu");
          if (dialog instanceof HTMLDialogElement) dialog.showModal();
        }}
      >
        <Menu size={20} strokeWidth={1.6} aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>
  );
}
