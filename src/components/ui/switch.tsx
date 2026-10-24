"use client";
export function Switch({
  name,
  label,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  name: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-1 transition-colors disabled:cursor-wait disabled:opacity-50 ${checked ? "border-primary bg-primary" : "border-muted-foreground/35 bg-muted"}`}
      >
        <span
          aria-hidden="true"
          className={`size-4 rounded-full shadow-sm transition-transform duration-200 ${checked ? "translate-x-5 bg-primary-foreground" : "translate-x-0 bg-muted-foreground"}`}
        />
      </button>
      <input type="hidden" name={name} value="on" disabled={!checked || disabled} />
    </>
  );
}
