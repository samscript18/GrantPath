import { AuthForm } from "@/components/auth-form";
import { AuthLayout } from "@/components/auth-layout";
import { googleSignInEnabled } from "@/server/accounts/google";
import { connection } from "next/server";
export const metadata = { title: "Create an account" };
export default async function Register() {
  await connection();
  return (
    <AuthLayout
      title="Let’s find your path."
      subtitle="A little about you. A clearer view of what’s possible."
    >
      <AuthForm mode="register" googleEnabled={googleSignInEnabled()} />
    </AuthLayout>
  );
}
