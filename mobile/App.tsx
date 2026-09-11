import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  StatusBar,
  ActivityIndicator,
  Text,
  Alert,
  TouchableOpacity,
  Image,
  Animated,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { enableScreens } from "react-native-screens";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TabNavigator } from "./src/navigation/TabNavigator";
import { Header } from "./src/components/Header";
import { LoginScreen } from "./src/screens/LoginScreen";
import { NotificationsModal } from "./src/components/NotificationsModal";
import { UserProvider, STORAGE_KEYS } from "./src/context/UserContext";
import { colors, ThemeProvider, useTheme } from "./src/theme/colors";
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
          <Image
            source={require("./assets/logo.png")}
            style={styles.errorLogo}
            resizeMode="contain"
          />
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

function MainApp() {
  const { theme, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Check SecureStore & Local Cache on app boot
  useEffect(() => {
    async function checkExistingAuth() {
      try {
        let token: string | null = null;
        try {
          token = await SecureStore.getItemAsync("jwt");
        } catch (storageErr) {
          console.warn("SecureStore unavailable on web/test:", storageErr);
        }

        // 1. Immediately restore cached user from AsyncStorage (works 100% offline!)
        let localUser: any = null;
        try {
          const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_USER);
          if (storedUser) {
            localUser = JSON.parse(storedUser);
            setCurrentUser(localUser);
          }
        } catch (e) {
          console.log("Could not load local cached user:", e);
        }

        if (token) {
          apiClient.setAuthToken(token);

          // 2. Verify token against backend non-destructively
          try {
            const res = await apiClient.get("/auth/me");
            if (res.success && res.data?.user) {
              setCurrentUser(res.data.user);
              AsyncStorage.setItem(
                STORAGE_KEYS.CACHED_USER,
                JSON.stringify(res.data.user)
              ).catch(() => {});
            } else if (res.status === 401) {
              // ONLY clear session if server explicitly returned 401 Unauthorized
              try {
                await SecureStore.deleteItemAsync("jwt");
                await AsyncStorage.removeItem(STORAGE_KEYS.CACHED_USER);
              } catch {}
              apiClient.clearAuthToken();
              setCurrentUser(null);
            }
          } catch (netErr) {
            // Bad network / offline: NEVER log out user! Keep local cached session active.
            console.log("Network unreachable during auth check, preserving local offline session");
          }
        } else if (!localUser) {
          setCurrentUser(null);
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
    AsyncStorage.setItem(STORAGE_KEYS.CACHED_USER, JSON.stringify(user)).catch(() => {});
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
        <View style={styles.splashLogoWrap}>
          <Animated.Image
            source={require("./assets/logo.png")}
            style={[styles.splashLogo, { transform: [{ scale: pulseAnim }] }]}
            resizeMode="contain"
          />
        </View>
        <ActivityIndicator size="small" color={theme.brand[500]} style={{ marginTop: 24 }} />
        <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Welcome to Otium • Syncing Campus Hub...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      <NavigationContainer>
        {currentUser ? (
          <UserProvider initialUser={currentUser} onLogout={() => setCurrentUser(null)}>
            <View style={styles.mainContainer}>
              <Header
                title="Otium"
                badge="Campus Hub"
                campusName={currentUser.college?.name || "Campus Hub"}
                onNotificationPress={() => setIsNotificationsOpen(true)}
              />
              <TabNavigator />
              <NotificationsModal
                visible={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                campusName={currentUser.college?.name || "Campus Hub"}
              />
            </View>
          </UserProvider>
        ) : (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        )}
      </NavigationContainer>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <MainApp />
        </ThemeProvider>
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
  splashLogoWrap: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: "rgba(20, 184, 166, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(20, 184, 166, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  splashLogo: {
    width: 60,
    height: 60,
  },
  errorLogo: {
    width: 64,
    height: 64,
    marginBottom: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 8,
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
  loadingText: {
    fontSize: 12.5,
    color: colors.slate[300],
    fontWeight: "600",
    marginTop: 14,
  },
});
