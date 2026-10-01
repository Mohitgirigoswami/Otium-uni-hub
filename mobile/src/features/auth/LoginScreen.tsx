import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as SecureStore from "expo-secure-store";
import { Ionicons, AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { GlassCard } from "../../components/GlassCard";
import { Badge } from "../../components/ui/Badge";
import { apiClient } from "../../services/apiClient";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  "182612765129-k94groidumjmdmb68s32a534sfqtoe10.apps.googleusercontent.com";

const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
  "182612765129-2kh8jfrrn176cscsnkdmqvoduema0p7p.apps.googleusercontent.com";

// Safely resolve Native Google Sign-In SDK (present in standalone APK, safe in Expo Go)
let NativeGoogleSignin: any = null;
let nativeStatusCodes: any = {};
let nativeIsErrorWithCode: (error: any) => boolean = () => false;

try {
  const RNSignIn = require("@react-native-google-signin/google-signin");
  NativeGoogleSignin = RNSignIn.GoogleSignin;
  nativeStatusCodes = RNSignIn.statusCodes;
  nativeIsErrorWithCode = RNSignIn.isErrorWithCode;

  if (NativeGoogleSignin?.configure) {
    NativeGoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
      scopes: ["profile", "email"],
    });
  }
} catch {
  // Gracefully ignored in Expo Go
}

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize WebBrowser fallback request
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    // Ensure native SDK configured on component mount if available
    if (NativeGoogleSignin?.configure) {
      try {
        NativeGoogleSignin.configure({
          webClientId: GOOGLE_WEB_CLIENT_ID,
          offlineAccess: false,
          scopes: ["profile", "email"],
        });
      } catch (e) {
        console.warn("NativeGoogleSignin configure error:", e);
      }
    }
  }, []);

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

  // Centralized backend token verification with Next.js
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

        try {
          await SecureStore.setItemAsync("jwt", token);
        } catch (storageErr) {
          console.warn("SecureStore unavailable:", storageErr);
        }

        apiClient.setAuthToken(token);
        onLoginSuccess(user);
      } else {
        Alert.alert(
          "Authentication Error",
          res.error || "Could not authenticate with server."
        );
      }
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert(
        "Network Connection Error",
        "Unable to reach Otium Campus Network. Please check your internet connection."
      );
    }
  };

  // Primary Google Sign-In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);

    // 1. Try Native Google Play Services (Option 2 - works in APK build)
    try {
      if (NativeGoogleSignin?.hasPlayServices) {
        await NativeGoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

        // Reset stale native Google session before re-login
        try {
          await NativeGoogleSignin.signOut();
        } catch {}

        const userInfo = await NativeGoogleSignin.signIn();
        let idToken = (userInfo as any)?.data?.idToken || (userInfo as any)?.idToken;
        let user = (userInfo as any)?.data?.user || (userInfo as any)?.user;
        let accessToken: string | undefined;

        // If idToken is not in the immediate payload, query tokens explicitly
        if (!idToken && NativeGoogleSignin.getTokens) {
          try {
            const tokens = await NativeGoogleSignin.getTokens();
            idToken = tokens.idToken;
            accessToken = tokens.accessToken;
          } catch (tErr) {
            console.log("Could not fetch additional tokens:", tErr);
          }
        }

        if (idToken || accessToken) {
          await processGoogleBackendAuth({
            idToken,
            accessToken,
            email: user?.email,
            name: user?.name,
          });
          return;
        }
      }
    } catch (nativeErr: any) {
      if (nativeIsErrorWithCode(nativeErr)) {
        setIsLoading(false);
        if (nativeErr.code === nativeStatusCodes.SIGN_IN_CANCELLED) {
          return;
        }
        if (nativeErr.code === nativeStatusCodes.IN_PROGRESS) {
          return;
        }
        if (nativeErr.code === nativeStatusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert("Google Play Error", "Google Play Services is not available on this device.");
          return;
        }
        Alert.alert("Google Sign-In Failed", nativeErr.message || `Error code: ${nativeErr.code}`);
        return;
      }

      // If native module is present in standalone build but threw an unexpected error, report it
      if (NativeGoogleSignin) {
        setIsLoading(false);
        Alert.alert("Google Sign-In Error", nativeErr?.message || "Failed to sign in with Google.");
        return;
      }

      console.log("Native Google Sign-In not linked in Expo Go, trying browser sheet:", nativeErr?.message);
    }

    // 2. Try WebBrowser Google Sheet (Expo Go fallback)
    try {
      if (request) {
        const result = await promptAsync();
        if (result?.type === "success") {
          const { authentication } = result;
          const accessToken = authentication?.accessToken;
          const idToken = authentication?.idToken;
          if (accessToken || idToken) {
            await processGoogleBackendAuth({ accessToken, idToken });
            return;
          }
        }
      }
    } catch (browserErr: any) {
      console.warn("Browser Google OAuth error:", browserErr);
    }

    setIsLoading(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Top Logo & Hero Badge */}
        <View style={styles.heroSection}>
          <View style={[styles.logoBadge, { shadowColor: colors.primary }]}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
          <View style={styles.brandBadgeRow}>
            <Badge variant="primary" size="sm">
              Single Sign-On • University Portal
            </Badge>
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Otium Uni Hub</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Your entire campus ecosystem. Instant print dispatch, attendance guardrails, anonymous whisper walls, and CGPA forecasting.
          </Text>
        </View>

        {/* Exclusive Google Authentication Card */}
        <GlassCard style={styles.authCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="google" size={24} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Student Authentication</Text>
          </View>

          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            Sign in using your Google account to access all campus tools securely with verified university access.
          </Text>

          {/* Primary "Sign in with Google" Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            style={[styles.googleButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <View style={styles.googleContentRow}>
                <View style={styles.googleIconCircle}>
                  <AntDesign name="google" size={18} color="#0B132B" />
                </View>
                <Text style={[styles.googleButtonText, { color: colors.primaryForeground }]}>Sign in with Google</Text>
              </View>
            )}
          </TouchableOpacity>
        </GlassCard>

        {/* Security Footnote */}
        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
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
    backgroundColor: "rgba(20, 184, 166, 0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(20, 184, 166, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
    marginBottom: 14,
  },
  logoImg: {
    width: 44,
    height: 44,
  },
  brandBadgeRow: {
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13.5,
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
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  googleButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
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
    letterSpacing: -0.2,
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
    fontWeight: "500",
  },
});
