/**
 * Otium Uni Hub - Single-File Extensible Theme Architecture
 * 
 * To add a new theme in the future:
 * 1. Add a new theme object to the THEMES array below with its unique id, label, description, and CSS variables.
 * 2. That is it! The ThemeSwitcher and theme provider will automatically detect and render it.
 */

export type ThemeId = "cyber-neon" | "emerald-campus" | "minimal-luxe" | "minimal-dark";

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  tagline: string;
  isDark: boolean;
  accentColor: string;
  previewColors: {
    bg: string;
    card: string;
    primary: string;
    accent: string;
    border: string;
  };
  cssVariables: Record<string, string>;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: "cyber-neon",
    name: "Obsidian Cyber",
    tagline: "High-contrast dark grid with electric cyan accents",
    isDark: true,
    accentColor: "#06b6d4",
    previewColors: {
      bg: "#09090b",
      card: "#111215",
      primary: "#06b6d4",
      accent: "#22d3ee",
      border: "#27272a",
    },
    cssVariables: {
      "--background": "#09090b",
      "--foreground": "#fafafa",
      "--card": "#111215",
      "--card-foreground": "#fafafa",
      "--popover": "#111215",
      "--popover-foreground": "#fafafa",
      "--primary": "#06b6d4",
      "--primary-foreground": "#09090b",
      "--secondary": "#1c1d22",
      "--secondary-foreground": "#f4f4f5",
      "--muted": "#18181b",
      "--muted-foreground": "#a1a1aa",
      "--accent": "#164e63",
      "--accent-foreground": "#e0f2fe",
      "--destructive": "#ef4444",
      "--destructive-foreground": "#fafafa",
      "--border": "#27272a",
      "--input": "#27272a",
      "--ring": "#06b6d4",
      "--radius": "0.5rem",
      "--glow-color": "rgba(6, 182, 212, 0.15)",
    },
  },
  {
    id: "emerald-campus",
    name: "Emerald Campus",
    tagline: "Organic academic palette with rich forest greens and warm accents",
    isDark: false,
    accentColor: "#0f766e",
    previewColors: {
      bg: "#f5f7f5",
      card: "#ffffff",
      primary: "#0f766e",
      accent: "#ea580c",
      border: "#d1d5db",
    },
    cssVariables: {
      "--background": "#f5f7f5",
      "--foreground": "#132a21",
      "--card": "#ffffff",
      "--card-foreground": "#132a21",
      "--popover": "#ffffff",
      "--popover-foreground": "#132a21",
      "--primary": "#0f766e",
      "--primary-foreground": "#ffffff",
      "--secondary": "#e6ede7",
      "--secondary-foreground": "#132a21",
      "--muted": "#ecf2ed",
      "--muted-foreground": "#52796f",
      "--accent": "#ea580c",
      "--accent-foreground": "#ffffff",
      "--destructive": "#dc2626",
      "--destructive-foreground": "#ffffff",
      "--border": "#d2ded5",
      "--input": "#d2ded5",
      "--ring": "#0f766e",
      "--radius": "0.625rem",
      "--glow-color": "rgba(15, 118, 110, 0.12)",
    },
  },
  {
    id: "minimal-luxe",
    name: "Minimal Luxe",
    tagline: "Architectural monochrome light mode with crisp geometry & high contrast",
    isDark: false,
    accentColor: "#09090b",
    previewColors: {
      bg: "#f4f4f5",
      card: "#ffffff",
      primary: "#09090b",
      accent: "#52525b",
      border: "#d4d4d8",
    },
    cssVariables: {
      "--background": "#f4f4f5",
      "--foreground": "#09090b",
      "--card": "#ffffff",
      "--card-foreground": "#09090b",
      "--popover": "#ffffff",
      "--popover-foreground": "#09090b",
      "--primary": "#09090b",
      "--primary-foreground": "#ffffff",
      "--secondary": "#e4e4e7",
      "--secondary-foreground": "#09090b",
      "--muted": "#e4e4e7",
      "--muted-foreground": "#52525b",
      "--accent": "#18181b",
      "--accent-foreground": "#ffffff",
      "--destructive": "#e11d48",
      "--destructive-foreground": "#ffffff",
      "--border": "#d4d4d8",
      "--input": "#d4d4d8",
      "--ring": "#09090b",
      "--radius": "0.5rem",
      "--glow-color": "rgba(0, 0, 0, 0.05)",
    },
  },
  {
    id: "minimal-dark",
    name: "Minimal Dark",
    tagline: "Monochrome architectural dark mode with obsidian canvas & stark white accents",
    isDark: true,
    accentColor: "#ffffff",
    previewColors: {
      bg: "#000000",
      card: "#09090b",
      primary: "#ffffff",
      accent: "#a1a1aa",
      border: "#27272a",
    },
    cssVariables: {
      "--background": "#000000",
      "--foreground": "#ffffff",
      "--card": "#09090b",
      "--card-foreground": "#ffffff",
      "--popover": "#09090b",
      "--popover-foreground": "#ffffff",
      "--primary": "#ffffff",
      "--primary-foreground": "#000000",
      "--secondary": "#27272a",
      "--secondary-foreground": "#ffffff",
      "--muted": "#18181b",
      "--muted-foreground": "#a1a1aa",
      "--accent": "#27272a",
      "--accent-foreground": "#ffffff",
      "--destructive": "#f43f5e",
      "--destructive-foreground": "#ffffff",
      "--border": "#27272a",
      "--input": "#27272a",
      "--ring": "#ffffff",
      "--radius": "0.5rem",
      "--glow-color": "rgba(255, 255, 255, 0.08)",
    },
  },
];

export const DEFAULT_THEME_ID: ThemeId = "cyber-neon";

export function getThemeById(id: string): ThemeDefinition {
  const found = THEMES.find((t) => t.id === id);
  return found || THEMES[0];
}

export function generateThemeCssVariables(): string {
  return THEMES.map((theme) => {
    const vars = Object.entries(theme.cssVariables)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join("\n");
    return `[data-theme="${theme.id}"] {\n${vars}\n}`;
  }).join("\n\n");
}
