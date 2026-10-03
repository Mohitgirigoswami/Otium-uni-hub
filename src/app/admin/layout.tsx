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
  Layers,
  Settings,
  FileText,
  HelpCircle,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Sidebar, SidebarGroup } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

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
        <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">Verifying Admin Credentials...</p>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground font-heading">
            Admin Access Restricted
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This portal requires PRINT_MANAGER or SUPER_ADMIN role permissions.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/">
              <Button variant="outline" className="w-full">
                Back to Student Hub
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Sidebar Group configuration
  const sidebarGroups: SidebarGroup[] = [
    {
      title: "Operations",
      items: [
        { href: "/admin/print", label: "Print Station", icon: Printer },
        { href: "/admin/wallet", label: "Wallet Recharges", icon: Wallet },
        ...(isSuperAdmin
          ? [{ href: "/admin/gigs", label: "Gig Escrow", icon: Briefcase }]
          : []),
      ],
    },
    ...(isSuperAdmin
      ? [
          {
            title: "Campus Management",
            items: [
              { href: "/admin/colleges", label: "Campuses", icon: Building2 },
              { href: "/admin/services", label: "Campus Services", icon: Layers },
              { href: "/admin/users", label: "User Roles", icon: Users },
              { href: "/admin/support", label: "Support & Bans", icon: HelpCircle },
              { href: "/admin/settings", label: "UPI Settings", icon: Settings },
              { href: "/admin/logs", label: "Audit Logs", icon: FileText },
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] border-b border-border">
      {/* Desktop Left Sidebar */}
      <Sidebar
        className="hidden lg:flex"
        header={
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
              <img
                src="/logo.png"
                alt="Otium Admin"
                className="w-5 h-5 object-contain invert dark:invert-0"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground font-heading">
                  Admin Hub
                </span>
                <Badge variant="outline" size="sm" className="text-[10px] py-0">
                  {user.role}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{user.name}</p>
            </div>
          </div>
        }
        groups={sidebarGroups}
        footer={
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1.5 justify-start"
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Back to Student Hub
            </Button>
          </Link>
        }
      />

      {/* Mobile Top Scrollable Navigation Strip */}
      <div className="lg:hidden p-3 border-b border-border bg-card/60 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
        <Link href="/admin/print">
          <button
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
              pathname === "/admin/print"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Station</span>
          </button>
        </Link>

        <Link href="/admin/wallet">
          <button
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
              pathname === "/admin/wallet"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Wallet Recharges</span>
          </button>
        </Link>

        {isSuperAdmin && (
          <>
            <Link href="/admin/gigs">
              <button
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                  pathname === "/admin/gigs"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Gigs</span>
              </button>
            </Link>

            <Link href="/admin/colleges">
              <button
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                  pathname === "/admin/colleges"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Campuses</span>
              </button>
            </Link>

            <Link href="/admin/services">
              <button
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                  pathname === "/admin/services"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Services</span>
              </button>
            </Link>

            <Link href="/admin/users">
              <button
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                  pathname === "/admin/users"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Roles</span>
              </button>
            </Link>

            <Link href="/admin/support">
              <button
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                  pathname === "/admin/support"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Support</span>
              </button>
            </Link>

            <Link href="/admin/settings">
              <button
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                  pathname === "/admin/settings"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
            </Link>

            <Link href="/admin/logs">
              <button
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                  pathname === "/admin/logs"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Logs</span>
              </button>
            </Link>
          </>
        )}

        <Link href="/">
          <Button size="sm" variant="outline" className="text-xs h-7 px-2">
            Student Hub
          </Button>
        </Link>
      </div>

      {/* Main Admin Content View */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
