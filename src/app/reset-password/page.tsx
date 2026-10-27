import { AuthLayout } from "@/components/auth-layout";
import { RecoveryForm } from "@/components/recovery-form";
export default function Reset() {
  return (
    <AuthLayout
      title="Make it yours again."
      subtitle="Choose a new password, then confirm it. The checklist will guide you."
    >
      <RecoveryForm reset />
    </AuthLayout>
  );
}
