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
      "rounded-full bg-accent text-black hover:brightness-110 disabled:opacity-50",
    secondary:
      "rounded-full border border-border/60 bg-foreground/[0.03] text-foreground hover:border-border hover:bg-foreground/[0.06]",
    ghost:
      "rounded-full text-muted hover:text-foreground hover:bg-foreground/10",
    danger:
      "rounded-full bg-red-500/15 text-red-600 dark:text-red-300 hover:bg-red-500/25",
  };
  const sizes = { sm: "h-8 px-3.5 text-xs", md: "h-10 px-5 text-sm" };
  return (
    <button
      className={cn(
        "group inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:cursor-not-allowed",
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
        "h-10 w-full rounded-lg border border-border/60 bg-foreground/[0.03] px-3 text-sm text-foreground transition-colors",
        "placeholder:text-muted hover:border-border focus:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
        "h-10 w-full rounded-lg border border-border/60 bg-foreground/[0.03] px-3 text-sm text-foreground transition-colors",
        "hover:border-border focus:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
  return <div className={cn("rounded-2xl border border-border/50 bg-card", className)} {...props} />;
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border/60 bg-foreground/5 px-2 py-0.5 text-[11px] font-medium",
        className
      )}
      {...props}
    />
  );
}
