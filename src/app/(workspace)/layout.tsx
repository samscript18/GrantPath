import { Shell } from "@/components/shell";
import { StudyProfilePrompt } from "@/components/study-profile-prompt";
import { getProfile } from "@/server/profiles";
import { profileReadiness } from "@/server/profiles/readiness";
import { institutionChoices } from "@/server/profiles/options";
import { currentUser, currentSession } from "@/server/accounts/session";
import { unreadCount } from "@/server/notifications";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const actor = await currentUser();
  const unread = actor ? await unreadCount(actor) : 0;
  const session = actor?.role === "student" ? await currentSession() : null;
  const profile = session && actor ? await getProfile(actor) : null;
  const needsProfile =
    profile && (!profile.onboardingCompletedAt || !profileReadiness(profile.data).ready);
  const institutions = needsProfile ? await institutionChoices() : [];
  return (
    <Shell actor={actor} unread={unread}>
      {children}
      {needsProfile && profile && session && (
        <StudyProfilePrompt
          key={session.session.id}
          sessionId={session.session.id}
          initial={{ data: profile.data, version: profile.version, stage: profile.stage }}
          institutions={institutions}
        />
      )}
    </Shell>
  );
}
