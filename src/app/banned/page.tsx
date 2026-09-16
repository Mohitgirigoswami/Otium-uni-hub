"use client";

import React from "react";
import { signOut } from "next-auth/react";
import { useUser } from "@/components/providers/UserContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertOctagon, LogOut, ShieldAlert } from "lucide-react";

export default function BannedPage() {
  const { user } = useUser();

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6 border-destructive/40">
        <div className="w-14 h-14 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto border border-destructive/20">
          <AlertOctagon className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <Badge variant="destructive" size="sm">
            Account Suspended
          </Badge>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
            Access Restricted by Campus Moderation
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your university account has been suspended due to verified policy infractions, escrow violations, or community misconduct.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-secondary/50 border border-border text-left space-y-1 text-xs">
          <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
            Violation on Record:
          </span>
          <p className="text-muted-foreground">
            {user?.banReason || "Unfulfilled task deliverables or breach of university trust guidelines."}
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            onClick={handleSignOut}
            variant="destructive"
            size="lg"
            className="w-full"
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign Out of Account
          </Button>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            If you believe this determination was made in error, contact your university moderator desk at support@otium.edu.
          </p>
        </div>
      </Card>
    </div>
  );
}
