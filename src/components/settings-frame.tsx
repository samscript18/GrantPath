import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { PageHeading } from "./page-heading";
import type { Actor } from "@/server/accounts/auth";
export function SettingsFrame({
  actor,
  active,
  title,
  description,
  children,
}: {
  actor: Actor;
  active: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeading eyebrow="YOUR WORKSPACE, YOUR WAY" title={title} description={description}>
        <span
          className="hidden items-center gap-2 rounded-full border border-border bg-paper px-3 py-2 text-[11px] text-muted-foreground xl:inline-flex"
          title={`Private settings for ${actor.name}`}
        >
          <ShieldCheck size={14} strokeWidth={1.5} aria-hidden="true" />
          Your private workspace
        </span>
      </PageHeading>
      <nav
        aria-label="Settings navigation"
        className="settings-navigation mb-9 flex gap-1 overflow-x-auto border-b border-border text-xs"
      >
        {(
          [
            ["/settings", "Overview"],
            ["/settings/profile", "Study profile"],
            ["/settings/notifications", "Notifications"],
            ["/settings/app", "Appearance & app"],
            ["/settings/account", "Password & sessions"],
            ["/settings/privacy", "Privacy & data"],
          ] as const
        ).map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={active === href ? "page" : undefined}
            className={`relative shrink-0 px-4 py-4 transition-colors first:pl-0 ${active === href ? "font-semibold text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary first:after:left-0" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </>
  );
}
