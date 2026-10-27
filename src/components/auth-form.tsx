"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { newPasswordSchema } from "@/lib/password";
import { PasswordInput } from "./password-input";
import { PasswordRequirements } from "./password-requirements";
const schema = (mode: "login" | "register") =>
  z
    .object({
      name: z.string().max(100).optional(),
      email: z.email(),
      password:
        mode === "register" ? newPasswordSchema : z.string().min(1, "Enter your password").max(128),
      confirmPassword: z.string().optional(),
    })
    .refine((values) => mode !== "register" || values.password === values.confirmPassword, {
      path: ["confirmPassword"],
      message: "Passwords must match.",
    });
type Values = z.infer<ReturnType<typeof schema>>;
export function AuthForm({
  mode,
  googleEnabled = false,
  oauthFailed = false,
}: {
  mode: "login" | "register";
  googleEnabled?: boolean;
  oauthFailed?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState(
    oauthFailed
      ? "Google sign-in did not finish. If you created your account with email and password, continue that way. Otherwise, please retry Google."
      : "",
  );
  const [googlePending, setGooglePending] = useState(false);
  async function continueWithGoogle() {
    setMessage("");
    setGooglePending(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
        newUserCallbackURL: "/profile",
        errorCallbackURL: "/login?oauth=failed",
      });
      if (result.error) {
        setMessage("Google sign-in is unavailable. Please try again or use email and password.");
        setGooglePending(false);
      }
    } catch {
      setMessage("Unable to connect to Google. Please try again or use email and password.");
      setGooglePending(false);
    }
  }
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema(mode)),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const [password, confirmation] = useWatch({ control, name: ["password", "confirmPassword"] });
  const onSubmit = handleSubmit(async (values) => {
    setMessage("");
    try {
      const result =
        mode === "register"
          ? await authClient.signUp.email({
              email: values.email,
              password: values.password,
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
      {googleEnabled && (
        <>
          <Button
            type="button"
            variant="outline"
            className="w-full bg-paper"
            onClick={continueWithGoogle}
            disabled={googlePending || isSubmitting}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4 shrink-0"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="#4285F4"
                d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z"
              />
              <path
                fill="#34A853"
                d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
              />
              <path
                fill="#FBBC05"
                d="M6.41 13.93A6 6 0 0 1 6.1 12c0-.67.12-1.32.31-1.93V7.48H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.52l3.34-2.59Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.95c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.48l3.34 2.59C7.2 7.71 9.4 5.95 12 5.95Z"
              />
            </svg>
            {googlePending ? "Connecting to Google…" : "Continue with Google"}
          </Button>
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or continue with email
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
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
          <p className="mt-2 text-xs text-danger-foreground" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>
      <div>
        <label className="field-label" htmlFor="password">
          Password
        </label>
        <PasswordInput
          id="password"
          label="Password"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          aria-invalid={!!errors.password}
          aria-describedby={
            mode === "register" ? "password-checklist password-error" : "password-error"
          }
          {...register("password")}
        />
        {errors.password && (
          <p id="password-error" className="mt-2 text-xs text-danger-foreground" role="alert">
            {errors.password.message}
          </p>
        )}
        {mode === "login" && (
          <div className="mt-3 text-right">
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary underline underline-offset-4"
            >
              Forgot password?
            </Link>
          </div>
        )}
      </div>
      {mode === "register" && (
        <>
          <div>
            <label className="field-label" htmlFor="confirm-password">
              Confirm password
            </label>
            <PasswordInput
              id="confirm-password"
              label="Confirm password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby="confirmation-error"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p
                id="confirmation-error"
                className="mt-2 text-xs text-danger-foreground"
                role="alert"
              >
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
          <PasswordRequirements
            id="password-checklist"
            password={password || ""}
            confirmation={confirmation || ""}
          />
        </>
      )}
      {message && (
        <p role="alert" className="rounded-md bg-danger p-3 text-sm text-danger-foreground">
          {message}
        </p>
      )}
      <Button className="w-full" disabled={isSubmitting || googlePending}>
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
