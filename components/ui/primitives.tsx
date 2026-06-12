import * as React from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}) {
  const variants = {
    primary:
      "pixel-box pixel-btn bg-accent text-black [--border:var(--accent)] hover:brightness-110 disabled:opacity-50",
    secondary:
      "pixel-box pixel-btn bg-card text-foreground hover:bg-elevated",
    ghost:
      "text-muted hover:text-foreground hover:bg-foreground/10 border-2 border-transparent",
    danger:
      "pixel-box pixel-btn bg-red-500/15 text-red-600 dark:text-red-300 [--border:#c0392b] hover:bg-red-500/25",
  };
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm" };
  return (
    <button
      className={cn(
        "group inline-flex items-center justify-center gap-2 font-sans font-semibold tracking-wide transition-[filter,background-color,transform] disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "pixel-box--inset h-10 w-full bg-card px-3 text-sm text-foreground",
        "placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "pixel-box--inset h-10 w-full bg-card px-3 text-sm text-foreground",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block font-sans text-[10px] uppercase tracking-wide text-muted mb-2", className)}
      {...props}
    />
  );
}

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("pixel-box bg-card", className)} {...props} />;
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center border-2 border-current px-1.5 py-0.5 font-sans text-[10px] uppercase tracking-wide",
        className
      )}
      {...props}
    />
  );
}
