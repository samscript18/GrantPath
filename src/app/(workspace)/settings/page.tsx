import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  GraduationCap,
  SunMoon,
  KeyRound,
  Database,
  ShieldCheck,
} from "lucide-react";
import { requireUser } from "@/server/accounts/session";
import { SettingsFrame } from "@/components/settings-frame";
export const metadata = { title: "Settings" };
export default async function Settings() {
  const actor = await requireUser();
  return (
    <SettingsFrame
      actor={actor}
      active="/settings"
      title="Make this space your own."
      description="Your plans, your preferences, and the details that keep your account secure."
    >
      <Link
        href="/settings/profile"
        className="settings-profile-feature group relative mb-5 flex flex-col gap-6 overflow-hidden rounded-2xl border border-primary/15 bg-secondary/60 p-6 sm:flex-row sm:items-center sm:p-8"
      >
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-paper text-primary">
          <GraduationCap size={26} strokeWidth={1.2} aria-hidden="true" />
        </span>
        <div className="relative min-w-0 flex-1">
          <p className="eyebrow text-leaf">THE STARTING POINT FOR YOUR MATCHES</p>
          <h2 className="mt-3 font-serif text-3xl tracking-tight">Your study profile</h2>
          <p className="mt-3 max-w-xl text-[13px] leading-7 text-muted-foreground">
            Keep your circumstances, original qualifications and future plans together. Update them
            as your next chapter takes shape.
          </p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-paper transition-transform group-hover:translate-x-1">
          <ArrowUpRight size={18} aria-hidden="true" />
        </span>
      </Link>
      <div className="settings-directory grid gap-4 md:grid-cols-2">
        {(
          [
            [
              "/settings/notifications",
              "Notifications",
              "Choose the updates you want.",
              "Topics, inbox alerts and scholarship emails, on your terms.",
              Bell,
            ],
            [
              "/settings/app",
              "Appearance & app",
              "Settle into your workspace.",
              "Light, dark or system appearance, plus your local time zone.",
              SunMoon,
            ],
            [
              "/settings/account",
              "Password & sessions",
              "Keep access in your hands.",
              "Change your password with email verification and manage signed-in devices.",
              KeyRound,
            ],
            [
              "/settings/privacy",
              "Privacy & data",
              "Your information. Your choice.",
              "Take a copy of your account or manage a request to close it.",
              Database,
            ],
          ] as const
        ).map(([href, title, subtitle, description, Icon]) => (
          <Link
            key={href}
            href={href}
            className="settings-directory-link group rounded-xl border border-border bg-paper p-6 transition-colors hover:border-primary/25"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary/70 text-primary">
                <Icon size={19} strokeWidth={1.4} aria-hidden="true" />
              </span>
              <ArrowUpRight
                size={16}
                className="text-muted-foreground transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </div>
            <h2 className="mt-6 font-serif text-[25px] tracking-tight">{title}</h2>
            <p className="mt-2 text-xs font-medium">{subtitle}</p>
            <p className="mt-3 text-[13px] leading-7 text-muted-foreground">{description}</p>
          </Link>
        ))}
      </div>
      <p className="mt-7 flex items-center gap-2 text-[11px] leading-6 text-muted-foreground">
        <ShieldCheck size={14} className="shrink-0 text-leaf" aria-hidden="true" />
        Your profile and account settings stay private.
      </p>
    </SettingsFrame>
  );
}
