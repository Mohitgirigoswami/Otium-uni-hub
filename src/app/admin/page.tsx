"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/components/providers/UserContext";
import Link from "next/link";
import {
  Printer,
  ShieldCheck,
  Building2,
  Users,
  Briefcase,
  Sliders,
  FileText,
  Activity,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

export default function AdminOverviewPage() {
  const { user } = useUser();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isPrintManager = user?.role === "PRINT_MANAGER";

  const adminModules = [
    {
      title: "Campus Print Station",
      desc: "Live print queues, embedded PDF inspection, UTR payment verification, and dispatch tracking.",
      href: "/admin/print",
      icon: Printer,
      roles: ["SUPER_ADMIN", "PRINT_MANAGER"],
    },
    {
      title: "Campus Service Toggles",
      desc: "Dynamically pause or enable features (Print Station, Whisper Wall, Marketplace, Cab Split) per campus.",
      href: "/admin/services",
      icon: Sliders,
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "Campus Directory",
      desc: "Manage registered universities, campus codes, and geolocation bindings.",
      href: "/admin/colleges",
      icon: Building2,
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "User Roles & Permissions",
      desc: "Promote students to Print Managers, Campus Moderators, or Super Admins.",
      href: "/admin/users",
      icon: Users,
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "Gig Escrow & Disputes",
      desc: "Moderate advance payments, deliverable milestones, and resolve task escrow disputes.",
      href: "/admin/gigs",
      icon: Briefcase,
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "Support & Ban Enforcement",
      desc: "Review student inquiries, resolve tickets, and manage account suspensions.",
      href: "/admin/support",
      icon: HelpCircle,
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "Platform UPI & Rate Settings",
      desc: "Configure platform UPI receiver ID and default print rate multipliers.",
      href: "/admin/settings",
      icon: Activity,
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "System Audit Logs",
      desc: "Cryptographic operational audit trail of role changes and administrative actions.",
      href: "/admin/logs",
      icon: FileText,
      roles: ["SUPER_ADMIN"],
    },
  ];

  const allowedModules = adminModules.filter((mod) =>
    mod.roles.includes(user?.role || "")
  );

  return (
    <div className="space-y-8 p-4 sm:p-8">
      {/* Welcome Banner */}
      <Card className="p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Otium Administrative Console</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Welcome back, {user?.name || "Admin"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Campus: {user?.college?.name || "Global Multi-Campus"} | Role: {user?.role || "PRINT_MANAGER"}
            </p>
          </div>

          <Link href="/admin/print">
            <Button size="md" leftIcon={<Printer className="w-4 h-4" />}>
              Open Print Dispatch Queue
            </Button>
          </Link>
        </div>
      </Card>

      {/* Modules Grid */}
      <div className="space-y-4">
        <h2 className="font-heading text-lg font-bold text-foreground">
          Administrative Portals ({allowedModules.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {allowedModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Card
                key={mod.href}
                interactive
                className="p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center border border-primary/20">
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-heading font-bold text-sm text-foreground">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {mod.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60">
                  <Link href={mod.href} className="block">
                    <Button variant="outline" size="sm" className="w-full">
                      Access Console
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
