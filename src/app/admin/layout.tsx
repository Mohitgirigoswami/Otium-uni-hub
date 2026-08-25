"use client";

import React, { useEffect } from "react";
import { useUser } from "@/components/providers/UserContext";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowLeft, Printer, AlertTriangle, Users } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, activePersonaId, setActivePersonaId } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== "ADMIN") {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400">Verifying Admin Access Credentials...</p>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") {
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
            This operator portal requires Role-Based Access Control (RBAC) administrator permissions.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Button
              onClick={() => setActivePersonaId("usr_admin_operator")}
              className="bg-amber-600 hover:bg-amber-500"
            >
              Switch to Campus Print Operator (Admin Persona)
            </Button>
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
      {/* Admin Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Otium Operations Console
              </h2>
              <Badge variant="warning" size="sm">
                ADMIN ACCESS
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Logged in as <span className="font-semibold text-amber-600 dark:text-amber-400">{user.name}</span> ({user.department})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link href="/admin/print">
            <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-xs" leftIcon={<Printer className="w-3.5 h-3.5" />}>
              Print Station Queue
            </Button>
          </Link>
          <Link href="/">
            <Button size="sm" variant="outline" className="text-xs" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Student Hub
            </Button>
          </Link>
        </div>
      </div>

      {children}
    </div>
  );
}
