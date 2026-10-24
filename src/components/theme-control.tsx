"use client";

import { useSyncExternalStore } from "react";
import { SunMoon, Sun, Moon, Monitor, Check } from "lucide-react";
import { isAppearance, THEME_STORAGE_KEY, type Appearance } from "@/lib/theme";

const changeEvent = "grantpath-appearance-change";
function getAppearance(): Appearance {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (isAppearance(value)) return value;
  } catch {
    // Browsers can disable storage. Preserve the current tab's choice.
  }
  const temporary = document.documentElement.dataset.appearance;
  return isAppearance(temporary) ? temporary : "system";
}
function applyAppearance(appearance: Appearance) {
  const dark =
    appearance === "dark" ||
    (appearance === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.appearance = appearance;
}
function subscribe(onChange: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const sync = () => {
    applyAppearance(getAppearance());
    onChange();
  };
  const storage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      delete document.documentElement.dataset.appearance;
      sync();
    }
  };
  sync();
  window.addEventListener(changeEvent, sync);
  window.addEventListener("storage", storage);
  media.addEventListener("change", sync);
  return () => {
    window.removeEventListener(changeEvent, sync);
    window.removeEventListener("storage", storage);
    media.removeEventListener("change", sync);
  };
}
const serverAppearance = (): Appearance => "system";

function chooseAppearance(next: Appearance) {
  applyAppearance(next);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    /* Keep the choice for this tab when browser storage is unavailable. */
  }
  window.dispatchEvent(new Event(changeEvent));
}

export function AppearanceSettings() {
  const appearance = useSyncExternalStore(subscribe, getAppearance, serverAppearance);
  return (
    <fieldset>
      <legend className="sr-only">Workspace appearance</legend>
      <div className="appearance-options grid grid-cols-3 gap-2 sm:gap-3">
        {(
          [
            ["light", "Light", "A little room to breathe.", Sun],
            ["dark", "Dark", "A softer evening glow.", Moon],
            ["system", "System", "In tune with your device.", Monitor],
          ] as const
        ).map(([value, label, description, Icon]) => (
          <label key={value} className="group relative cursor-pointer">
            <input
              type="radio"
              name="workspace-appearance"
              value={value}
              checked={appearance === value}
              onChange={() => chooseAppearance(value)}
              className="peer sr-only"
            />
            <span className="block rounded-xl border border-border bg-paper p-3 transition-colors peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-accent">
              <span aria-hidden="true" className={`theme-preview theme-preview-${value}`}>
                <span className="theme-preview-sidebar">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="theme-preview-content">
                  <span />
                  <span />
                  <span />
                </span>
              </span>
              <span className="mt-4 flex items-center gap-2 text-xs font-semibold">
                <Icon size={14} aria-hidden="true" />
                {label}
                <span className="ml-auto flex size-4 items-center justify-center rounded-full border border-border">
                  {appearance === value && <Check size={11} aria-hidden="true" />}
                </span>
              </span>
              <span className="mt-2 hidden text-[11px] leading-5 text-muted-foreground sm:block">
                {description}
              </span>
            </span>
          </label>
        ))}
      </div>
      <p className="mt-5 text-xs leading-6 text-muted-foreground">
        Changes apply immediately and are saved on this device.
      </p>
    </fieldset>
  );
}

export function ThemeControl({ compactOnMobile = false }: { compactOnMobile?: boolean }) {
  const appearance = useSyncExternalStore(subscribe, getAppearance, serverAppearance);
  return (
    <label
      title={`Appearance: ${appearance}`}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-paper px-2 py-1.5 text-foreground ${compactOnMobile ? "theme-control-responsive" : ""}`}
    >
      <SunMoon size={14} aria-hidden="true" />
      <span className="sr-only">Appearance</span>
      <select
        aria-label="Appearance"
        className="max-w-20 cursor-pointer bg-transparent text-[11px]"
        value={appearance}
        onChange={(event) => {
          const next = event.target.value;
          if (!isAppearance(next)) return;
          chooseAppearance(next);
        }}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
