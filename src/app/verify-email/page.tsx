import { AuthLayout } from "@/components/auth-layout";
import { RecoveryForm } from "@/components/recovery-form";
export default function Verify() {
  return (
    <AuthLayout
      title="Check your inbox."
      subtitle="Follow the verification link to activate your account. The link expires in one hour. If delivery fails, request a new one below."
    >
      <RecoveryForm verify />
    </AuthLayout>
  );
}
