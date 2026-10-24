import { AuthLayout } from "@/components/auth-layout";
import { RecoveryForm } from "@/components/recovery-form";
export default function Reset() { return <AuthLayout title="Make it yours again." subtitle="Choose a new password with at least 10 characters."><RecoveryForm reset /></AuthLayout>; }
