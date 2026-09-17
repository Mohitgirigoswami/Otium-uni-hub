"use client";

import React from "react";
import { motion } from "framer-motion";
import { Spinner } from "@/components/ui/spinner";
import { ShieldCheck } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="min-h-[65vh] flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      {/* Background Ambient Telemetry Pulse */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-96 h-96 rounded-full border border-border/40 animate-sonar-pulse" />
        <div className="w-[30rem] h-[30rem] rounded-full border border-border/20 animate-sonar-pulse [animation-delay:1.5s]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-sm"
      >
        {/* Orbital High-Tech Spinner */}
        <div className="relative p-6 rounded-2xl bg-card/60 backdrop-blur-md border border-border shadow-sm theme-glow-card">
          <Spinner variant="orbit" size="xl" />
        </div>

        {/* Status Indicator */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-foreground text-[11px] font-medium border border-border">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Otium Campus Telemetry</span>
          </div>

          <h3 className="font-heading text-base font-bold text-foreground tracking-tight">
            Synchronizing Campus Node
          </h3>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Connecting to campus servers and establishing encrypted session...
          </p>
        </div>
      </motion.div>
    </div>
  );
}
