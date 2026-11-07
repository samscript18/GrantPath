import { headers } from "next/headers";
import { requireUser } from "@/server/accounts/session";
import { accountDetails } from "@/server/accounts/method";
import { getProfile } from "@/server/profiles";
import { ownedSessionId } from "@/server/accounts/request-session";
import { sessionList } from "@/server/accounts/security";
import { SettingsFrame } from "@/components/settings-frame";
import { AccountSecurity } from "@/components/account-security";
export const metadata = { title: "Password & sessions" };
export default async function AccountSettings() {
  const actor = await requireUser();
  const [account, profile, sessionId] = await Promise.all([
    accountDetails(actor),
    getProfile(actor),
    ownedSessionId(actor, await headers()),
  ]);
  const sessions = await sessionList(actor, sessionId);
  return (
    <SettingsFrame
      actor={actor}
      active="/settings/account"
      title="Keep your account in good hands."
      description="Change your password with email verification and manage the devices signed in to your account."
    >
      <AccountSecurity
        method={account.authMethod}
        email={account.email}
        initialSessions={sessions}
        timeZone={profile.data.timeZone}
      />
    </SettingsFrame>
  );
}
