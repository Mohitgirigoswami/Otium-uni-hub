import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "brand" | "success" | "warning" | "danger" | "info" | "neutral" | "purple";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({
  children,
  variant = "neutral",
  size = "md",
  className = "",
}: BadgeProps) {
  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] font-medium rounded-md",
    md: "px-2.5 py-1 text-xs font-semibold rounded-lg",
  };

  const variantStyles = {
    brand:
      "bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-500/30",
    success:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30",
    warning:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30",
    danger:
      "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30",
    info:
      "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30",
    purple:
      "bg-accent-500/15 text-accent-700 dark:text-accent-300 border border-accent-500/30",
    neutral:
      "bg-slate-200/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-slate-700/50",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 leading-none tracking-wide select-none",
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
