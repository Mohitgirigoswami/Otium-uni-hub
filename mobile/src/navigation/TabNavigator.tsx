import React from "react";
import { StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

import { PrintStationScreen } from "../screens/PrintStationScreen";
import { AttendanceScreen } from "../screens/AttendanceScreen";
import { WhisperWallScreen } from "../screens/WhisperWallScreen";
import { CgpaPredictorScreen } from "../screens/CgpaPredictorScreen";

export type RootTabParamList = {
  Print: undefined;
  Attendance: undefined;
  Whispers: undefined;
  CGPA: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Print"
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.brand[400],
        tabBarInactiveTintColor: colors.slate[500],
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tab.Screen
        name="Print"
        component={PrintStationScreen}
        options={{
          tabBarLabel: "Print",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Feather name="printer" size={20} color={color} />
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
                size={20}
                color={color}
              />
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
                size={20}
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
                size={21}
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
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  tabItem: {
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginTop: 2,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 28,
  },
  iconContainerActive: {
    transform: [{ scale: 1.08 }],
  },
});
