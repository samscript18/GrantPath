export const THEME_STORAGE_KEY = "grantpath.appearance";
export type Appearance = "system" | "light" | "dark";
export function isAppearance(value: unknown): value is Appearance {
  return value === "system" || value === "light" || value === "dark";
}

// Static, trusted code only. Runs in <head> before content paints.
export const THEME_INIT_SCRIPT = `(function(){var t="system";try{var s=localStorage.getItem("grantpath.appearance");if(s==="light"||s==="dark")t=s}catch(e){}var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"})()`;
