export type ThemeId = "cyber-neon" | "emerald-campus" | "minimal-luxe" | "minimal-dark";

export interface MobileThemeColors {
  background: string;
  backgroundSecondary: string;
  card: string;
  cardSecondary: string;
  border: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  warning: string;
  glow: string;
  statusBar: "light" | "dark";
}

export interface MobileThemeDefinition {
  id: ThemeId;
  name: string;
  tagline: string;
  isDark: boolean;
  colors: MobileThemeColors;
}

export const THEMES: Record<ThemeId, MobileThemeDefinition> = {
  "cyber-neon": {
    id: "cyber-neon",
    name: "Obsidian Cyber",
    tagline: "High-contrast dark grid with electric cyan accents",
    isDark: true,
    colors: {
      background: "#09090b",
      backgroundSecondary: "#0e0e11",
      card: "#111215",
      cardSecondary: "#18181b",
      border: "#27272a",
      primary: "#06b6d4",
      primaryForeground: "#09090b",
      secondary: "#1c1d22",
      secondaryForeground: "#f4f4f5",
      muted: "#18181b",
      text: "#fafafa",
      textSecondary: "#a1a1aa",
      textMuted: "#71717a",
      accent: "#164e63",
      destructive: "#ef4444",
      destructiveForeground: "#ffffff",
      success: "#10b981",
      warning: "#f59e0b",
      glow: "rgba(6, 182, 212, 0.2)",
      statusBar: "light",
    },
  },
  "emerald-campus": {
    id: "emerald-campus",
    name: "Emerald Campus",
    tagline: "Collegiate organic sage, forest green, and crisp cards",
    isDark: false,
    colors: {
      background: "#f5f7f5",
      backgroundSecondary: "#eaf0eb",
      card: "#ffffff",
      cardSecondary: "#e6ede7",
      border: "#d2ded5",
      primary: "#0f766e",
      primaryForeground: "#ffffff",
      secondary: "#e6ede7",
      secondaryForeground: "#132a21",
      muted: "#ecf2ed",
      text: "#132a21",
      textSecondary: "#52796f",
      textMuted: "#6b8f85",
      accent: "#ea580c",
      destructive: "#dc2626",
      destructiveForeground: "#ffffff",
      success: "#059669",
      warning: "#d97706",
      glow: "rgba(15, 118, 110, 0.15)",
      statusBar: "dark",
    },
  },
  "minimal-luxe": {
    id: "minimal-luxe",
    name: "Minimal Luxe",
    tagline: "Architectural paper-and-ink canvas with sharp contrast",
    isDark: false,
    colors: {
      background: "#f4f4f5",
      backgroundSecondary: "#e4e4e7",
      card: "#ffffff",
      cardSecondary: "#e4e4e7",
      border: "#d4d4d8",
      primary: "#09090b",
      primaryForeground: "#ffffff",
      secondary: "#e4e4e7",
      secondaryForeground: "#09090b",
      muted: "#e4e4e7",
      text: "#09090b",
      textSecondary: "#52525b",
      textMuted: "#71717a",
      accent: "#18181b",
      destructive: "#e11d48",
      destructiveForeground: "#ffffff",
      success: "#059669",
      warning: "#d97706",
      glow: "rgba(0, 0, 0, 0.08)",
      statusBar: "dark",
    },
  },
  "minimal-dark": {
    id: "minimal-dark",
    name: "Minimal Dark",
    tagline: "Pitch black obsidian with stark architectural white",
    isDark: true,
    colors: {
      background: "#000000",
      backgroundSecondary: "#09090b",
      card: "#09090b",
      cardSecondary: "#18181b",
      border: "#27272a",
      primary: "#ffffff",
      primaryForeground: "#000000",
      secondary: "#27272a",
      secondaryForeground: "#ffffff",
      muted: "#18181b",
      text: "#ffffff",
      textSecondary: "#a1a1aa",
      textMuted: "#71717a",
      accent: "#27272a",
      destructive: "#f43f5e",
      destructiveForeground: "#ffffff",
      success: "#10b981",
      warning: "#f59e0b",
      glow: "rgba(255, 255, 255, 0.12)",
      statusBar: "light",
    },
  },
};

export const DEFAULT_THEME_ID: ThemeId = "cyber-neon";
