"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ShieldCheck,
  Briefcase,
  Printer,
  EyeOff,
  ShoppingBag,
  Building2,
  Lock,
} from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    const idToken = credentialResponse.credential;
    if (!idToken) {
      toast.error("Google authentication failed. No credential received.");
      return;
    }

    setIsGoogleLoading(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();
      setIsGoogleLoading(false);

      if (res.ok && data.success && data.token) {
        localStorage.setItem("otium_jwt_token", data.token);
        toast.success(`Signed in successfully as ${data.user?.name || "Student"}.`);
        const destination =
          callbackUrl && callbackUrl !== "/login" && callbackUrl !== "/"
            ? callbackUrl
            : "/dashboard";
        window.location.href = destination;
      } else {
        toast.error(data.error || "Google authentication was rejected by the server.");
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      toast.error("Network error encountered during Google sign-in.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-220px)] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left Side: Direct Functional Context */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            <span>Verified University Authentication</span>
          </div>

          <div className="space-y-3">
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              Single Sign-On for Campus Daily Logistics.
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Authenticate using your institutional Google account to access your express print queue, record attendance metrics, and view university marketplace listings.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-lg border border-border bg-card space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Printer className="w-4 h-4 text-primary" />
                <span>Express Printing</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Scheduled express delivery slots
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-card space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Briefcase className="w-4 h-4 text-primary" />
                <span>Task Gigs</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                P2P assignments with proxy escrow
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-card space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <EyeOff className="w-4 h-4 text-primary" />
                <span>Whisper Wall</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Strictly pseudonymous campus feeds
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-card space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <ShoppingBag className="w-4 h-4 text-primary" />
                <span>Marketplace</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Direct student second-hand sales
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Action Card */}
        <div>
          <Card className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center mx-auto p-2 font-bold shadow-sm">
                <img
                  src="/logo.png"
                  alt="Otium Uni Hub"
                  className="w-full h-full object-contain invert dark:invert-0"
                />
              </div>
              <h2 className="font-heading text-xl font-bold text-foreground">
                Student Sign In
              </h2>
              <p className="text-xs text-muted-foreground">
                Connect your institutional or personal Google account
              </p>
            </div>

            <div className="py-2 space-y-4">
              <div className="flex justify-center w-full min-h-[44px]">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error("Google sign-in was cancelled.")}
                  shape="rectangular"
                  theme="filled_black"
                  size="large"
                  text="continue_with"
                  width="100%"
                />
              </div>

              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                Click above to proceed with secure OAuth token exchange. Passwords are never collected or stored.
              </p>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span>Secured by Stateless JWT & OAuth 2.0</span>
            </div>
          </Card>
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
          <div className="w-7 h-7 border-2 border-border border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <GoogleOAuthProvider clientId={googleClientId}>
        <LoginContent />
      </GoogleOAuthProvider>
    </Suspense>
  );
}
