import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  StatusBar,
  ActivityIndicator,
  Text,
  Alert,
  TouchableOpacity,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { enableScreens } from "react-native-screens";
import * as SecureStore from "expo-secure-store";
import { TabNavigator } from "./src/navigation/TabNavigator";
import { Header } from "./src/components/Header";
import { LoginScreen } from "./src/screens/LoginScreen";
import { colors } from "./src/theme/colors";
import { apiClient } from "./src/services/apiClient";

// Prevent Android FragmentManager IllegalStateException crashes when unmounting/remounting screens
enableScreens(false);

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = async () => {
    try {
      await SecureStore.deleteItemAsync("jwt");
    } catch {}
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <StatusBar barStyle="light-content" backgroundColor={colors.background} />
          <View style={styles.errorBadge}>
            <Text style={styles.logoLetter}>!</Text>
          </View>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || "An unexpected error occurred."}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={this.handleReset}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Restart & Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Check SecureStore on app boot
  useEffect(() => {
    async function checkExistingAuth() {
      try {
        let token: string | null = null;
        try {
          token = await SecureStore.getItemAsync("jwt");
        } catch (storageErr) {
          console.warn("SecureStore unavailable on web/test:", storageErr);
        }

        if (token) {
          apiClient.setAuthToken(token);

          // Verify token against backend
          const res = await apiClient.get("/auth/me");
          if (res.success && res.data?.user) {
            setCurrentUser(res.data.user);
          } else {
            // Token invalid or expired
            try {
              await SecureStore.deleteItemAsync("jwt");
            } catch {}
            apiClient.clearAuthToken();
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error("Auth boot check failed:", err);
      } finally {
        setIsLoading(false);
      }
    }

    checkExistingAuth();
  }, []);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
  };

  const handleSignOut = () => {
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
            setCurrentUser(null);
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.logoBadge}>
          <Text style={styles.logoLetter}>O</Text>
        </View>
        <ActivityIndicator size="large" color={colors.brand[400]} style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Initializing campus connection...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
          <StatusBar barStyle="light-content" backgroundColor={colors.background} />

          <NavigationContainer>
            {currentUser ? (
              <View style={styles.mainContainer}>
                <Header
                  title="Otium"
                  badge="Campus Hub"
                  campusName={currentUser.college?.name || "DTU Campus"}
                  onNotificationPress={handleSignOut}
                />
                <TabNavigator />
              </View>
            ) : (
              <LoginScreen onLoginSuccess={handleLoginSuccess} />
            )}
          </NavigationContainer>
        </SafeAreaView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.rose[500],
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.rose[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 18,
  },
  errorMessage: {
    fontSize: 13,
    color: colors.slate[400],
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: colors.brand[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#0B132B",
    fontWeight: "700",
    fontSize: 14,
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
  },
  logoLetter: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  loadingText: {
    fontSize: 13,
    color: colors.slate[400],
    fontWeight: "600",
    marginTop: 12,
  },
});

