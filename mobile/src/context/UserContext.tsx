import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";
import { apiClient } from "../services/apiClient";

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
  isLoading: true,
});

export function UserProvider({
  children,
  onLogout,
}: {
  children: React.ReactNode;
  onLogout?: () => void;
}) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      console.warn("Failed to refresh user profile:", e);
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
              const RNSignIn = require("@react-native-google-signin/google-signin");
              if (RNSignIn?.GoogleSignin?.signOut) {
                await RNSignIn.GoogleSignin.signOut();
              }
            } catch {}
            apiClient.clearAuthToken();
            setUser(null);
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
