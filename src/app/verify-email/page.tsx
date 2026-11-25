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
      title="Verify your email"
      subtitle={
        error
          ? "This verification link has expired or was already used. Sign in if your account is verified, or request a new link below."
          : "Open the link in your email to activate your account. It expires in one hour. Request a new link below if needed."
      }
    >
      <VerificationResend initialEmail={email} />
    </AuthLayout>
  );
}
