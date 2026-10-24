import { AuthLayout } from "@/components/auth-layout";
import { RecoveryForm } from "@/components/recovery-form";
export default async function Verify({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const error = (await searchParams).error;
  return (
    <AuthLayout
      title="Check your inbox."
      subtitle={
        error
          ? "This verification link has expired or was already used. Sign in if your account is verified, or request a new link below."
          : "Follow the verification link to activate your account. The link expires in one hour. If delivery fails, request a new one below."
      }
    >
      <RecoveryForm verify />
    </AuthLayout>
  );
}
