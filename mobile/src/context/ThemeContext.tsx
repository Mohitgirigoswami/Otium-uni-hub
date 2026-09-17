import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ThemeId,
  MobileThemeColors,
  MobileThemeDefinition,
  THEMES,
  DEFAULT_THEME_ID,
} from "../theme/themes";

interface ThemeContextType {
  theme: ThemeId;
  themeDefinition: MobileThemeDefinition;
  colors: MobileThemeColors;
  isDark: boolean;
  setTheme: (id: ThemeId) => Promise<void>;
}

const STORAGE_KEY_THEME = "@otium_theme";

const ThemeContext = createContext<ThemeContextType>({
  theme: DEFAULT_THEME_ID,
  themeDefinition: THEMES[DEFAULT_THEME_ID],
  colors: THEMES[DEFAULT_THEME_ID].colors,
  isDark: THEMES[DEFAULT_THEME_ID].isDark,
  setTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME_ID);

  // Load saved theme on mount
  useEffect(() => {
    async function loadTheme() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY_THEME);
        if (saved && (saved in THEMES)) {
          setThemeId(saved as ThemeId);
        }
      } catch (e) {
        console.warn("Could not load theme preference:", e);
      }
    }
    loadTheme();
  }, []);

  const handleSetTheme = useCallback(async (newId: ThemeId) => {
    if (newId in THEMES) {
      setThemeId(newId);
      try {
        await AsyncStorage.setItem(STORAGE_KEY_THEME, newId);
      } catch (e) {
        console.warn("Could not save theme preference:", e);
      }
    }
  }, []);

  const currentTheme = THEMES[themeId] || THEMES[DEFAULT_THEME_ID];

  return (
    <ThemeContext.Provider
      value={{
        theme: themeId,
        themeDefinition: currentTheme,
        colors: currentTheme.colors,
        isDark: currentTheme.isDark,
        setTheme: handleSetTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
