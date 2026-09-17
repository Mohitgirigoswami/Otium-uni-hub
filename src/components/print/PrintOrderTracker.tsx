"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Printer,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PrintOrderStatus =
  | "PENDING"
  | "QUEUED"
  | "PRINTING"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELLED";

interface PrintOrderTrackerProps {
  status: PrintOrderStatus | string;
  className?: string;
}

const STEPS = [
  {
    key: "QUEUED",
    aliases: ["PENDING", "QUEUED"],
    label: "Queued",
    sublabel: "Order Verified",
    icon: FileText,
  },
  {
    key: "PRINTING",
    aliases: ["PRINTING"],
    label: "Printing",
    sublabel: "Press Active",
    icon: Printer,
  },
  {
    key: "OUT_FOR_DELIVERY",
    aliases: ["OUT_FOR_DELIVERY"],
    label: "Dispatched",
    sublabel: "Hostel Delivery",
    icon: Truck,
  },
  {
    key: "COMPLETED",
    aliases: ["COMPLETED"],
    label: "Delivered",
    sublabel: "Handed Over",
    icon: CheckCircle2,
  },
];

export function PrintOrderTracker({ status, className }: PrintOrderTrackerProps) {
  if (status === "CANCELLED") {
    return (
      <div className={cn("p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2", className)}>
        <XCircle className="w-4 h-4 flex-shrink-0" />
        <span className="font-semibold">This print order was cancelled or refunded.</span>
      </div>
    );
  }

  // Determine current active step index (0-3)
  let activeIndex = 0;
  if (status === "PRINTING") activeIndex = 1;
  else if (status === "OUT_FOR_DELIVERY") activeIndex = 2;
  else if (status === "COMPLETED") activeIndex = 3;

  const progressPercent = (activeIndex / (STEPS.length - 1)) * 100;

  return (
    <div className={cn("space-y-3 pt-1 select-none", className)}>
      {/* Stepper Track */}
      <div className="relative flex items-center justify-between">
        {/* Background Inactive Line */}
        <div className="absolute top-1/2 left-3 right-3 -translate-y-1/2 h-[2px] bg-secondary border-t border-border" />

        {/* Active Filled Progress Line */}
        <motion.div
          className="absolute top-1/2 left-3 -translate-y-1/2 h-[2px] bg-primary transition-all duration-500 shadow-[0_0_8px_var(--primary)]"
          style={{ width: `calc(${progressPercent}% * 0.88)` }}
        />

        {/* Step Nodes */}
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isDone = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isPending = idx > activeIndex;

          return (
            <div
              key={step.key}
              className="relative z-10 flex flex-col items-center group"
            >
              {/* Node Circle */}
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 relative border-2",
                  isDone
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : isCurrent
                    ? "bg-card border-primary text-primary shadow-md shadow-primary/20"
                    : "bg-secondary border-border text-muted-foreground"
                )}
              >
                {/* Active Pulse Rings */}
                {isCurrent && (
                  <motion.div
                    className="absolute -inset-1 rounded-full border border-primary/50"
                    animate={{ scale: [1, 1.35, 1], opacity: [0.8, 0, 0.8] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  />
                )}

                {/* Step Icon with Micro-Animation for Current Step */}
                {isCurrent && step.key === "PRINTING" ? (
                  <Printer className="w-3.5 h-3.5 animate-bounce [animation-duration:1.2s]" />
                ) : isCurrent && step.key === "OUT_FOR_DELIVERY" ? (
                  <Truck className="w-3.5 h-3.5 animate-pulse" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>

              {/* Step Labels */}
              <div className="text-center mt-1.5 space-y-0.5">
                <span
                  className={cn(
                    "text-[10px] font-bold block leading-none",
                    isCurrent
                      ? "text-primary"
                      : isDone
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
                <span className="text-[9px] text-muted-foreground hidden sm:block leading-none">
                  {step.sublabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
