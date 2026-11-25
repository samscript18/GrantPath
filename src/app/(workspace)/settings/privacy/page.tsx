import { requireUser } from "@/server/accounts/session";
import { getProfile } from "@/server/profiles";
import { privacyStatus } from "@/server/accounts/privacy";
import { SettingsFrame } from "@/components/settings-frame";
import { AccountPrivacy } from "@/components/account-privacy";
export const metadata = { title: "Privacy & data" };
export default async function PrivacySettings() {
  const actor = await requireUser();
  const [initial, profile] = await Promise.all([privacyStatus(actor), getProfile(actor)]);
  return (
    <SettingsFrame
      actor={actor}
      active="/settings/privacy"
      title="Privacy & data"
      description="Download your account data or request deletion."
    >
      <AccountPrivacy email={actor.email} initial={initial} timeZone={profile.data.timeZone} />
    </SettingsFrame>
  );
}
