export interface ThemeColors {
  isDark: boolean;
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceGlass: string;
  surfaceLight: string;
  card: string;
  cardBorder: string;
  cardBorderHighlight: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
  brand: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    mint: string;
  };
  pastel: {
    coral: string;
    coralBg: string;
    coralBorder: string;
    coralText: string;
    lavender: string;
    lavenderBg: string;
    lavenderBorder: string;
    lavenderText: string;
    mint: string;
    mintBg: string;
    mintBorder: string;
    mintText: string;
    amber: string;
    amberBg: string;
    amberBorder: string;
    amberText: string;
    sky: string;
    skyBg: string;
    skyBorder: string;
    skyText: string;
  };
  purple: {
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    bg: string;
    border: string;
  };
  electric: {
    400: string;
    500: string;
    600: string;
  };
  emerald: {
    300: string;
    400: string;
    500: string;
    600: string;
    bg: string;
    border: string;
  };
  rose: {
    300: string;
    400: string;
    500: string;
    600: string;
    bg: string;
    border: string;
  };
  amber: {
    300: string;
    400: string;
    500: string;
    600: string;
    bg: string;
    border: string;
  };
  slate: {
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
}

// 1. Fresh Botanical / Emerald Campus Light Theme (Inspired by user design reference)
export const emeraldLightTheme: ThemeColors = {
  isDark: false,
  background: "#F8FAF9",
  backgroundSecondary: "#EFF6F3",
  surface: "#FFFFFF",
  surfaceGlass: "rgba(255, 255, 255, 0.92)",
  surfaceLight: "#F0FDF4",
  card: "#FFFFFF",
  cardBorder: "rgba(0, 0, 0, 0.07)",
  cardBorderHighlight: "rgba(16, 185, 129, 0.35)",

  text: {
    primary: "#0F172A",
    secondary: "#475569",
    muted: "#94A3B8",
    inverse: "#FFFFFF",
  },

  brand: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#10b981", // Botanical Emerald
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
    mint: "#10b981",
  },

  pastel: {
    coral: "#FF7A59",
    coralBg: "#FFF2EE",
    coralBorder: "#FFD5C9",
    coralText: "#C43A15",

    lavender: "#7C83FD",
    lavenderBg: "#F2F3FF",
    lavenderBorder: "#D6D9FF",
    lavenderText: "#434BDE",

    mint: "#10B981",
    mintBg: "#ECFDF5",
    mintBorder: "#A7F3D0",
    mintText: "#047857",

    amber: "#F59E0B",
    amberBg: "#FFFBEB",
    amberBorder: "#FDE68A",
    amberText: "#B45309",

    sky: "#0EA5E9",
    skyBg: "#F0F9FF",
    skyBorder: "#BAE6FD",
    skyText: "#0369A1",
  },

  purple: {
    300: "#d8b4fe",
    400: "#c084fc",
    500: "#a855f7",
    600: "#9333ea",
    700: "#7e22ce",
    bg: "rgba(168, 85, 247, 0.08)",
    border: "rgba(168, 85, 247, 0.2)",
  },

  electric: {
    400: "#818cf8",
    500: "#6366f1",
    600: "#4f46e5",
  },

  emerald: {
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    bg: "rgba(16, 185, 129, 0.08)",
    border: "rgba(16, 185, 129, 0.25)",
  },

  rose: {
    300: "#fda4af",
    400: "#fb7185",
    500: "#f43f5e",
    600: "#e11d48",
    bg: "rgba(244, 63, 94, 0.08)",
    border: "rgba(244, 63, 94, 0.25)",
  },

  amber: {
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    bg: "rgba(245, 158, 11, 0.08)",
    border: "rgba(245, 158, 11, 0.25)",
  },

  slate: {
    100: "#f8fafc",
    200: "#f1f5f9",
    300: "#e2e8f0",
    400: "#cbd5e1",
    500: "#94a3b8",
    600: "#64748b",
    700: "#475569",
    800: "#334155",
    900: "#0f172a",
  },
};

// 2. Cyber Midnight Dark Theme
export const midnightDarkTheme: ThemeColors = {
  isDark: true,
  background: "#0A0F1D",
  backgroundSecondary: "#060911",
  surface: "#111A33",
  surfaceGlass: "rgba(17, 26, 51, 0.85)",
  surfaceLight: "#182449",
  card: "#0F172A",
  cardBorder: "rgba(255, 255, 255, 0.08)",
  cardBorderHighlight: "rgba(20, 184, 166, 0.35)",

  text: {
    primary: "#FFFFFF",
    secondary: "#94A3B8",
    muted: "#64748B",
    inverse: "#0F172A",
  },

  brand: {
    50: "#f0fdfa",
    100: "#ccfbf1",
    200: "#99f6e4",
    300: "#5eead4",
    400: "#2dd4bf",
    500: "#14b8a6",
    600: "#0d9488",
    700: "#0f766e",
    800: "#115e59",
    900: "#134e4a",
    mint: "#00FFC6",
  },

  pastel: {
    coral: "#FF8A65",
    coralBg: "rgba(255, 138, 101, 0.12)",
    coralBorder: "rgba(255, 138, 101, 0.3)",
    coralText: "#FFAB91",

    lavender: "#818CF8",
    lavenderBg: "rgba(129, 140, 248, 0.12)",
    lavenderBorder: "rgba(129, 140, 248, 0.3)",
    lavenderText: "#A5B4FC",

    mint: "#34D399",
    mintBg: "rgba(52, 211, 153, 0.12)",
    mintBorder: "rgba(52, 211, 153, 0.3)",
    mintText: "#6EE7B7",

    amber: "#FBBF24",
    amberBg: "rgba(251, 191, 36, 0.12)",
    amberBorder: "rgba(251, 191, 36, 0.3)",
    amberText: "#FCD34D",

    sky: "#38BDF8",
    skyBg: "rgba(56, 189, 248, 0.12)",
    skyBorder: "rgba(56, 189, 248, 0.3)",
    skyText: "#7DD3FC",
  },

  purple: {
    300: "#d8b4fe",
    400: "#c084fc",
    500: "#a855f7",
    600: "#9333ea",
    700: "#7e22ce",
    bg: "rgba(168, 85, 247, 0.12)",
    border: "rgba(168, 85, 247, 0.3)",
  },

  electric: {
    400: "#818cf8",
    500: "#6366f1",
    600: "#4f46e5",
  },

  emerald: {
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.3)",
  },

  rose: {
    300: "#fda4af",
    400: "#fb7185",
    500: "#f43f5e",
    600: "#e11d48",
    bg: "rgba(244, 63, 94, 0.12)",
    border: "rgba(244, 63, 94, 0.3)",
  },

  amber: {
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.3)",
  },

  slate: {
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
};

export type ThemeKey = "emeraldLight" | "midnightDark";

export const themes: Record<ThemeKey, ThemeColors> = {
  emeraldLight: emeraldLightTheme,
  midnightDark: midnightDarkTheme,
};
