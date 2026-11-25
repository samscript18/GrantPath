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
      title="Your study profile"
      description="Add your education and study plans. You can save and return at any step."
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
