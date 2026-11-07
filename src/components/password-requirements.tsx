import { passwordRequirements } from "@/lib/password";
import { Check, KeyRound } from "lucide-react";

const displayLabels: Record<string, string> = {
  length: "10–128 characters",
  lowercase: "Lowercase letter",
  uppercase: "Uppercase letter",
  number: "One number",
  symbol: "Symbol (!, @, -)",
  match: "Passwords match",
};

export function PasswordRequirements({
  password,
  confirmation,
  id,
}: {
  password: string;
  confirmation: string;
  id: string;
}) {
  const requirements = [
    ...passwordRequirements.map((rule) => ({
      label: rule.label,
      met: rule.met(password),
      id: rule.id,
    })),
    {
      id: "match",
      label: "Passwords match",
      met: password.length > 0 && confirmation === password,
    },
  ];
  const completed = requirements.filter((rule) => rule.met).length;
  const complete = completed === requirements.length;
  return (
    <div
      id={id}
      role="group"
      aria-labelledby={`${id}-title`}
      className={`overflow-hidden rounded-xl border transition-colors duration-200 ${complete ? "border-primary/25 bg-secondary/35" : "border-border bg-paper"}`}
    >
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-secondary/70 text-primary"
          >
            <KeyRound size={17} strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <p id={`${id}-title`} className="text-xs font-semibold">
              Your password checklist
            </p>
            <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
              A clear checklist for your new password.
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold tabular-nums ${complete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            aria-hidden="true"
          >
            {completed}/{requirements.length}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Password requirements met"
          aria-valuemin={0}
          aria-valuemax={requirements.length}
          aria-valuenow={completed}
          aria-valuetext={`${completed} of ${requirements.length} requirements met`}
          className="mt-4 flex gap-1.5"
        >
          {requirements.map((rule, index) => (
            <span
              key={rule.id}
              aria-hidden="true"
              className={`h-1 min-w-0 flex-1 rounded-full transition-colors duration-200 ${index < completed ? "bg-leaf" : "bg-border/70"}`}
            />
          ))}
        </div>
        <ul
          aria-label="Password requirements"
          className="mt-4 mb-4 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] sm:mb-5"
        >
          {requirements.map((rule) => (
            <li
              key={rule.id}
              className={`flex min-w-0 items-start gap-2 rounded-md py-1.5 leading-5 transition-colors duration-200 ${rule.met ? "text-success-foreground" : "text-muted-foreground"}`}
            >
              <input
                type="checkbox"
                aria-label={rule.label}
                checked={rule.met}
                disabled
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${rule.met ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 bg-background"}`}
              >
                {rule.met ? (
                  <Check size={10} strokeWidth={2.5} />
                ) : (
                  <span className="size-1 rounded-full bg-muted-foreground/30" />
                )}
              </span>
              <span aria-hidden="true">{displayLabels[rule.id] || rule.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <p
        className={`flex items-center gap-2 border-t px-4 py-3 text-[10px] leading-5 sm:px-5 ${complete ? "border-primary/10 bg-secondary/40 text-success-foreground" : "border-border/70 bg-muted/30 text-muted-foreground"}`}
      >
        {complete && <Check size={13} strokeWidth={2} aria-hidden="true" />}
        {complete
          ? "Your password meets all requirements."
          : "Each check updates automatically as you type."}
      </p>
      <p className="sr-only" role="status" aria-atomic="true">
        {completed} of {requirements.length} requirements met.
      </p>
    </div>
  );
}
