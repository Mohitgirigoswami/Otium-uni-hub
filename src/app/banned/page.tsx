"use client";

import React from "react";
import { signOut } from "next-auth/react";
import { useUser } from "@/components/providers/UserContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { ShieldAlert, LogOut, Mail, AlertOctagon } from "lucide-react";

export default function BannedPage() {
  const { user } = useUser();

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <GlassCard className="max-w-md w-full p-8 sm:p-10 border-rose-500/40 text-center space-y-6 shadow-2xl bg-rose-950/10 backdrop-blur-xl">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/40 shadow-lg shadow-rose-500/20">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-wider">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Account Suspended</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Access Blocked by Campus Moderation
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your Otium Uni Hub account has been suspended due to violations of community trust, escrow policies, or verified scam reports.
          </p>
        </div>

        {/* Ban Reason Box */}
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-rose-500/30 text-left space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
            Reason on Record:
          </span>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {user?.banReason || "Violation of Otium Campus Guidelines / Unfulfilled Task Commitments."}
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            onClick={handleSignOut}
            variant="brand"
            size="lg"
            className="w-full bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/25"
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign Out of Account
          </Button>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            If you believe this suspension is a mistake, reach out to your campus student moderator at <span className="font-mono text-slate-300">support@otium.edu</span>.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
