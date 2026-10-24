import { requireUser } from "@/server/accounts/session";
import { getProfile } from "@/server/profiles";
import { Shell } from "@/components/shell";
import { PageHeading } from "@/components/page-heading";
import { ProfileForm } from "@/components/profile-form";
export const metadata = { title: "Your profile" };
export default async function ProfilePage() {
  const actor = await requireUser();
  const profile = await getProfile(actor);
  return (
    <Shell actor={actor} active="/profile">
      <PageHeading
        eyebrow="MADE PERSONAL"
        title="A little about you."
        description="Build a clearer picture of where you are, and where you’d like to go."
      />
      <ProfileForm initial={profile.data} version={profile.version} stage={profile.stage} />
    </Shell>
  );
}
