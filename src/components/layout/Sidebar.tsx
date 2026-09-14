"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

import { LucideIcon } from "lucide-react";

export interface SidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

export interface SidebarGroup {
  title?: string;
  items: SidebarItem[];
}

interface SidebarProps {
  groups: SidebarGroup[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Sidebar({
  groups,
  header,
  footer,
  className,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col w-64 border-r border-border bg-card/50 backdrop-blur-md shrink-0 select-none",
        className
      )}
    >
      {/* Sidebar Header */}
      {header && (
        <div className="p-4 border-b border-border flex items-center gap-3">
          {header}
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
        {groups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {group.title && (
              <p className="px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <Badge
                        variant={isActive ? "secondary" : "outline"}
                        size="sm"
                        className={cn(
                          "ml-2 text-[10px] px-1.5 py-0 h-4",
                          isActive && "bg-primary-foreground/20 text-primary-foreground border-transparent"
                        )}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer */}
      {footer && (
        <div className="p-3 border-t border-border mt-auto">
          {footer}
        </div>
      )}
    </aside>
  );
}
