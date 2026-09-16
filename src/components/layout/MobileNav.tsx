"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Printer,
  EyeOff,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DOCK_ITEMS = [
  { href: "/dashboard", label: "Hub", icon: LayoutDashboard },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/print-station", label: "Print", icon: Printer },
  { href: "/incognito", label: "Whisper", icon: EyeOff },
  { href: "/messages", label: "Chat", icon: MessageSquare },
];

export function MobileNav() {
  const pathname = usePathname();

  // Hide on admin routes to prevent overlapping with admin toolbar
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 sm:hidden">
      <nav className="flex items-center justify-around bg-card/95 backdrop-blur-md border border-border rounded-xl px-2 py-2 shadow-xl">
        {DOCK_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-all",
                isActive
                  ? "bg-secondary text-primary font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
