import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as SecureStore from "expo-secure-store";
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from "@react-native-google-signin/google-signin";
import { Ionicons, Feather, AntDesign } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { GlassCard } from "../components/GlassCard";
import { Badge } from "../components/Badge";
import { Button } from "../components/MintButton";
import { apiClient } from "../services/apiClient";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  "182612765129-k94groidumjmdmb68s32a534sfqtoe10.apps.googleusercontent.com";

// Configure Native Google Sign-In SDK
try {
  GoogleSignin.configure({
    webClientId: GOOGLE_CLIENT_ID,
    offlineAccess: true,
  });
} catch (e) {
  console.log("GoogleSignin native init skipped in current runtime:", e);
}

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

const DEMO_ACCOUNTS = [
  { label: "DTU Student", email: "student@dtu.ac.in", pass: "password123" },
  { label: "Super Admin", email: "admin@dtu.ac.in", pass: "password123" },
];

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  // Form State
  const [email, setEmail] = useState("student@dtu.ac.in");
  const [password, setPassword] = useState("password123");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isCredentialLoading, setIsCredentialLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Initialize WebBrowser fallback if needed
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || GOOGLE_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || GOOGLE_CLIENT_ID,
  });

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

  // Centralized backend token verification
  const processGoogleBackendAuth = async (authPayload: {
    accessToken?: string;
    idToken?: string;
    email?: string;
    name?: string;
  }) => {
    setIsGoogleLoading(true);

    try {
      const res = await apiClient.post("/auth/google", authPayload);
      setIsGoogleLoading(false);

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
          "Google Sign-In Error",
          res.error || "Could not authenticate with Google server."
        );
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      Alert.alert(
        "Connection Error",
        err?.message || "Could not connect to Otium backend. Please check network."
      );
    }
  };

  // Primary Google Sign-In (Attempts Native Google Play Services First, then Browser)
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);

    // 1. Try Native Google Sign-In SDK (Option 2 - Google Play Services)
    try {
      if (GoogleSignin?.hasPlayServices) {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const userInfo = await GoogleSignin.signIn();
        const idToken = (userInfo as any)?.data?.idToken || (userInfo as any)?.idToken;
        const user = (userInfo as any)?.data?.user || (userInfo as any)?.user;

        if (idToken) {
          await processGoogleBackendAuth({
            idToken,
            email: user?.email,
            name: user?.name,
          });
          return;
        }
      }
    } catch (nativeErr: any) {
      if (isErrorWithCode(nativeErr)) {
        setIsGoogleLoading(false);
        if (nativeErr.code === statusCodes.SIGN_IN_CANCELLED) {
          return;
        }
        if (nativeErr.code === statusCodes.IN_PROGRESS) {
          return;
        }
        if (nativeErr.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert("Google Play Error", "Google Play Services is not available on this device.");
          return;
        }
      }
      console.log("Native Google Sign-In not active in this runtime, trying fallback:", nativeErr?.message);
    }

    // 2. Fallback: Browser prompt
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
      console.warn("Browser OAuth error:", browserErr);
    }

    setIsGoogleLoading(false);
    Alert.alert(
      "Native Google Sign-In Ready",
      "Native Google Sign-In package has been configured for the Android build. In Expo Go, you can sign in with your email/password or use the quick test account below!"
    );
  };

  // Email / Roll No + Password Credential Login (1:1 with Web)
  const handleCredentialLogin = async () => {
    if (!email.trim()) {
      Alert.alert("Input Required", "Please enter your university email address or roll number.");
      return;
    }

    setIsCredentialLoading(true);

    try {
      const res = await apiClient.post("/auth/login", {
        email: email.trim(),
        password,
      });

      setIsCredentialLoading(false);

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
          "Login Failed",
          res.error || "Invalid campus credentials. Please check your details."
        );
      }
    } catch (err: any) {
      setIsCredentialLoading(false);
      Alert.alert(
        "Connection Error",
        err?.message || "Could not connect to authentication server."
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Top Logo & Hero Badge */}
        <View style={styles.heroSection}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoLetter}>O</Text>
          </View>
          <View style={styles.brandBadgeRow}>
            <Badge variant="brand" size="sm">
              Verified University Access
            </Badge>
          </View>
          <Text style={styles.heroTitle}>Welcome to Otium</Text>
          <Text style={styles.heroSubtitle}>
            Sign in with Google or your campus credentials
          </Text>
        </View>

        {/* Login Card */}
        <GlassCard style={styles.formCard}>
          <Text style={styles.formTitle}>Student Sign In</Text>

          {/* 1. Google Sign-In Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading || isCredentialLoading}
            style={styles.googleButton}
          >
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.googleContentRow}>
                <View style={styles.googleIconCircle}>
                  <AntDesign name="google" size={16} color="#0B132B" />
                </View>
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR EMAIL / ROLL NO</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 2. University Email / Roll No Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>University Email / Roll No</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={colors.slate[400]}
                style={styles.inputIcon}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="e.g. student@dtu.ac.in"
                placeholderTextColor={colors.slate[500]}
                style={styles.textInput}
              />
            </View>
          </View>

          {/* 3. Password Input with Show/Hide Eye */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={colors.slate[400]}
                style={styles.inputIcon}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible}
                placeholder="Enter password"
                placeholderTextColor={colors.slate[500]}
                style={styles.textInput}
              />
              <TouchableOpacity
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.slate[400]}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Demo Test Presets */}
          <View style={styles.presetsRow}>
            <Text style={styles.presetsLabel}>Quick Test:</Text>
            {DEMO_ACCOUNTS.map((acc) => (
              <TouchableOpacity
                key={acc.email}
                onPress={() => {
                  setEmail(acc.email);
                  setPassword(acc.pass);
                }}
                style={styles.presetChip}
              >
                <Text style={styles.presetChipText}>{acc.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 4. Submit Credentials Button */}
          <Button
            variant="brand"
            size="lg"
            title="Sign In with Credentials"
            loading={isCredentialLoading}
            onPress={handleCredentialLogin}
            rightIcon={<Feather name="arrow-right" size={18} color="#0B132B" />}
            style={styles.submitBtn}
          />
        </GlassCard>

        {/* Security Footnote */}
        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.brand[400]} />
          <Text style={styles.footerText}>
            Stateless 256-bit JWT authentication across campus nodes
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
    justifyContent: "center",
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.brand[600],
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 12,
  },
  logoLetter: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  brandBadgeRow: {
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.slate[300],
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
    maxWidth: 320,
  },
  formCard: {
    padding: 22,
    gap: 14,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  googleButton: {
    backgroundColor: colors.brand[600],
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 2,
  },
  googleContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  dividerText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.slate[400],
    marginHorizontal: 10,
    letterSpacing: 0.5,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.slate[300],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.slate[900],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 14,
    color: "#FFFFFF",
  },
  eyeBtn: {
    padding: 6,
  },
  presetsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  presetsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate[400],
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(20, 184, 166, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brand[400],
  },
  submitBtn: {
    marginTop: 6,
    width: "100%",
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  footerText: {
    fontSize: 11,
    color: colors.slate[400],
    fontWeight: "500",
  },
});
