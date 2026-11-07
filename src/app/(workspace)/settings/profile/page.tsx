import { requireUser } from "@/server/accounts/session";
import { getProfile } from "@/server/profiles";
import { institutionChoices } from "@/server/profiles/options";
import { SettingsFrame } from "@/components/settings-frame";
import { ProfileForm } from "@/components/profile-form";
export const metadata = { title: "Profile settings" };
export default async function ProfileSettings() {
  const actor = await requireUser();
  const [profile, institutions] = await Promise.all([getProfile(actor), institutionChoices()]);
  return (
    <SettingsFrame
      actor={actor}
      active="/settings/profile"
      title="A little about you."
      description="Your original qualifications, circumstances and future plans. Save your progress at each stage."
    >
      <ProfileForm
        initial={profile.data}
        version={profile.version}
        stage={profile.stage}
        institutions={institutions}
      />
    </SettingsFrame>
  );
}
