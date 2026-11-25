import { AuthForm } from "@/components/auth-form";
import { AuthLayout } from "@/components/auth-layout";
import { googleSignInEnabled } from "@/server/accounts/google";
import { connection } from "next/server";
export const metadata = { title: "Create an account" };
export default async function Register() {
  await connection();
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Get personal matches, save scholarships and plan your applications."
    >
      <AuthForm mode="register" googleEnabled={googleSignInEnabled()} />
    </AuthLayout>
  );
}
