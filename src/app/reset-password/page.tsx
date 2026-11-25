import { AuthLayout } from "@/components/auth-layout";
import { RecoveryForm } from "@/components/recovery-form";
export default function Reset() {
  return (
    <AuthLayout title="Choose a new password" subtitle="Enter and confirm your new password.">
      <RecoveryForm reset />
    </AuthLayout>
  );
}
