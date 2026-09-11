import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { apiClient } from "../services/apiClient";

export const STORAGE_KEYS = {
  CACHED_USER: "@otium_cached_user",
  SELECTED_CAMPUS: "@otium_selected_campus",
};

interface UserContextType {
  user: any | null;
  setUser: (user: any) => void;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  signOut: () => {},
  refreshUser: async () => {},
  isLoading: false,
});

export function UserProvider({
  children,
  onLogout,
  initialUser = null,
}: {
  children: React.ReactNode;
  onLogout?: () => void;
  initialUser?: any | null;
}) {
  const [user, setUserState] = useState<any | null>(initialUser);
  const [isLoading, setIsLoading] = useState(false);

  // Wrapper that saves to state and persists to AsyncStorage
  const setUser = (updated: any) => {
    setUserState((prev: any) => {
      const newUser = typeof updated === "function" ? updated(prev) : updated;
      if (newUser) {
        AsyncStorage.setItem(STORAGE_KEYS.CACHED_USER, JSON.stringify(newUser)).catch(() => {});
        if (newUser.collegeId || newUser.college) {
          const campusPayload = {
            id: newUser.collegeId || newUser.college?.id,
            name: newUser.college?.name || "Campus Hub",
            code: newUser.college?.code,
          };
          AsyncStorage.setItem(STORAGE_KEYS.SELECTED_CAMPUS, JSON.stringify(campusPayload)).catch(() => {});
        }
      }
      return newUser;
    });
  };

  // On mount: load local cached campus & cached user, then refresh in background
  useEffect(() => {
    async function restoreLocalUserData() {
      try {
        const [storedCampus, storedUser] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.SELECTED_CAMPUS),
          AsyncStorage.getItem(STORAGE_KEYS.CACHED_USER),
        ]);

        let parsedUser = initialUser;
        if (!parsedUser && storedUser) {
          try {
            parsedUser = JSON.parse(storedUser);
          } catch {}
        }

        if (storedCampus) {
          try {
            const campus = JSON.parse(storedCampus);
            if (campus?.id) {
              parsedUser = {
                ...(parsedUser || {}),
                collegeId: parsedUser?.collegeId || campus.id,
                college: parsedUser?.college || campus,
              };
            }
          } catch {}
        }

        if (parsedUser) {
          setUserState(parsedUser);
        }

        // Background non-blocking network refresh
        refreshUser();
      } catch (e) {
        console.warn("Could not restore local user data:", e);
      }
    }

    restoreLocalUserData();
  }, []);

  const refreshUser = async () => {
    try {
      const res = await apiClient.get("/profile");
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        const meRes = await apiClient.get("/auth/me");
        if (meRes.success && meRes.data?.user) {
          setUser(meRes.data.user);
        }
      }
    } catch (e) {
      // Gracefully ignored when offline
      console.log("Offline or server unreachable, keeping cached user profile");
    }
  };

  const signOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of Otium?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync("jwt");
            } catch {}
            try {
              await AsyncStorage.removeItem(STORAGE_KEYS.CACHED_USER);
            } catch {}
            try {
              const RNSignIn = require("@react-native-google-signin/google-signin");
              if (RNSignIn?.GoogleSignin?.signOut) {
                await RNSignIn.GoogleSignin.signOut();
              }
            } catch {}
            apiClient.clearAuthToken();
            setUserState(null);
            if (onLogout) onLogout();
          },
        },
      ]
    );
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        signOut,
        refreshUser,
        isLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
