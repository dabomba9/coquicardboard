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

// Per-tier accent classes mapped onto the JRPG loot-rarity palette
// (gold / purple / blue / green = legendary / epic / rare / common). Colors are
// theme-aware CSS vars defined in app/globals.css. Same {bg,text,ring,bar} shape
// as before so every consumer (hierarchy, card-thumb, card detail) is unchanged.
// `bg` uses a pre-mixed translucent var to avoid Tailwind opacity-on-var pitfalls.
export const TIER_COLORS: Record<
  number,
  { bg: string; text: string; ring: string; bar: string }
> = {
  1: { bg: "bg-[var(--tier-1-bg)]", text: "text-[var(--tier-1)]", ring: "ring-[var(--tier-1)]", bar: "bg-[var(--tier-1)]" },
  2: { bg: "bg-[var(--tier-2-bg)]", text: "text-[var(--tier-2)]", ring: "ring-[var(--tier-2)]", bar: "bg-[var(--tier-2)]" },
  3: { bg: "bg-[var(--tier-3-bg)]", text: "text-[var(--tier-3)]", ring: "ring-[var(--tier-3)]", bar: "bg-[var(--tier-3)]" },
  4: { bg: "bg-[var(--tier-4-bg)]", text: "text-[var(--tier-4)]", ring: "ring-[var(--tier-4)]", bar: "bg-[var(--tier-4)]" },
};
