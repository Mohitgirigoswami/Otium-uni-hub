"use client";

import React from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
  Sparkles,
} from "lucide-react";

export default function AdminOverviewPage() {
  const { user } = useUser();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isPrintManager = user?.role === "PRINT_MANAGER";

  const adminModules = [
    {
      title: "Campus Print Station",
      desc: "Live print queues, Google Drive PDF viewer, UTR verification, dispatch tracking.",
      href: "/admin/print",
      icon: Printer,
      color: "from-amber-500/20 to-teal-500/20 text-amber-500 border-amber-500/30",
      btnColor: "bg-amber-600 hover:bg-amber-500",
      roles: ["SUPER_ADMIN", "PRINT_MANAGER"],
    },
    {
      title: "Campus Service Toggles",
      desc: "Pause or enable features (Print Station, Incognito Wall, Marketplace, Cab Split) per campus.",
      href: "/admin/services",
      icon: Sliders,
      color: "from-indigo-500/20 to-purple-500/20 text-indigo-400 border-indigo-500/30",
      btnColor: "bg-indigo-600 hover:bg-indigo-500",
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "Campus Directory",
      desc: "Manage registered universities, campus codes, and geolocation bindings.",
      href: "/admin/colleges",
      icon: Building2,
      color: "from-brand-500/20 to-blue-500/20 text-brand-400 border-brand-500/30",
      btnColor: "bg-brand-600 hover:bg-brand-500",
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "User Roles & Permissions",
      desc: "Promote students to Print Managers, Campus Moderators, or Super Admins.",
      href: "/admin/users",
      icon: Users,
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
      btnColor: "bg-emerald-600 hover:bg-emerald-500",
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "Gig Escrow & Payments",
      desc: "Manage advance payments, task claims, and multi-party milestone escrow releases.",
      href: "/admin/gigs",
      icon: Briefcase,
      color: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30",
      btnColor: "bg-purple-600 hover:bg-purple-500",
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "Platform UPI & Rate Settings",
      desc: "Configure platform UPI receiver ID and default print rate multipliers.",
      href: "/admin/settings",
      icon: Activity,
      color: "from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30",
      btnColor: "bg-amber-600 hover:bg-amber-500",
      roles: ["SUPER_ADMIN"],
    },
  ];

  const allowedModules = adminModules.filter((mod) =>
    mod.roles.includes(user?.role || "")
  );

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 p-8 border border-amber-500/20 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Otium Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name || "Admin"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Select an administrative module below to manage campus operations, student print orders, service feature flags, and escrow transactions.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Badge variant="warning" size="md">
              Role: {user?.role}
            </Badge>
          </div>
        </div>
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allowedModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <GlassCard
              key={mod.href}
              className="p-6 flex flex-col justify-between hover:border-amber-500/50 transition-all group"
            >
              <div className="space-y-4">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mod.color} border flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {mod.desc}
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-200 dark:border-slate-800">
                <Link href={mod.href}>
                  <Button
                    size="sm"
                    className={`w-full font-bold ${mod.btnColor}`}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Open Console
                  </Button>
                </Link>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
