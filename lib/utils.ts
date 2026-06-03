import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsd(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function gradeKey(
  condition: "raw" | "graded",
  company: string | null,
  grade: number | null
): string {
  if (condition === "graded" && company && grade != null) {
    return `${company}${grade}`;
  }
  return "raw";
}

export function gradeLabel(
  condition: "raw" | "graded",
  company: string | null,
  grade: number | null
): string {
  if (condition === "graded" && company && grade != null) {
    return `${company} ${grade}`;
  }
  return "Raw";
}

// Per-tier accent classes. `text` is contrast-tuned for both themes; `bar` is a
// solid fill for progress bars (use instead of deriving bg from text).
export const TIER_COLORS: Record<
  number,
  { bg: string; text: string; ring: string; bar: string }
> = {
  1: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500/30", bar: "bg-amber-500" },
  2: { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", ring: "ring-violet-500/30", bar: "bg-violet-500" },
  3: { bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", ring: "ring-sky-500/30", bar: "bg-sky-500" },
  4: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/30", bar: "bg-emerald-500" },
};
