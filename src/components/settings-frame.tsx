import Link from "next/link";
import {
  ShieldCheck,
  LayoutGrid,
  GraduationCap,
  Bell,
  SunMoon,
  KeyRound,
  Database,
} from "lucide-react";
import { PageHeading } from "./page-heading";
import type { Actor } from "@/server/accounts/auth";
const settingsLinks = [
  ["/settings", "Overview", LayoutGrid],
  ["/settings/profile", "Study profile", GraduationCap],
  ["/settings/notifications", "Notifications", Bell],
  ["/settings/app", "Appearance & app", SunMoon],
  ["/settings/account", "Password & sessions", KeyRound],
  ["/settings/privacy", "Privacy & data", Database],
] as const;
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
    <div className="settings-page">
      <PageHeading eyebrow="YOUR WORKSPACE, YOUR WAY" title={title} description={description}>
        <span
          className="hidden items-center gap-2 text-[11px] text-muted-foreground xl:inline-flex"
          title={`Private settings for ${actor.name}`}
        >
          <ShieldCheck size={14} className="text-leaf" strokeWidth={1.5} aria-hidden="true" />
          Your private workspace
        </span>
      </PageHeading>
      <nav
        aria-label="Settings navigation"
        className="settings-dock mb-8 flex gap-1 overflow-x-auto rounded-xl border border-border bg-paper p-1.5 text-xs"
      >
        {settingsLinks.map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            aria-current={active === href ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-3 transition-colors ${active === href ? "bg-primary font-medium text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary/60 hover:text-primary"}`}
          >
            <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
