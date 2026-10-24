import Link from "next/link";
import { ArrowUpRight, Bell, UserRound, SunMoon, ShieldCheck, Sprout } from "lucide-react";
import { requireUser } from "@/server/accounts/session";
import { SettingsFrame } from "@/components/settings-frame";
export const metadata = { title: "Settings" };
export default async function Settings() {
  const actor = await requireUser();
  return (
    <SettingsFrame
      actor={actor}
      active="/settings"
      title="Make yourself at home."
      description="Your profile, updates, appearance and account, in one place."
    >
      <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="border-t border-border">
          {(
            [
              [
                "/settings/profile",
                "Your student profile",
                "Citizenship, education, study plans and original academic results.",
                UserRound,
              ],
              [
                "/settings/notifications",
                "Notification preferences",
                "Choose relevant topics and switch inbox or email updates on and off.",
                Bell,
              ],
              [
                "/settings/app",
                "Appearance & app",
                "Light, dark or system appearance, and your local time zone.",
                SunMoon,
              ],
              [
                "/settings/privacy",
                "Privacy & data",
                "Download your account information or manage a deletion request.",
                ShieldCheck,
              ],
              [
                "/settings/account",
                "Password & sessions",
                "Change your password with a verification code and manage signed-in devices.",
                ShieldCheck,
              ],
            ] as const
          ).map(([href, title, description, Icon]) => (
            <Link
              key={String(href)}
              href={String(href)}
              className="group -mx-3 flex items-start gap-5 rounded-lg border-b border-border px-3 py-7 transition-colors hover:bg-paper"
            >
              <span className="rounded-xl border border-border/50 bg-secondary/65 p-3 text-primary transition-colors group-hover:bg-secondary">
                <Icon size={20} strokeWidth={1.4} />
              </span>
              <span className="flex-1">
                <span className="block font-serif text-[25px] tracking-tight">{String(title)}</span>
                <span className="mt-2 block text-xs leading-6 text-muted-foreground">
                  {String(description)}
                </span>
              </span>
              <ArrowUpRight
                size={18}
                className="mt-3 transition-transform group-hover:translate-x-1"
              />
            </Link>
          ))}
        </div>
        <aside className="relative overflow-hidden rounded-xl bg-secondary p-7">
          <Sprout size={32} strokeWidth={1.1} className="text-leaf" aria-hidden="true" />
          <p className="eyebrow mt-8 text-muted-foreground">A LITTLE MORE YOU</p>
          <h2 className="editorial mt-4 text-3xl leading-tight">
            Your plans evolve.
            <br />
            <em>So can your workspace.</em>
          </h2>
          <p className="mt-5 text-xs leading-7 text-muted-foreground">
            Keep your profile up to date for clearer matches, and make room for the notifications
            that matter to you.
          </p>
          <div className="mt-7 flex items-center gap-2 border-t border-primary/15 pt-5 text-[11px]">
            <ShieldCheck size={14} aria-hidden="true" />
            Your profile stays private.
          </div>
        </aside>
      </div>
    </SettingsFrame>
  );
}
