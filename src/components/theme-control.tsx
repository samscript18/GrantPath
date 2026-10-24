"use client";

import { useSyncExternalStore } from "react";
import { SunMoon } from "lucide-react";
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

export function ThemeControl() {
  const appearance = useSyncExternalStore(subscribe, getAppearance, serverAppearance);
  return (
    <label className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-paper px-2 py-1.5 text-foreground">
      <SunMoon size={14} aria-hidden="true" />
      <span className="sr-only">Appearance</span>
      <select
        aria-label="Appearance"
        className="max-w-20 cursor-pointer bg-transparent text-[11px]"
        value={appearance}
        onChange={(event) => {
          const next = event.target.value;
          if (!isAppearance(next)) return;
          applyAppearance(next);
          try {
            localStorage.setItem(THEME_STORAGE_KEY, next);
          } catch {
            /* Tab-local fallback. */
          }
          window.dispatchEvent(new Event(changeEvent));
        }}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
