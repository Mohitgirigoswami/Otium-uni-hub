import React from "react";
import { StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

import { DashboardScreen } from "../screens/DashboardScreen";
import { PrintStationScreen } from "../screens/PrintStationScreen";
import { AttendanceScreen } from "../screens/AttendanceScreen";
import { WhisperWallScreen } from "../screens/WhisperWallScreen";
import { CgpaPredictorScreen } from "../screens/CgpaPredictorScreen";
import { ProfileScreen } from "../screens/ProfileScreen";

export type RootTabParamList = {
  Dashboard: undefined;
  Attendance: undefined;
  Print: undefined;
  Whispers: undefined;
  CGPA: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 56 + Math.min(insets.bottom, 16),
            paddingBottom: Math.min(insets.bottom, 12) + 4,
          },
        ],
        tabBarActiveTintColor: colors.brand[400],
        tabBarInactiveTintColor: colors.slate[500],
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Hub",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={19}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          tabBarLabel: "Attendance",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Ionicons
                name={focused ? "calendar" : "calendar-outline"}
                size={19}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Print"
        component={PrintStationScreen}
        options={{
          tabBarLabel: "Print",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Feather name="printer" size={18} color={color} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Whispers"
        component={WhisperWallScreen}
        options={{
          tabBarLabel: "Whispers",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Ionicons
                name={focused ? "eye-off" : "eye-off-outline"}
                size={19}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="CGPA"
        component={CgpaPredictorScreen}
        options={{
          tabBarLabel: "CGPA",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <MaterialCommunityIcons
                name={focused ? "calculator-variant" : "calculator-variant-outline"}
                size={20}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={19}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    borderTopWidth: 1,
    paddingTop: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  tabItem: {
    paddingVertical: 1,
  },
  tabLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginTop: 1,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 24,
  },
  iconContainerActive: {
    transform: [{ scale: 1.08 }],
  },
});
