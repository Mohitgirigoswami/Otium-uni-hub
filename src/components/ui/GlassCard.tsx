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
      "bg-card/90 backdrop-blur-md border border-border shadow-sm",
    subtle:
      "bg-secondary/40 backdrop-blur-sm border border-border/60",
    glow:
      "bg-card border border-border shadow-md",
    elevated:
      "bg-card border border-border shadow-lg shadow-black/10 dark:shadow-black/40",
    accent:
      "bg-secondary/70 border border-border/80 shadow-sm",
    danger:
      "bg-destructive/10 border border-destructive/30 text-destructive",
  };

  const interactiveStyles = interactive
    ? "transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md cursor-pointer"
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-xl p-6 text-card-foreground",
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
