"use client";

import React, { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { THEMES, ThemeId } from "@/lib/themes";
import { Palette, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [isOpen]);

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-lg bg-secondary/60 animate-pulse" />
    );
  }

  const activeTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-card/90 hover:bg-secondary text-xs font-medium text-foreground fluid-interactive"
        title="Switch application visual theme"
        aria-label="Switch theme"
        aria-expanded={isOpen}
      >
        <span
          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
          style={{ backgroundColor: activeTheme.accentColor }}
        />
        <span className="hidden 2xl:inline">{activeTheme.name}</span>
        <Palette className="w-3.5 h-3.5 text-muted-foreground ml-0.5 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl z-50 p-2 space-y-1 animate-in fade-in-0 zoom-in-95">
          <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Select Visual Theme
          </div>

          {THEMES.map((t) => {
            const isSelected = t.id === theme;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors",
                  isSelected
                    ? "bg-secondary text-foreground font-semibold"
                    : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-0.5 p-1 rounded border border-border bg-background">
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: t.previewColors.bg }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: t.previewColors.primary }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: t.previewColors.accent }}
                    />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{t.name}</div>
                    <div className="text-[10px] text-muted-foreground line-clamp-1">
                      {t.tagline}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
