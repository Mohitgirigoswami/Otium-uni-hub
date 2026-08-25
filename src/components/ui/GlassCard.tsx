"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "subtle" | "glow" | "elevated" | "accent" | "danger";
  interactive?: boolean;
}

export function GlassCard({
  children,
  className = "",
  variant = "default",
  interactive = false,
  ...props
}: GlassCardProps) {
  const variantStyles = {
    default:
      "bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl border border-white/50 dark:border-slate-800/80 shadow-lg shadow-slate-200/40 dark:shadow-black/40",
    subtle:
      "bg-white/40 dark:bg-slate-900/30 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/50 shadow-sm",
    glow:
      "bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-brand-500/30 dark:border-brand-400/20 shadow-xl shadow-brand-500/10 dark:shadow-brand-500/5",
    elevated:
      "bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/60 dark:border-slate-700/60 shadow-2xl shadow-slate-300/50 dark:shadow-black/60",
    accent:
      "bg-gradient-to-br from-brand-500/10 via-electric-500/10 to-accent-500/10 dark:from-brand-500/15 dark:via-electric-500/15 dark:to-accent-500/15 backdrop-blur-xl border border-brand-500/20 dark:border-brand-400/20 shadow-lg",
    danger:
      "bg-rose-500/10 dark:bg-rose-950/30 backdrop-blur-xl border border-rose-500/30 dark:border-rose-800/40 shadow-lg shadow-rose-500/5",
  };

  const interactiveStyles = interactive
    ? "transition-all duration-300 hover:translate-y-[-3px] hover:shadow-xl hover:border-brand-400/60 dark:hover:border-brand-400/40 cursor-pointer"
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-2xl p-6 text-slate-900 dark:text-slate-100",
        variantStyles[variant],
        interactiveStyles,
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
