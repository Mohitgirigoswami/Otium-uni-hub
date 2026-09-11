import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeColors, ThemeKey, themes, emeraldLightTheme } from "./themes";

const STORAGE_KEY_THEME = "@otium_app_theme";

interface ThemeContextType {
  themeKey: ThemeKey;
  theme: ThemeColors;
  isDark: boolean;
  setThemeKey: (key: ThemeKey) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  themeKey: "emeraldLight",
  theme: emeraldLightTheme,
  isDark: false,
  setThemeKey: async () => {},
  toggleTheme: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>("emeraldLight");

  useEffect(() => {
    async function loadSavedTheme() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY_THEME);
        if (saved === "emeraldLight" || saved === "midnightDark") {
          setThemeKeyState(saved);
        }
      } catch (err) {
        console.log("Could not load theme from storage:", err);
      }
    }
    loadSavedTheme();
  }, []);

  const setThemeKey = async (key: ThemeKey) => {
    setThemeKeyState(key);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_THEME, key);
    } catch (err) {
      console.log("Could not save theme to storage:", err);
    }
  };

  const toggleTheme = async () => {
    const nextKey = themeKey === "emeraldLight" ? "midnightDark" : "emeraldLight";
    await setThemeKey(nextKey);
  };

  const theme = themes[themeKey] || emeraldLightTheme;

  return (
    <ThemeContext.Provider
      value={{
        themeKey,
        theme,
        isDark: theme.isDark,
        setThemeKey,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
