import { AuthForm } from "@/components/auth-form";
import { AuthLayout } from "@/components/auth-layout";
import { googleSignInEnabled } from "@/server/accounts/google";
export const metadata = { title: "Sign in" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string }>;
}) {
  const { oauth } = await searchParams;
  return (
    <AuthLayout
      title="Good to have you back."
      subtitle="Your next opportunity is waiting. Pick up where you left off."
    >
      <AuthForm
        mode="login"
        googleEnabled={googleSignInEnabled()}
        oauthFailed={oauth === "failed"}
      />
    </AuthLayout>
  );
}
