import { AuthForm } from "@/components/auth-form";
import { AuthLayout } from "@/components/auth-layout";
export const metadata = { title: "Sign in" };
export default function Login() { return <AuthLayout title="Good to have you back." subtitle="Your next opportunity is waiting. Pick up where you left off."><AuthForm mode="login" /></AuthLayout>; }
