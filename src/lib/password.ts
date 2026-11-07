import { z } from "zod";

export const passwordRequirements = [
  {
    id: "length",
    label: "10–128 characters",
    met: (value: string) => value.length >= 10 && value.length <= 128,
  },
  { id: "lowercase", label: "A lowercase letter", met: (value: string) => /[a-z]/.test(value) },
  { id: "uppercase", label: "An uppercase letter", met: (value: string) => /[A-Z]/.test(value) },
  { id: "number", label: "A number", met: (value: string) => /[0-9]/.test(value) },
  {
    id: "symbol",
    label: "A symbol (for example !, @ or -)",
    met: (value: string) => /[^a-zA-Z0-9\s]/.test(value),
  },
] as const;

export const newPasswordSchema = z.string().superRefine((value, ctx) => {
  for (const requirement of passwordRequirements) {
    if (!requirement.met(value))
      ctx.addIssue({ code: "custom", message: `Include ${requirement.label.toLowerCase()}.` });
  }
});

export const passwordConfirmationSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match.",
  });
