"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { useUser, AVAILABLE_PERSONAS } from "../providers/UserContext";
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
  UserCheck,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/gigs", label: "Gig Hub", icon: Briefcase, badge: "P2P" },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/cgpa", label: "CGPA", icon: GraduationCap },
  { href: "/lost-and-found", label: "Lost & Found", icon: Search },
  { href: "/rideshare", label: "RideSplit", icon: Car },
  { href: "/incognito", label: "Incognito", icon: EyeOff, badge: "Anon" },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/print-station", label: "Print", icon: Printer },
  { href: "/messages", label: "Messages", icon: MessageSquare, badge: "Live" },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, activePersonaId, setActivePersonaId, isOnCooldown, cooldownHoursRemaining } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [personaMenuOpen, setPersonaMenuOpen] = useState(false);

  const activePersona = AVAILABLE_PERSONAS.find((p) => p.id === activePersonaId) || AVAILABLE_PERSONAS[0];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/60 dark:border-slate-800/80 bg-white/75 dark:bg-[#090d16]/80 backdrop-blur-xl transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-teal-500 to-accent-500 flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight font-sans bg-gradient-to-r from-brand-600 via-teal-500 to-electric-600 bg-clip-text text-transparent">
                  OTIUM
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                  Uni Super App
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
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

          {/* Right Actions: Cooldown Alert, Persona Switcher & Theme Toggle */}
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
            {user?.role === "ADMIN" && (
              <Link
                href="/admin/print"
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition-colors"
                title="Open Admin Operations Console"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Admin Hub</span>
              </Link>
            )}

            {/* Persona Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setPersonaMenuOpen(!personaMenuOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs font-medium hover:border-brand-400 transition-colors"
              >
                <img
                  src={activePersona.avatar}
                  alt={activePersona.name}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-brand-500"
                />
                <span className="hidden md:inline-block font-semibold text-slate-800 dark:text-slate-200">
                  {activePersona.name.split(" ")[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Persona Switcher Menu */}
              {personaMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 text-slate-900 dark:text-white">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Switch Campus Persona
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Test multi-user features & anti-hoarding rules
                    </p>
                  </div>
                  <div className="py-1 space-y-1">
                    {AVAILABLE_PERSONAS.map((persona) => (
                      <button
                        key={persona.id}
                        onClick={() => {
                          setActivePersonaId(persona.id);
                          setPersonaMenuOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-colors",
                          activePersonaId === persona.id
                            ? "bg-brand-500/15 text-brand-700 dark:text-brand-300 font-bold"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        )}
                      >
                        <img
                          src={persona.avatar}
                          alt={persona.name}
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-700"
                        />
                        <div className="flex-1 truncate">
                          <p className="font-semibold truncate">{persona.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{persona.role}</p>
                        </div>
                        {activePersonaId === persona.id && (
                          <UserCheck className="w-4 h-4 text-brand-500 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
        </div>
      )}
    </header>
  );
}
