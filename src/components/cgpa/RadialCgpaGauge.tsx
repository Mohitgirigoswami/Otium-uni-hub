"use client";

import React from "react";
import { motion } from "framer-motion";
import { Award, TrendingUp, Sparkles, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RadialCgpaGaugeProps {
  gpa: number;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function RadialCgpaGauge({
  gpa,
  title = "Academic Standing",
  subtitle,
  className,
}: RadialCgpaGaugeProps) {
  const clampedGpa = Math.min(Math.max(gpa || 0, 0), 10);

  // SVG circular geometry
  const size = 160;
  const strokeWidth = 12;
  const center = size / 2;
  const radius = center - strokeWidth - 4;
  const circumference = 2 * Math.PI * radius;

  // Arc length (270 degree sweep gauge from -225deg to +45deg)
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (clampedGpa / 10) * arcLength;

  // Grade Tier determination
  let tier = "Pass Standing";
  let tierColor = "text-muted-foreground border-border bg-secondary";
  let TierIcon = Award;

  if (clampedGpa >= 8.5) {
    tier = "First Class with Distinction";
    tierColor = "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
    TierIcon = Sparkles;
  } else if (clampedGpa >= 7.5) {
    tier = "First Class Honours";
    tierColor = "text-primary border-primary/30 bg-primary/10";
    TierIcon = Award;
  } else if (clampedGpa >= 6.5) {
    tier = "First Class";
    tierColor = "text-blue-500 border-blue-500/30 bg-blue-500/10";
    TierIcon = TrendingUp;
  } else if (clampedGpa < 5.0 && clampedGpa > 0) {
    tier = "Remedial / Under Review";
    tierColor = "text-destructive border-destructive/30 bg-destructive/10";
    TierIcon = AlertCircle;
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-5 rounded-xl bg-card border border-border text-center relative overflow-hidden select-none theme-glow-card",
        className
      )}
    >
      {/* Gauge Title */}
      <div className="w-full flex items-center justify-between pb-2 mb-1 border-b border-border/50 text-left">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <Badge variant="outline" size="sm" className={cn("text-[10px] font-medium gap-1 py-0", tierColor)}>
          <TierIcon className="w-3 h-3" />
          <span>{tier}</span>
        </Badge>
      </div>

      {/* SVG Radial Arc Dial */}
      <div className="relative my-2 flex items-center justify-center" style={{ width: size, height: size * 0.88 }}>
        <svg width={size} height={size} className="overflow-visible">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Background Inactive Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(135 ${center} ${center})`}
            className="text-secondary"
          />

          {/* Animated Active Progress Arc */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(135 ${center} ${center})`}
            initial={{ strokeDashoffset: arcLength }}
            animate={{ strokeDashoffset }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            className="drop-shadow-[0_0_8px_var(--glow-color)]"
          />
        </svg>

        {/* Dial Center Numerical Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2 pointer-events-none">
          <motion.span
            key={clampedGpa.toFixed(2)}
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground"
          >
            {clampedGpa.toFixed(2)}
          </motion.span>
          <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest -mt-0.5">
            OUT OF 10.0
          </span>
        </div>
      </div>

      {subtitle && (
        <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
