"use client";
import { useId, useState, useSyncExternalStore } from "react";
import { Check, ChevronDown, X } from "lucide-react";
const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function ChoiceField({
  label,
  options,
  value,
  onChange,
  multiple = false,
  custom = false,
  hint,
  max = 20,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
  custom?: boolean;
  hint?: string;
  max?: number;
}) {
  const id = useId();
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const available = options
    .filter(
      (option) =>
        !value.includes(option) && option.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .slice(0, 30);
  const exact = options.find((option) => option.toLowerCase() === query.trim().toLowerCase());
  const canAdd =
    custom &&
    query.trim() &&
    !exact &&
    !value.some((v) => v.toLowerCase() === query.trim().toLowerCase());
  const choices = canAdd ? [...available, query.trim()] : available;
  const pick = (choice: string) => {
    if (!multiple || value.length < max)
      onChange(multiple ? [...new Set([...value, choice])] : [choice]);
    setQuery("");
    setActive(0);
    if (!multiple) setOpen(false);
  };
  return (
    <div className="min-w-0">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <div className="flex min-h-11 items-center rounded-lg border border-border bg-background pr-3 transition-shadow focus-within:border-primary/60 focus-within:ring-3 focus-within:ring-primary/10">
          <input
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={`${id}-options`}
            aria-autocomplete="list"
            aria-activedescendant={open && choices[active] ? `${id}-option-${active}` : undefined}
            aria-describedby={hint ? `${id}-hint` : undefined}
            autoComplete="off"
            disabled={!ready}
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
            value={open ? query : multiple ? "" : value[0] || ""}
            placeholder={multiple && value.length ? "Add another…" : "Search or choose…"}
            onFocus={() => {
              setOpen(true);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onBlur={() => {
              if (query.trim() && (exact || custom)) pick(exact || query.trim());
              setOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setActive((v) => Math.min(v + 1, choices.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((v) => Math.max(v - 1, 0));
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
                setQuery("");
              }
              if (e.key === "Enter" && open) {
                e.preventDefault();
                if (choices[active]) pick(choices[active]);
              }
            }}
          />
          <ChevronDown size={14} aria-hidden="true" />
        </div>
        {open && (
          <ul
            id={`${id}-options`}
            role="listbox"
            aria-label="Available choices"
            aria-multiselectable={multiple}
            className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-paper p-1.5 shadow-lg shadow-foreground/8"
          >
            {choices.map((choice, i) => (
              <li
                key={choice}
                id={`${id}-option-${i}`}
                role="option"
                aria-selected={active === i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(choice)}
                className={`cursor-pointer rounded-md px-3 py-3 text-xs ${active === i ? "bg-secondary text-primary" : "hover:bg-muted"}`}
              >
                {canAdd && choice === query.trim() ? `Use “${choice}”` : choice}
              </li>
            ))}
            {!choices.length && (
              <li className="px-3 py-3 text-xs text-muted-foreground">
                {value.length >= max
                  ? `Choose up to ${max}.`
                  : "No matching choices. Try a different search."}
              </li>
            )}
          </ul>
        )}
      </div>
      {value.length > 0 && (
        <ul aria-label={`Selected ${label.toLowerCase()}`} className="mt-2 flex flex-wrap gap-2">
          {value.map((choice) => (
            <li
              key={choice}
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-primary/10 bg-secondary px-2 py-1 text-[11px]"
            >
              <Check size={11} className="shrink-0" aria-hidden="true" />
              <span className="break-words">{choice}</span>
              <button
                type="button"
                aria-label={`Remove ${choice}`}
                className="ml-1 p-1"
                onClick={() => onChange(value.filter((v) => v !== choice))}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {hint && (
        <p id={`${id}-hint`} className="mt-2 text-[11px] leading-6 text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
