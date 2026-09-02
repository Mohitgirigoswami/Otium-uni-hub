import React, { useState } from "react";
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
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { Ionicons, Feather, FontAwesome5 } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { GlassCard } from "../components/GlassCard";
import { Badge } from "../components/Badge";
import { Button } from "../components/MintButton";
import { apiClient } from "../services/apiClient";

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

const DEMO_ACCOUNTS = [
  { label: "DTU Student", email: "student@dtu.ac.in" },
  { label: "Super Admin", email: "admin@dtu.ac.in" },
];

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState("student@dtu.ac.in");
  const [password, setPassword] = useState("password123");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert("Input Required", "Please enter your university email address.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiClient.post("/auth/login", {
        email: email.trim(),
        password,
      });

      setIsLoading(false);

      if (res.success && res.data?.token) {
        const token = res.data.token;
        const user = res.data.user;

        // 1. Save JWT to device SecureStore
        try {
          await SecureStore.setItemAsync("jwt", token);
        } catch (storageErr) {
          console.warn("SecureStore unavailable in this environment, using memory:", storageErr);
        }

        // 2. Set token in centralized apiClient
        apiClient.setAuthToken(token);

        // 3. Trigger app-level state change
        onLoginSuccess(user);
      } else {
        Alert.alert("Login Failed", res.error || "Invalid university credentials.");
      }
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert("Network Error", error?.message || "Could not connect to authentication server.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Logo & Hero */}
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
            One unified login for your campus printing, attendance guardrails, whisper walls, and CGPA calculations.
          </Text>
        </View>

        {/* Credentials Form Card */}
        <GlassCard style={styles.formCard}>
          <Text style={styles.formTitle}>Student Sign In</Text>

          {/* Email Input */}
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
                placeholder="e.g. 2k21/se/042@dtu.ac.in"
                placeholderTextColor={colors.slate[500]}
                style={styles.textInput}
              />
            </View>
          </View>

          {/* Password Input */}
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

          {/* Demo Quick Presets */}
          <View style={styles.presetsRow}>
            <Text style={styles.presetsLabel}>Quick Test:</Text>
            {DEMO_ACCOUNTS.map((acc) => (
              <TouchableOpacity
                key={acc.email}
                onPress={() => {
                  setEmail(acc.email);
                  setPassword("password123");
                }}
                style={styles.presetChip}
              >
                <Text style={styles.presetChipText}>{acc.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sign In CTA */}
          <Button
            variant="brand"
            size="lg"
            title="Authenticate & Enter Hub"
            loading={isLoading}
            onPress={handleLogin}
            rightIcon={<Feather name="arrow-right" size={18} color="#FFFFFF" />}
            style={styles.submitBtn}
          />
        </GlassCard>

        {/* Footer Security Pill */}
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
    paddingTop: 40,
    paddingBottom: 40,
    justifyContent: "center",
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
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
    fontSize: 32,
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
    gap: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
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
