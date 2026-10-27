import { requireUser } from "@/server/accounts/session";
import { getProfile } from "@/server/profiles";
import { SettingsFrame } from "@/components/settings-frame";
import { AppearanceSettings } from "@/components/theme-control";
import { TimeZoneSettings } from "@/components/time-zone-settings";
import { SunMoon } from "lucide-react";
export const metadata = { title: "Appearance & app" };
export default async function AppSettings() {
  const actor = await requireUser();
  const profile = await getProfile(actor);
  const options = [
    ...new Set(["UTC", profile.data.timeZone, ...Intl.supportedValuesOf("timeZone")]),
  ].sort();
  return (
    <SettingsFrame
      actor={actor}
      active="/settings/app"
      title="A workspace that feels like you."
      description="Choose your appearance and set the time zone for your scholarship plans."
    >
      <section className="settings-panel">
        <div>
          <span className="settings-icon">
            <SunMoon size={20} strokeWidth={1.5} />
          </span>
          <p className="eyebrow mt-5 text-leaf">SET THE ATMOSPHERE</p>
          <h2 className="mt-3 font-serif text-3xl">Appearance</h2>
          <p className="mt-3 text-xs leading-7 text-muted-foreground">
            Saved on this device. System follows your operating system.
          </p>
        </div>
        <AppearanceSettings />
      </section>
      <TimeZoneSettings
        initial={profile.data.timeZone}
        version={profile.version}
        options={options}
        previewAt={new Date().toISOString()}
      />
    </SettingsFrame>
  );
}
