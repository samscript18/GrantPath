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
      title="Your information. Your choice."
      description="Take a copy of your workspace or manage a request to close your account."
    >
      <AccountPrivacy email={actor.email} initial={initial} timeZone={profile.data.timeZone} />
    </SettingsFrame>
  );
}
