"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { GlassCard } from "@/components/ui/GlassCard";
import { toast } from "sonner";
import {
  Sparkles,
  ShieldCheck,
  Briefcase,
  Printer,
  EyeOff,
  ShoppingBag,
} from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Google OAuth Success Handler
  const handleGoogleSuccess = async (credentialResponse: any) => {
    const idToken = credentialResponse.credential;
    if (!idToken) {
      toast.error("Google authentication failed. No ID token received.");
      return;
    }

    setIsGoogleLoading(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();
      setIsGoogleLoading(false);

      if (res.ok && data.success && data.token) {
        localStorage.setItem("otium_jwt_token", data.token);
        toast.success(`Welcome, ${data.user?.name || "Student"}! Signed in via Google.`);
        window.location.href = callbackUrl;
      } else {
        toast.error(data.error || "Google authentication failed on server.");
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      toast.error("Network error. Failed to reach server during Google sign-in.");
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
              Otium bridges university freelancing, anonymous campus confessions, next-day printing, and peer marketplaces into a single lightning-fast platform.
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
              <p className="text-[10px] text-slate-500">Next-day delivery anywhere in campus</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 backdrop-blur-md">
              <ShoppingBag className="w-4 h-4 text-emerald-500 mb-1.5" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">Marketplace</p>
              <p className="text-[10px] text-slate-500">Buy & sell textbooks, electronics & cycles</p>
            </div>
          </div>
        </div>

        {/* Right Side: Clean Google-Only Card */}
        <div>
          <GlassCard className="p-8 sm:p-10 border-brand-500/20 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-40 h-40 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-black border border-white/20 p-2.5 flex items-center justify-center mx-auto shadow-xl shadow-brand-500/20">
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
                  Single Sign-On with verified university Google account
                </p>
              </div>

              {/* Single Clean Google Sign-in Action */}
              <div className="py-4 space-y-4">
                <div className="flex justify-center w-full min-h-[44px]">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => toast.error("Google login cancelled or failed.")}
                    theme="filled_black"
                    shape="pill"
                    text="continue_with"
                    size="large"
                    width="100%"
                  />
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                  Click above to authenticate securely with your Google account. Zero passwords required.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 text-center">
                <div className="flex items-center gap-2 justify-center text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Protected by Google OAuth & 256-bit Stateless JWT</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    "mock-client-id.apps.googleusercontent.com";

  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      }
    >
      <GoogleOAuthProvider clientId={googleClientId}>
        <LoginContent />
      </GoogleOAuthProvider>
    </Suspense>
  );
}
