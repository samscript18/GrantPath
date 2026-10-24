import { passwordRequirements } from "@/lib/password";

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
  return (
    <div id={id} className="rounded-md border border-border bg-paper p-4">
      <p className="mb-3 text-xs font-semibold">Your password checklist</p>
      <ul aria-label="Password requirements" className="grid gap-2.5 text-xs">
        {requirements.map((rule) => (
          <li
            key={rule.id}
            className={`flex items-center gap-2.5 ${rule.met ? "text-success-foreground" : "text-muted-foreground"}`}
          >
            <input
              type="checkbox"
              aria-label={rule.label}
              checked={rule.met}
              disabled
              className="size-3.5 shrink-0 accent-primary opacity-100"
            />
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>
      <p className="sr-only" role="status">
        {requirements.filter((rule) => rule.met).length} of {requirements.length} requirements met.
      </p>
    </div>
  );
}
