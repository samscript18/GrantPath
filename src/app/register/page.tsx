import { AuthForm } from "@/components/auth-form";
import { AuthLayout } from "@/components/auth-layout";
export const metadata = { title: "Create an account" };
export default function Register() { return <AuthLayout title="Let’s find your path." subtitle="A little about you. A clearer view of what’s possible."><AuthForm mode="register" /></AuthLayout>; }
