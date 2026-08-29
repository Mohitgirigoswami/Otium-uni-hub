"use client";

import React, { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import {
  Sparkles,
  ShieldCheck,
  Briefcase,
  Printer,
  EyeOff,
  ShoppingBag,
  ArrowRight,
  GraduationCap,
} from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signIn("google", { callbackUrl });
    } catch (error) {
      console.error("Sign in failed:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side: Brand Story & Super App Perks */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Campus Super App • Verified University Access</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              One Login for Your{" "}
              <span className="bg-gradient-to-r from-brand-600 via-teal-500 to-electric-600 bg-clip-text text-transparent">
                Entire Campus Life.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Otium bridges university freelancing, zero-knowledge anonymous confessions, express hostel printing, and peer marketplaces into a single lightning-fast platform.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 backdrop-blur-md">
              <Briefcase className="w-4 h-4 text-brand-500 mb-1.5" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">P2P Gig Hub</p>
              <p className="text-[10px] text-slate-500">Anti-hoarding assignment marketplace</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 backdrop-blur-md">
              <EyeOff className="w-4 h-4 text-purple-500 mb-1.5" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">Whisper Wall</p>
              <p className="text-[10px] text-slate-500">Strictly isolated anonymous direct chats</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 backdrop-blur-md">
              <Printer className="w-4 h-4 text-amber-500 mb-1.5" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">Print Dispatch</p>
              <p className="text-[10px] text-slate-500">Next-day delivery to your hostel room</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 backdrop-blur-md">
              <ShoppingBag className="w-4 h-4 text-emerald-500 mb-1.5" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">Marketplace</p>
              <p className="text-[10px] text-slate-500">Buy & sell textbooks, electronics & cycles</p>
            </div>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div>
          <GlassCard className="p-8 sm:p-10 border-brand-500/20 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-40 h-40 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-black border border-white/20 p-2 flex items-center justify-center mx-auto shadow-xl shadow-brand-500/20">
                  <img
                    src="/logo.png"
                    alt="Otium Uni Hub Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  Welcome to Otium
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sign in with your university Google account to access campus tools
                </p>
              </div>

              {/* Google Sign-in Action */}
              <div className="space-y-4 pt-2">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 shadow-md hover:shadow-xl transition-all duration-200 text-sm font-bold text-slate-800 dark:text-slate-100 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{isLoading ? "Connecting to Google..." : "Continue with Google"}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-brand-500 transition-all" />
                </button>

                <div className="flex items-center gap-2 justify-center text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Encrypted university single sign-on & instant access</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 text-center">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  By continuing, you agree to Otium's Campus Honor Code and Community Guidelines.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
