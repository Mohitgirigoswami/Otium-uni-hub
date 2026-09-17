"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Home,
  Printer,
  CalendarCheck,
  GraduationCap,
  Briefcase,
  ShoppingBag,
  Car,
  EyeOff,
  MessageSquare,
  User,
  Shield,
  Palette,
  ArrowRight,
  Plus,
  Command as CommandIcon,
  X,
  Check,
} from "lucide-react";
import { THEMES } from "@/lib/themes";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  category: "Navigation" | "Themes" | "Actions";
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  keywords?: string[];
  action: () => void;
  badge?: string;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Keyboard shortcut listener: Ctrl+K / Cmd+K or "/"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept "/" if user is typing in an input/textarea/editable
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "/" && !isInput) {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Close palette and navigate
  const handleSelect = useCallback((action: () => void) => {
    setIsOpen(false);
    setQuery("");
    action();
  }, []);

  // Defined commands
  const allCommands: CommandItem[] = useMemo(() => {
    return [
      // Navigation
      {
        id: "nav-home",
        category: "Navigation",
        title: "Campus Hub",
        subtitle: "Main student feed & academic metrics",
        icon: Home,
        keywords: ["home", "feed", "dashboard"],
        action: () => router.push("/"),
      },
      {
        id: "nav-print",
        category: "Navigation",
        title: "Express Printing",
        subtitle: "Express campus document printing & delivery",
        icon: Printer,
        keywords: ["print", "xerox", "pdf", "dispatch", "order", "express"],
        action: () => router.push("/print-station"),
      },
      {
        id: "nav-attendance",
        category: "Navigation",
        title: "Attendance Guardrail",
        subtitle: "Course attendance & bunk allowances",
        icon: CalendarCheck,
        keywords: ["attendance", "bunks", "lectures", "75%"],
        action: () => router.push("/attendance"),
      },
      {
        id: "nav-cgpa",
        category: "Navigation",
        title: "CGPA Forecaster",
        subtitle: "Semester SGPA & graduation targets",
        icon: GraduationCap,
        keywords: ["cgpa", "sgpa", "grades", "calculator", "marks"],
        action: () => router.push("/cgpa"),
      },
      {
        id: "nav-gigs",
        category: "Navigation",
        title: "Student Gigs",
        subtitle: "Peer freelance tasks with escrow hold",
        icon: Briefcase,
        keywords: ["gigs", "tasks", "freelance", "earn", "escrow"],
        action: () => router.push("/gigs"),
      },
      {
        id: "nav-marketplace",
        category: "Navigation",
        title: "Campus Marketplace",
        subtitle: "Buy & sell textbooks, lab coats, cycles",
        icon: ShoppingBag,
        keywords: ["marketplace", "buy", "sell", "items", "books"],
        action: () => router.push("/marketplace"),
      },
      {
        id: "nav-rideshare",
        category: "Navigation",
        title: "Cab Splits",
        subtitle: "Airport, station, and city travel sharing",
        icon: Car,
        keywords: ["cab", "split", "ride", "auto", "travel", "uber"],
        action: () => router.push("/rideshare"),
      },
      {
        id: "nav-incognito",
        category: "Navigation",
        title: "Whisper Wall",
        subtitle: "Anonymous campus bulletin board",
        icon: EyeOff,
        keywords: ["whisper", "wall", "anonymous", "confessions"],
        action: () => router.push("/incognito"),
      },
      {
        id: "nav-messages",
        category: "Navigation",
        title: "Campus Messages",
        subtitle: "Encrypted student direct messages",
        icon: MessageSquare,
        keywords: ["chat", "messages", "inbox", "dm"],
        action: () => router.push("/messages"),
      },
      {
        id: "nav-profile",
        category: "Navigation",
        title: "Student Profile",
        subtitle: "Account settings, bio & campus preferences",
        icon: User,
        keywords: ["profile", "settings", "account", "theme"],
        action: () => router.push("/profile"),
      },
      {
        id: "nav-admin",
        category: "Navigation",
        title: "Admin Console",
        subtitle: "Campus moderators & platform managers",
        icon: Shield,
        keywords: ["admin", "moderation", "console", "portal"],
        action: () => router.push("/admin"),
      },

      // Themes
      ...THEMES.map((t) => ({
        id: `theme-${t.id}`,
        category: "Themes" as const,
        title: `Theme: ${t.name}`,
        subtitle: t.tagline,
        icon: Palette,
        keywords: ["theme", "color", "dark", "light", t.name.toLowerCase()],
        badge: theme === t.id ? "Active" : undefined,
        action: () => setTheme(t.id),
      })),

      // Quick Actions
      {
        id: "action-new-print",
        category: "Actions",
        title: "New Print Job",
        subtitle: "Upload document for campus print dispatch",
        icon: Plus,
        keywords: ["new print", "upload pdf", "print order"],
        action: () => router.push("/print-station"),
      },
      {
        id: "action-new-gig",
        category: "Actions",
        title: "Post a Student Gig",
        subtitle: "Create task with protected student escrow",
        icon: Plus,
        keywords: ["post gig", "create task", "hire"],
        action: () => router.push("/gigs"),
      },
    ];
  }, [router, theme, setTheme]);

  // Filtered commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase().trim();
    return allCommands.filter((cmd) => {
      const matchTitle = cmd.title.toLowerCase().includes(q);
      const matchSubtitle = cmd.subtitle?.toLowerCase().includes(q);
      const matchCategory = cmd.category.toLowerCase().includes(q);
      const matchKeywords = cmd.keywords?.some((k) => k.includes(q));
      return matchTitle || matchSubtitle || matchCategory || matchKeywords;
    });
  }, [allCommands, query]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Key navigation within modal
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? Math.max(0, filteredCommands.length - 1) : prev - 1
      );
    } else if (e.key === "Enter" && filteredCommands.length > 0) {
      e.preventDefault();
      const target = filteredCommands[selectedIndex];
      if (target) handleSelect(target.action);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 select-none">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
          />

          {/* Floating Command Palette Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden z-10 theme-glow-card flex flex-col max-h-[75vh]"
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-4 py-3.5 border-b border-border/80 gap-3">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleModalKeyDown}
                placeholder="Type a module, task, or theme... (e.g. Print, Gigs, Cyber)"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono text-muted-foreground bg-secondary rounded border border-border">
                  ESC
                </kbd>
              )}
            </div>

            {/* Scrollable Command List */}
            <div className="overflow-y-auto p-2 space-y-1 divide-y divide-border/20">
              {filteredCommands.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No campus portals or commands match &ldquo;{query}&rdquo;.
                </div>
              ) : (
                filteredCommands.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = idx === selectedIndex;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item.action)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "w-full flex items-center justify-between p-2.5 rounded-xl text-left cursor-pointer transition-colors group",
                        isSelected
                          ? "bg-secondary text-foreground"
                          : "text-foreground hover:bg-secondary/60"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors border",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary/80 text-muted-foreground border-border"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-foreground truncate flex items-center gap-2">
                            <span>{item.title}</span>
                            {item.badge && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-primary/20 text-primary border border-primary/30">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {item.subtitle && (
                            <div className="text-[11px] text-muted-foreground truncate">
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pl-2">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.category}
                        </span>
                        <ArrowRight
                          className={cn(
                            "w-3.5 h-3.5 transition-transform",
                            isSelected
                              ? "text-primary translate-x-0.5"
                              : "text-muted-foreground/40"
                          )}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Navigation Hints */}
            <div className="p-2.5 px-4 bg-secondary/40 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-card border border-border rounded text-[10px]">↑</kbd>
                  <kbd className="px-1 py-0.5 bg-card border border-border rounded text-[10px]">↓</kbd>
                  to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-[10px]">↵</kbd>
                  to select
                </span>
              </div>
              <span className="hidden sm:inline">Otium Campus Command Deck</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
