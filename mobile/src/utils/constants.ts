import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Otium Mobile Network & Environment Configuration
 */

// Determine API base URL dynamically
const getApiBaseUrl = (): string => {
  // 1. Explicit Environment Variable Override (e.g., in .env or Expo config)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Development Mode
  if (__DEV__) {
    // Automatically extract laptop's Wi-Fi IP address from Expo bundler connection
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest2?.extra?.expoClient?.hostUri ||
      (Constants as any)?.manifest?.debuggerHost;

    if (hostUri) {
      const ip = hostUri.split(":")[0];
      if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
        return `http://${ip}:3000/api`;
      }
    }

    // Direct fallback to laptop Wi-Fi IP (replaces unreachable 10.0.2.2 emulator address)
    return "http://192.168.31.146:3000/api";
  }

  // 3. Production Live Backend URL
  return "https://otium-uni-hub.vercel.app/api";
};

export const API_BASE_URL = getApiBaseUrl();

export const APP_CONSTANTS = {
  APP_NAME: "Otium Uni Hub",
  VERSION: "1.0.0",
  DEFAULT_CAMPUS_ID: "dtu-delhi",
  DEFAULT_CAMPUS_NAME: "DTU Campus",
  MINIMUM_ORDER_FLOOR_RUPEES: 5.0,
  SUPPORT_EMAIL: "support@otiumhub.in",
  DELIVERY_WINDOWS: [
    { id: "MORNING", label: "Morning Drop", time: "8:30 AM - 9:00 AM" },
    { id: "LUNCH", label: "Lunch Drop", time: "12:50 PM - 1:30 PM" },
  ],
};
