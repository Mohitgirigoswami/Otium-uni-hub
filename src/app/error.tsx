"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertOctagon,
  RefreshCw,
  Home,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Terminal,
  Cpu,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorPage({ error, reset }: ErrorPageProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    // Log exception to console in dev
    console.error("[Otium Core Circuit Fault]:", error);
  }, [error]);

  const handleReset = () => {
    setIsResetting(true);
    setTimeout(() => {
      reset();
      setIsResetting(false);
    }, 450);
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden select-none">
      {/* Ambient Diagnostic Hazard Rings */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center -z-10">
        <div className="w-80 h-80 rounded-full border border-destructive/20 animate-sonar-pulse" />
        <div className="w-[28rem] h-[28rem] rounded-full border border-destructive/10 animate-sonar-pulse [animation-delay:1.5s]" />
      </div>

      <div className="w-full max-w-xl flex flex-col items-center text-center space-y-6">
        {/* Animated Circuit Breaker Icon */}
        <div className="relative flex items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-2xl bg-destructive/20"
            animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          />

          <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-card border-2 border-destructive/40 text-destructive flex items-center justify-center shadow-xl shadow-destructive/10">
            <Cpu className="w-9 h-9 sm:w-10 sm:h-10 animate-pulse" />
          </div>

          <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center border-2 border-card shadow-sm">
            <AlertOctagon className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Header & Subtitle */}
        <div className="space-y-2 max-w-md">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20 font-mono">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>CIRCUIT_INTERRUPT // FAULT_DETECTED</span>
          </div>

          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Campus Node Circuit Tripped
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            A temporary university database pool timeout or component fault interrupted this operation. Your session and data remain intact.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            onClick={handleReset}
            disabled={isResetting}
            variant="default"
            size="md"
            leftIcon={
              isResetting ? (
                <Spinner variant="orbit" size="xs" colorClassName="text-current" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )
            }
          >
            {isResetting ? "Resetting Node Circuit..." : "Reset Circuit & Retry"}
          </Button>

          <Link href="/">
            <Button
              variant="outline"
              size="md"
              leftIcon={<Home className="w-4 h-4" />}
            >
              Return to Student Hub
            </Button>
          </Link>
        </div>

        {/* Diagnostic Telemetry Drawer */}
        <div className="w-full max-w-md pt-2">
          <button
            type="button"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{showDiagnostics ? "Hide Telemetry Log" : "View Diagnostic Telemetry"}</span>
            {showDiagnostics ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          <AnimatePresence>
            {showDiagnostics && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden text-left"
              >
                <div className="p-3.5 rounded-lg bg-secondary/80 border border-border text-[11px] font-mono text-muted-foreground space-y-1.5">
                  <div className="flex items-center justify-between text-foreground font-bold">
                    <span>STATUS: EXCEPTION_HALT</span>
                    <Badge variant="outline" size="sm" className="text-[9px] font-mono">
                      {error.digest ? `DIGEST: ${error.digest.slice(0, 10)}` : "ERR_LOCAL"}
                    </Badge>
                  </div>
                  <div className="text-destructive font-medium break-all">
                    {error.message || "An unexpected runtime fault occurred."}
                  </div>
                  <div className="text-[10px] text-muted-foreground/80 pt-1 border-t border-border/40">
                    Timestamp: {new Date().toISOString()}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
