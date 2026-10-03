"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { WalletPill } from "@/components/wallet/WalletPill";
import { useUser } from "../providers/UserContext";
import {
  Printer,
  CalendarCheck,
  GraduationCap,
  Briefcase,
  ShoppingBag,
  EyeOff,
  Car,
  MessageSquare,
  Search,
  Building2,
  User,
  LogOut,
  LogIn,
  ShieldCheck,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/print-station", label: "Print Station", icon: Printer },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/cgpa", label: "CGPA", icon: GraduationCap },
  { href: "/gigs", label: "Gigs", icon: Briefcase },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/incognito", label: "Whisper Wall", icon: EyeOff },
  { href: "/rideshare", label: "Cab Split", icon: Car },
  { href: "/messages", label: "Messages", icon: MessageSquare },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { user, handleSignOut } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(e.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [userDropdownOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const campusName = user?.college?.name || "All Campuses";
  const isSuperAdmin = user?.role === "SUPER_ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const isPrintManager = user?.role === "PRINT_MANAGER" || session?.user?.role === "PRINT_MANAGER";
  const hasAdminAccess = isSuperAdmin || isPrintManager;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur-md">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo & Campus Badge */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center p-1.5 font-bold shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
                <img
                  src="/logo.png"
                  alt="Otium Uni Hub"
                  className="w-full h-full object-contain invert dark:invert-0"
                />
              </div>
              <div className="flex flex-col flex-shrink-0">
                <span className="font-heading font-extrabold text-base tracking-tight text-foreground leading-none">
                  OTIUM
                </span>
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Uni Hub
                </span>
              </div>
            </Link>

            {/* Active Campus Indicator - Shown on spacious desktop viewports */}
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/80 border border-border text-[11px] text-muted-foreground max-w-xs truncate flex-shrink-0">
              <Building2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="truncate">{campusName}</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-0.5 flex-shrink-0">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 select-none",
                    isActive
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Items */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Campus Wallet Pill */}
            <WalletPill />

            {/* Theme Switcher */}
            <ThemeSwitcher />

            {/* Admin Console Shortcut */}
            {hasAdminAccess && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  Admin
                </Button>
              </Link>
            )}

            {/* User Account State */}
            {user ? (
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-secondary border border-transparent hover:border-border transition-colors text-xs font-medium"
                  aria-expanded={userDropdownOpen}
                >
                  <div className="w-7 h-7 rounded-md bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs">
                    {user.name ? user.name[0].toUpperCase() : "S"}
                  </div>
                  <span className="hidden md:inline max-w-28 truncate text-foreground">
                    {user.name || "Student"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in-0 zoom-in-95">
                    <div className="px-3 py-2 border-b border-border/50">
                      <div className="font-semibold text-xs text-foreground truncate">
                        {user.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {user.email}
                      </div>
                      {user.role && user.role !== "STUDENT" && (
                        <Badge variant="default" size="sm" className="mt-1.5">
                          {user.role}
                        </Badge>
                      )}
                    </div>

                    <Link
                      href="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Profile & Settings
                    </Link>

                    {hasAdminAccess && (
                      <Link
                        href="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        Admin Dashboard
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleSignOut();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-destructive/10 text-destructive transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm" leftIcon={<LogIn className="w-3.5 h-3.5" />}>
                  Sign In
                </Button>
              </Link>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-border bg-card p-4 space-y-3 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary/80 border border-border text-xs text-muted-foreground">
            <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="truncate">{campusName}</span>
          </div>

          <nav className="grid grid-cols-2 gap-1.5">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}
                >
                  {Icon && <Icon className="w-4 h-4 text-primary" />}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
