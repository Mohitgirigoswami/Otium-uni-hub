import { Platform } from "react-native";

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
    // Android emulator loops back to host machine via 10.0.2.2
    if (Platform.OS === "android") {
      return "http://10.0.2.2:3000/api";
    }
    // iOS simulator / Web can access localhost directly
    return "http://localhost:3000/api";
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
