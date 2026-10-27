import { AuthForm } from "@/components/auth-form";
import { AuthLayout } from "@/components/auth-layout";
import { googleSignInEnabled } from "@/server/accounts/google";
export const metadata = { title: "Sign in" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string; passwordChanged?: string }>;
}) {
  const { oauth, passwordChanged } = await searchParams;
  return (
    <AuthLayout
      title="Good to have you back."
      subtitle="Your next opportunity is waiting. Pick up where you left off."
    >
      {passwordChanged === "1" && (
        <p
          role="status"
          className="mb-5 rounded-lg border border-primary/20 bg-secondary/40 p-4 text-xs leading-6"
        >
          Your password was changed and all sessions were signed out. Sign in with your new
          password.
        </p>
      )}
      <AuthForm
        mode="login"
        googleEnabled={googleSignInEnabled()}
        oauthFailed={oauth === "failed"}
      />
    </AuthLayout>
  );
}
