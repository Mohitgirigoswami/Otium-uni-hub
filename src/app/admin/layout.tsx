"use client";

import React, { useEffect } from "react";
import { useUser } from "@/components/providers/UserContext";
import { useRouter, usePathname } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeft,
  Printer,
  AlertTriangle,
  Users,
  Building2,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const isPrintManager = user?.role === "PRINT_MANAGER";
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const hasAccess = isPrintManager || isSuperAdmin;

  useEffect(() => {
    if (!loading && user && !hasAccess) {
      router.push("/");
    }
  }, [user, loading, hasAccess, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400">Verifying Admin Access Credentials...</p>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <GlassCard className="max-w-md w-full p-8 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Admin Access Restricted
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            This portal requires PRINT_MANAGER or SUPER_ADMIN role permissions.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/">
              <Button variant="outline" className="w-full">
                Back to Student Hub
              </Button>
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Header Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black border border-amber-500/40 p-1.5 flex items-center justify-center shadow-md">
            <img
              src="/logo.png"
              alt="Otium Admin"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Otium Admin Operations
              </h2>
              <Badge variant={isSuperAdmin ? "success" : "warning"} size="sm">
                {user.role}
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Operator: <span className="font-semibold text-amber-600 dark:text-amber-400">{user.name}</span>
            </p>
          </div>
        </div>

        {/* Tab Links */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <Link href="/admin/print">
            <button
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                pathname === "/admin/print"
                  ? "bg-amber-600 text-white shadow-md"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Station</span>
            </button>
          </Link>

          {isSuperAdmin && (
            <>
              <Link href="/admin/gigs">
                <button
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pathname === "/admin/gigs"
                      ? "bg-purple-600 text-white shadow-md"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Gig Escrow</span>
                </button>
              </Link>

              <Link href="/admin/colleges">
                <button
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pathname === "/admin/colleges"
                      ? "bg-brand-600 text-white shadow-md"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Campuses</span>
                </button>
              </Link>

              <Link href="/admin/services">
                <button
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pathname === "/admin/services"
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Campus Services</span>
                </button>
              </Link>

              <Link href="/admin/users">
                <button
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pathname === "/admin/users"
                      ? "bg-emerald-600 text-white shadow-md"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>User Roles</span>
                </button>
              </Link>

              <Link href="/admin/support">
                <button
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pathname === "/admin/support"
                      ? "bg-rose-600 text-white shadow-md"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Support & Bans</span>
                </button>
              </Link>

              <Link href="/admin/settings">
                <button
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pathname === "/admin/settings"
                      ? "bg-amber-600 text-white shadow-md"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>UPI Settings</span>
                </button>
              </Link>

              <Link href="/admin/logs">
                <button
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pathname === "/admin/logs"
                      ? "bg-cyan-600 text-white shadow-md"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>Audit Logs</span>
                </button>
              </Link>
            </>
          )}

          <Link href="/">
            <Button size="sm" variant="outline" className="text-xs h-[30px]" leftIcon={<ArrowLeft className="w-3 h-3" />}>
              Student Hub
            </Button>
          </Link>
        </div>
      </div>

      {children}
    </div>
  );
}
