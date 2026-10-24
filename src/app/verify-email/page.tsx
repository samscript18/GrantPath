import { AuthLayout } from "@/components/auth-layout";
import { VerificationResend } from "@/components/verification-resend";
export default async function Verify({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  const { error, email } = await searchParams;
  return (
    <AuthLayout
      title="Check your inbox."
      subtitle={
        error
          ? "This verification link has expired or was already used. Sign in if your account is verified, or request a new link below."
          : "Follow the verification link to activate your account. The link expires in one hour. If delivery fails, request a new one below."
      }
    >
      <VerificationResend initialEmail={email} />
    </AuthLayout>
  );
}
