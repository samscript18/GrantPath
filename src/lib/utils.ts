import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function formatDate(value: Date | string | null | undefined, timeZone = "UTC") {
  if (!value) return "Not confirmed";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(new Date(value));
}
export function formatTimestamp(value: Date | string | null | undefined, timeZone = "UTC") {
  if (!value) return "Never recorded";
  return `${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(value))} · ${timeZone}`;
}
