"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ThemeToggle } from "./ThemeToggle";
import { useUser } from "../providers/UserContext";
import {
  Briefcase,
  CalendarCheck,
  GraduationCap,
  Search,
  Car,
  EyeOff,
  ShoppingBag,
  Printer,
  Menu,
  X,
  AlertTriangle,
  ChevronDown,
  MessageSquare,
  ShieldCheck,
  User,
  LogOut,
  LogIn,
  LifeBuoy,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";


const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/gigs", label: "Gig Hub", icon: Briefcase, badge: "P2P" },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/cgpa", label: "CGPA", icon: GraduationCap },
  { href: "/lost-and-found", label: "Lost & Found", icon: Search },
  { href: "/rideshare", label: "RideSplit", icon: Car },
  { href: "/incognito", label: "Whisper Wall", icon: EyeOff, badge: "Anon" },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/print-station", label: "Print", icon: Printer },
  { href: "/messages", label: "Messages", icon: MessageSquare, badge: "Live" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const {
    user,
    isOnCooldown,
    cooldownHoursRemaining,
    handleSignOut,
  } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const currentAvatar =
    user?.image ||
    session?.user?.image ||
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";

  const currentDisplayName =
    user?.name || session?.user?.name || "Student";

  const isSuperAdmin = user?.role === "SUPER_ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const isPrintManager = user?.role === "PRINT_MANAGER" || session?.user?.role === "PRINT_MANAGER";
  const hasAdminAccess = isSuperAdmin || isPrintManager;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground border border-border p-1.5 flex items-center justify-center shadow-sm group-hover:scale-105 transition-all">
                <img
                  src="/logo.png"
                  alt="Otium Uni Hub Logo"
                  className="w-full h-full object-contain invert dark:invert-0"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold tracking-tight font-heading text-foreground">
                  OTIUM
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                  Uni Super App
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <Badge
                        variant={isActive ? "secondary" : "outline"}
                        size="sm"
                        className="text-[9px] px-1.5 py-0 h-3.5"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Actions: Cooldown Alert, Admin Badge, User Dropdown & Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Anti-Hoarding Cooldown Pill */}
            {isOnCooldown && (
              <div
                title="Anti-Hoarding Penalty: Dropped gig in last 24h"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Cooldown: {cooldownHoursRemaining}h</span>
              </div>
            )}

            {/* Admin Console Pill */}
            {hasAdminAccess && (
              <Link href="/admin/print">
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Admin Hub</span>
                </Button>
              </Link>
            )}

            {/* User Profile & Account Menu */}
            {session || user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1 rounded-md bg-secondary/60 hover:bg-secondary border border-border text-xs font-medium transition-colors"
                >
                  <img
                    src={currentAvatar}
                    alt={currentDisplayName}
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-border"
                  />
                  <span className="hidden md:inline-block font-semibold text-foreground truncate max-w-[100px]">
                    {currentDisplayName.split(" ")[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl bg-card border border-border shadow-xl p-2 z-50 text-card-foreground">
                    {/* User Profile Info Card */}
                    <div className="p-3 border-b border-border flex items-center gap-3">
                      <img
                        src={currentAvatar}
                        alt={currentDisplayName}
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs truncate text-foreground">
                          {currentDisplayName}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {user?.email || session?.user?.email || ""}
                        </p>
                        {user?.incognitoProfile && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground mt-0.5">
                            <EyeOff className="w-2.5 h-2.5" />
                            <span>@{user.incognitoProfile.handle}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Primary Actions */}
                    <div className="py-2 space-y-0.5">
                      <Link
                        href="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-secondary transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                        <span>Student Dashboard</span>
                      </Link>

                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-secondary transition-colors"
                      >
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>Edit Profile & Alias</span>
                      </Link>

                      <Link
                        href="/messages"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-secondary transition-colors"
                      >
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        <span>Direct Messages</span>
                      </Link>

                      <Link
                        href="/support"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-secondary transition-colors"
                      >
                        <LifeBuoy className="w-4 h-4 text-muted-foreground" />
                        <span>Support & Feedback</span>
                      </Link>
                    </div>

                    {/* Sign Out Button */}
                    <div className="pt-2 border-t border-border">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleSignOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login">
                <Button variant="default" size="sm" className="h-8 gap-1.5 text-xs font-semibold">
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Button>
              </Link>
            )}

            {/* Dark / Light Mode Switcher */}
            <ThemeToggle />

            {/* Mobile Hamburger Button */}
            <div className="xl:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md bg-secondary text-muted-foreground hover:text-foreground border border-border"
                aria-label="Toggle Mobile Menu"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-b border-border bg-background px-4 pt-3 pb-6 space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {hasAdminAccess && (
            <div className="pt-2 border-t border-border">
              <Link
                href="/admin/print"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-secondary text-foreground"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Operations Console</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
