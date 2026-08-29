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
  Sparkles,
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/60 dark:border-slate-800/80 bg-white/75 dark:bg-[#090d16]/80 backdrop-blur-xl transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-black border border-white/15 p-1.5 flex items-center justify-center shadow-lg shadow-black/30 group-hover:scale-105 group-hover:border-brand-500/50 transition-all">
                <img
                  src="/logo.png"
                  alt="Otium Uni Hub Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight font-sans bg-gradient-to-r from-brand-600 via-teal-500 to-electric-600 bg-clip-text text-transparent">
                  OTIUM
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
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
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-brand-500/15 text-brand-700 dark:text-brand-300 font-bold shadow-sm"
                        : "text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 font-bold rounded-full bg-brand-500/20 text-brand-700 dark:text-brand-300">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Actions: Cooldown Alert, Admin Badge, User Dropdown & Theme Toggle */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Anti-Hoarding Cooldown Pill */}
            {isOnCooldown && (
              <div
                title="Anti-Hoarding Penalty: Dropped gig in last 24h"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-pulse"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>Cooldown: {cooldownHoursRemaining}h</span>
              </div>
            )}

            {/* Admin Console Pill */}
            {hasAdminAccess && (
              <Link
                href="/admin/print"
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition-colors"
                title="Open Admin Operations Console"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Admin Hub</span>
              </Link>
            )}

            {/* User Profile & Account Menu */}
            {session ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs font-medium hover:border-brand-400 transition-colors"
                >
                  <img
                    src={currentAvatar}
                    alt={currentDisplayName}
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-brand-500"
                  />
                  <span className="hidden md:inline-block font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[100px]">
                    {currentDisplayName.split(" ")[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 text-slate-900 dark:text-white">
                    {/* User Profile Info Card */}
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                      <img
                        src={currentAvatar}
                        alt={currentDisplayName}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-500/30"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs truncate text-slate-900 dark:text-white">
                          {currentDisplayName}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {user?.email || session?.user?.email || ""}
                        </p>
                        {user?.incognitoProfile && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                            <EyeOff className="w-2.5 h-2.5" />
                            <span>@{user.incognitoProfile.handle}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Primary Actions */}
                    <div className="py-2 space-y-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-teal-500" />
                        <span>Student Dashboard</span>
                      </Link>

                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-brand-500/10 hover:text-brand-600 transition-colors"
                      >
                        <User className="w-4 h-4 text-brand-500" />
                        <span>Edit Profile & Whisper Alias</span>
                      </Link>

                      <Link
                        href="/messages"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-brand-500/10 hover:text-brand-600 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4 text-emerald-500" />
                        <span>Direct Messages</span>
                      </Link>

                      <Link
                        href="/support"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-brand-500/10 hover:text-brand-600 transition-colors"
                      >
                        <LifeBuoy className="w-4 h-4 text-sky-500" />
                        <span>Support & Helpdesk</span>
                      </Link>

                      {hasAdminAccess && (
                        <Link
                          href="/admin/print"
                          onClick={() => setUserMenuOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-amber-500" />
                          <span>Admin Console & Operations</span>
                        </Link>
                      )}
                    </div>

                    {/* Sign Out Action */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleSignOut();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out from Otium</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-500 shadow-md shadow-brand-600/20 transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Theme Switcher */}
            <ThemeToggle />

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-500"
              aria-label="Open mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#090d16]/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-1">
          {isOnCooldown && (
            <div className="p-3 mb-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Anti-Hoarding Cooldown Active: {cooldownHoursRemaining}h remaining</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-xl text-xs font-semibold transition-colors",
                    isActive
                      ? "bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-500/30"
                      : "bg-slate-100/60 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-200/60"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            {session ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1.5"
                >
                  <User className="w-4 h-4" />
                  <span>My Student Profile</span>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="text-xs font-bold text-rose-600 flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-bold text-brand-600 flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
