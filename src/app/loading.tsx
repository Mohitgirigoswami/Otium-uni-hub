"use client";

import React from "react";
import { Spinner } from "@/components/ui/spinner";
import { Sparkles } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="w-full py-16 flex flex-col items-center justify-center select-none animate-in fade-in-0 duration-150">
      {/* Laser Top Shimmer Spine */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse z-50 pointer-events-none" />

      <div className="flex flex-col items-center text-center space-y-4 max-w-xs">
        {/* Compact Orbit Spinner */}
        <div className="p-3.5 rounded-xl bg-card/80 backdrop-blur-sm border border-border shadow-xs">
          <Spinner variant="orbit" size="md" />
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary/80 text-foreground text-[10.5px] font-medium border border-border">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>Campus Telemetry</span>
          </div>

          <p className="text-xs text-muted-foreground">
            Synchronizing campus data...
          </p>
        </div>
      </div>
    </div>
  );
}
