"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
const schema = z.object({
  name: z.string().max(100).optional(),
  email: z.email(),
  password: z.string().min(10, "Use at least 10 characters").max(128),
});
type Values = z.infer<typeof schema>;
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });
  const onSubmit = handleSubmit(async (values) => {
    setMessage("");
    try {
      const result =
        mode === "register"
          ? await authClient.signUp.email({
              ...values,
              name: values.name || "Scholar",
              callbackURL: "/profile",
            })
          : await authClient.signIn.email({ email: values.email, password: values.password });
      if (result.error) setMessage(result.error.message || "Unable to continue. Please try again.");
      else if (mode === "register")
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
      else {
        router.replace("/dashboard");
        router.refresh();
      }
    } catch {
      setMessage("Account service unavailable. Please retry in a moment.");
    }
  });
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {mode === "register" && (
        <div>
          <label className="field-label" htmlFor="name">
            Your name
          </label>
          <Input id="name" autoComplete="name" {...register("name")} />
        </div>
      )}
      <div>
        <label className="field-label" htmlFor="email">
          Email address
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="mt-2 text-xs text-red-800" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>
      <div>
        <div className="flex justify-between">
          <label className="field-label" htmlFor="password">
            Password
          </label>
          {mode === "login" && (
            <Link href="/forgot-password" className="text-xs underline">
              Forgot password?
            </Link>
          )}
        </div>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <p className="mt-2 text-xs text-red-800" role="alert">
            {errors.password.message}
          </p>
        )}
        {mode === "register" && (
          <p className="mt-2 text-xs text-muted-foreground">
            At least 10 characters. Make it uniquely yours.
          </p>
        )}
      </div>
      {message && (
        <p role="alert" className="rounded-md bg-[#f9e8e3] p-3 text-sm text-red-900">
          {message}
        </p>
      )}
      <Button className="w-full" disabled={isSubmitting}>
        {isSubmitting
          ? "One moment…"
          : mode === "register"
            ? "Create your account →"
            : "Welcome back →"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {mode === "login" ? "New to GrantPath?" : "Already have an account?"}{" "}
        <Link
          className="font-semibold text-primary underline underline-offset-4"
          href={mode === "login" ? "/register" : "/login"}
        >
          {mode === "login" ? "Find your path" : "Sign in"}
        </Link>
      </p>
      {mode === "login" && (
        <p className="text-center text-xs">
          <Link href="/verify-email" className="text-muted-foreground underline underline-offset-4">
            Resend an email verification link
          </Link>
        </p>
      )}
    </form>
  );
}
