import { AuthLayout } from "@/components/auth-layout";
import { RecoveryForm } from "@/components/recovery-form";
export default function Forgot() {
  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email to receive a password reset link."
    >
      <RecoveryForm />
    </AuthLayout>
  );
}
