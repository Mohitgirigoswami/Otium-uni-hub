"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type SpinnerVariant = "orbit" | "metallic" | "radar" | "dots" | "classic";
export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SpinnerVariant;
  size?: SpinnerSize;
  label?: string;
  labelPosition?: "bottom" | "right";
  colorClassName?: string;
}

const sizeConfig: Record<SpinnerSize, { dim: number; stroke: number; text: string; gap: string }> = {
  xs: { dim: 14, stroke: 2, text: "text-[10px]", gap: "gap-1.5" },
  sm: { dim: 18, stroke: 2.2, text: "text-xs", gap: "gap-2" },
  md: { dim: 24, stroke: 2.5, text: "text-xs", gap: "gap-2.5" },
  lg: { dim: 36, stroke: 3, text: "text-sm", gap: "gap-3" },
  xl: { dim: 48, stroke: 3.5, text: "text-sm", gap: "gap-3.5" },
};

export function Spinner({
  variant = "orbit",
  size = "md",
  label,
  labelPosition = "bottom",
  colorClassName,
  className,
  ...props
}: SpinnerProps) {
  const { dim, stroke, text, gap } = sizeConfig[size];
  const isHorizontal = labelPosition === "right";

  const renderSpinnerCore = () => {
    switch (variant) {
      case "orbit":
        return (
          <div
            className="relative flex items-center justify-center flex-shrink-0"
            style={{ width: dim, height: dim }}
          >
            {/* Outer Ring */}
            <motion.svg
              viewBox="0 0 50 50"
              className="absolute inset-0 w-full h-full"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
            >
              <circle
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth={stroke * 1.5}
                strokeDasharray="40 70"
                strokeLinecap="round"
                className={colorClassName || "text-primary opacity-80"}
              />
            </motion.svg>

            {/* Inner Counter-Rotating Ring */}
            <motion.svg
              viewBox="0 0 50 50"
              className="absolute inset-0 w-full h-full"
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }}
            >
              <circle
                cx="25"
                cy="25"
                r="13"
                fill="none"
                stroke="currentColor"
                strokeWidth={stroke * 1.3}
                strokeDasharray="25 45"
                strokeLinecap="round"
                className={colorClassName || "text-primary"}
              />
            </motion.svg>

            {/* Orbiting Satellite Node */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
            >
              <div
                className={cn(
                  "rounded-full bg-primary shadow-sm",
                  colorClassName ? "bg-current" : ""
                )}
                style={{
                  width: Math.max(3, dim * 0.16),
                  height: Math.max(3, dim * 0.16),
                  transform: `translateY(-${dim * 0.38}px)`,
                }}
              />
            </motion.div>
          </div>
        );

      case "metallic":
        return (
          <motion.div
            className={cn(
              "relative rounded-full flex-shrink-0 flex items-center justify-center",
              className
            )}
            style={{ width: dim, height: dim }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          >
            <svg viewBox="0 0 40 40" className="w-full h-full">
              <defs>
                <linearGradient id="metallicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                  <stop offset="50%" stopColor="currentColor" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.15"
                strokeWidth={stroke}
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="url(#metallicGrad)"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray="75 30"
                className={colorClassName || "text-primary"}
              />
            </svg>
          </motion.div>
        );

      case "radar":
        return (
          <div
            className="relative flex items-center justify-center flex-shrink-0"
            style={{ width: dim, height: dim }}
          >
            {/* Concentric Ping Rings */}
            <motion.div
              className={cn(
                "absolute inset-0 rounded-full border border-current",
                colorClassName || "text-primary text-opacity-40"
              )}
              animate={{ scale: [0.3, 1.4], opacity: [0.9, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
            />
            <motion.div
              className={cn(
                "absolute inset-0 rounded-full border border-current",
                colorClassName || "text-primary text-opacity-40"
              )}
              animate={{ scale: [0.3, 1.4], opacity: [0.9, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut", delay: 0.9 }}
            />
            {/* Center Core Node */}
            <div
              className={cn(
                "rounded-full bg-primary shadow-sm",
                colorClassName ? "bg-current" : ""
              )}
              style={{ width: dim * 0.35, height: dim * 0.35 }}
            />
          </div>
        );

      case "dots":
        return (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={cn(
                  "rounded-full bg-primary",
                  colorClassName ? "bg-current" : ""
                )}
                style={{
                  width: Math.max(3.5, dim * 0.22),
                  height: Math.max(3.5, dim * 0.22),
                }}
                animate={{ y: [0, -dim * 0.3, 0], opacity: [0.4, 1, 0.4] }}
                transition={{
                  repeat: Infinity,
                  duration: 0.8,
                  ease: "easeInOut",
                  delay: i * 0.16,
                }}
              />
            ))}
          </div>
        );

      case "classic":
      default:
        return (
          <motion.svg
            viewBox="0 0 24 24"
            className={cn("flex-shrink-0", colorClassName || "text-primary")}
            style={{ width: dim, height: dim }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              className="opacity-20"
            />
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeLinecap="round"
              d="M12 2a10 10 0 0 1 10 10"
            />
          </motion.svg>
        );
    }
  };

  if (!label) {
    return (
      <div className={cn("inline-flex items-center justify-center", className)} {...props}>
        {renderSpinnerCore()}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center",
        isHorizontal ? "flex-row" : "flex-col",
        gap,
        className
      )}
      {...props}
    >
      {renderSpinnerCore()}
      <span
        className={cn(
          "font-medium text-muted-foreground tracking-tight select-none",
          text
        )}
      >
        {label}
      </span>
    </div>
  );
}
