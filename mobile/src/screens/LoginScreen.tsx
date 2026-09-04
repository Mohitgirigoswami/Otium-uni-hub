import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as SecureStore from "expo-secure-store";
import { Ionicons, AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { GlassCard } from "../components/GlassCard";
import { Badge } from "../components/Badge";
import { apiClient } from "../services/apiClient";

WebBrowser.maybeCompleteAuthSession();

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

const DEMO_GOOGLE_PROFILES = [
  { label: "DTU Student (Official)", email: "student@dtu.ac.in", name: "Aarav Sharma" },
  { label: "Campus Creator", email: "priya.verma@dtu.ac.in", name: "Priya Verma" },
];

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Expo Google Auth Session
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      "182612765129-k94groidumjmdmb68s32a534sfqtoe10.apps.googleusercontent.com",
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });

  // Handle Google OAuth response from WebBrowser
  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      const accessToken = authentication?.accessToken;
      const idToken = authentication?.idToken;

      if (accessToken || idToken) {
        processGoogleBackendAuth({ accessToken, idToken });
      }
    }
  }, [response]);

  // Centralized Google token verification with Next.js Backend
  const processGoogleBackendAuth = async (authPayload: {
    accessToken?: string;
    idToken?: string;
    email?: string;
    name?: string;
  }) => {
    setIsLoading(true);

    try {
      const res = await apiClient.post("/auth/google", authPayload);

      setIsLoading(false);

      if (res.success && res.data?.token) {
        const token = res.data.token;
        const user = res.data.user;

        // 1. Save JWT to native SecureStore
        try {
          await SecureStore.setItemAsync("jwt", token);
        } catch (storageErr) {
          console.warn("SecureStore unavailable:", storageErr);
        }

        // 2. Set token on centralized network client
        apiClient.setAuthToken(token);

        // 3. Transition to main App TabNavigator
        onLoginSuccess(user);
      } else {
        Alert.alert(
          "Google Sign-In Error",
          res.error || "Could not authenticate with Google server."
        );
      }
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert(
        "Connection Error",
        err?.message || "Could not connect to Otium backend. Please check network."
      );
    }
  };

  // Trigger Google Sign-In Flow
  const handleGoogleSignIn = async () => {
    if (!request) {
      Alert.alert(
        "Initializing",
        "Google authentication service is initializing. Please try again in a moment."
      );
      return;
    }

    try {
      const result = await promptAsync();
      if (result?.type === "success") {
        const { authentication } = result;
        const accessToken = authentication?.accessToken;
        const idToken = authentication?.idToken;

        if (accessToken || idToken) {
          await processGoogleBackendAuth({ accessToken, idToken });
        }
      } else if (result?.type === "error") {
        console.warn("Google Sign-In Result Error:", result.error);
        Alert.alert(
          "Google Sign-In Error",
          result.error?.message || "Google sign-in was not completed."
        );
      }
    } catch (err: any) {
      console.warn("Google prompt error:", err);
      Alert.alert(
        "Google Sign-In Error",
        err?.message || "Failed to open Google authentication window."
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Logo & Hero Badge */}
        <View style={styles.heroSection}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoLetter}>O</Text>
          </View>
          <View style={styles.brandBadgeRow}>
            <Badge variant="brand" size="sm">
              Single Sign-On • University Portal
            </Badge>
          </View>
          <Text style={styles.heroTitle}>Otium Uni Hub</Text>
          <Text style={styles.heroSubtitle}>
            Your entire campus ecosystem. Instant print dispatch, attendance guardrails, anonymous whisper walls, and CGPA forecasting.
          </Text>
        </View>

        {/* Exclusive Google Authentication Card */}
        <GlassCard style={styles.authCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="google" size={24} color={colors.brand[400]} />
            <Text style={styles.cardTitle}>Student Authentication</Text>
          </View>

          <Text style={styles.cardDesc}>
            Sign in using your university or personal Google account to access all campus tools securely.
          </Text>

          {/* Primary "Sign in with Google" Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            style={styles.googleButton}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.googleContentRow}>
                <View style={styles.googleIconCircle}>
                  <AntDesign name="google" size={18} color="#0B132B" />
                </View>
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Quick Google Test Profiles for Device Testing */}
          <View style={styles.quickTestSection}>
            <Text style={styles.quickTestLabel}>Or test with verified profile:</Text>
            <View style={styles.quickProfileGrid}>
              {DEMO_GOOGLE_PROFILES.map((profile) => (
                <TouchableOpacity
                  key={profile.email}
                  disabled={isLoading}
                  onPress={() =>
                    processGoogleBackendAuth({
                      idToken: `google-token-${profile.email}`,
                      email: profile.email,
                      name: profile.name,
                    })
                  }
                  style={styles.profileChip}
                >
                  <Ionicons name="person-circle-outline" size={14} color={colors.brand[400]} />
                  <Text style={styles.profileChipText}>{profile.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </GlassCard>

        {/* Security Trust Footnote */}
        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.brand[400]} />
          <Text style={styles.footerText}>
            Protected by Google OAuth & 256-bit Stateless JWT
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: "center",
    minHeight: "100%",
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.brand[600],
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
    marginBottom: 14,
  },
  logoLetter: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  brandBadgeRow: {
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13.5,
    color: colors.slate[300],
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 320,
  },
  authCard: {
    padding: 24,
    gap: 18,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.slate[400],
    lineHeight: 19,
  },
  googleButton: {
    backgroundColor: colors.brand[600],
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 4,
  },
  googleContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  googleIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  quickTestSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    gap: 10,
  },
  quickTestLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.slate[400],
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  quickProfileGrid: {
    gap: 8,
  },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(20, 184, 166, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.25)",
  },
  profileChipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.brand[300],
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 28,
  },
  footerText: {
    fontSize: 11.5,
    color: colors.slate[400],
    fontWeight: "500",
  },
});
