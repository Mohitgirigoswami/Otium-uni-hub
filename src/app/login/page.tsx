"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
  Sparkles,
  ShieldCheck,
  Briefcase,
  Printer,
  EyeOff,
  ShoppingBag,
  Mail,
  Lock,
  Eye,
} from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("student@dtu.ac.in");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [isCredentialLoading, setIsCredentialLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // JWT Credential Login Handler
  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your university email address.");
      return;
    }

    setIsCredentialLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      setIsCredentialLoading(false);

      if (res.ok && data.success && data.token) {
        localStorage.setItem("otium_jwt_token", data.token);
        toast.success(`Welcome back, ${data.user?.name || "Student"}!`);
        window.location.href = callbackUrl;
      } else {
        toast.error(data.error || "Authentication failed. Please check credentials.");
      }
    } catch (err: any) {
      setIsCredentialLoading(false);
      toast.error("Network error. Failed to reach authentication server.");
    }
  };

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

  // Google One-Tap / Simulation fallback for local dev
  const handleDemoGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      // Mock Google idToken representation for dev environments
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: "mock-google-token-dtu-student@dtu.ac.in",
        }),
      });

      const data = await res.json();
      setIsGoogleLoading(false);

      if (res.ok && data.success && data.token) {
        localStorage.setItem("otium_jwt_token", data.token);
        toast.success("Welcome back! Signed in with Google account.");
        window.location.href = callbackUrl;
      } else {
        toast.error(data.error || "Google sign-in error.");
      }
    } catch {
      setIsGoogleLoading(false);
      toast.error("Failed to connect to Google authentication bridge.");
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
                  Sign in with Google or your campus credentials
                </p>
              </div>

              {/* Google Sign-in Action */}
              <div className="space-y-3">
                <div className="flex justify-center w-full">
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

                {/* Direct Google Button Fallback for dev / fast testing */}
                <button
                  type="button"
                  onClick={handleDemoGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 hover:border-brand-500 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                  <span>{isGoogleLoading ? "Connecting..." : "One-Click Campus Google Sign-In"}</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-300 dark:border-slate-800"></div>
                <span className="flex-shrink mx-4 text-[11px] font-bold uppercase text-slate-400">
                  Or Email / Roll No
                </span>
                <div className="flex-grow border-t border-slate-300 dark:border-slate-800"></div>
              </div>

              {/* Email & Password Form */}
              <form onSubmit={handleCredentialLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    University Email / Roll No
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. student@dtu.ac.in"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="brand"
                  size="lg"
                  isLoading={isCredentialLoading}
                  className="w-full shadow-lg shadow-brand-500/25"
                >
                  Sign In with Credentials
                </Button>
              </form>

              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 text-center">
                <div className="flex items-center gap-2 justify-center text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Stateless 256-bit JWT authentication across campus nodes</span>
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
