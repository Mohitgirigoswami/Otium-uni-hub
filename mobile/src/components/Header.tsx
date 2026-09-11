import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { Badge } from "./Badge";

interface HeaderProps {
  title?: string;
  badge?: string;
  campusName?: string;
  onNotificationPress?: () => void;
}

export function Header({
  title = "Otium",
  badge = "Campus Hub",
  campusName = "DTU Campus",
  onNotificationPress,
}: HeaderProps) {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: theme.surface,
          borderBottomColor: theme.cardBorder,
        },
      ]}
    >
      <View style={styles.leftSection}>
        <View style={styles.titleRow}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[styles.brandTitle, { color: theme.text.primary }]}>Otium</Text>
          <Badge variant="brand" size="sm" style={styles.badge}>
            {badge}
          </Badge>
        </View>
        <View style={styles.campusRow}>
          <View style={[styles.activeDot, { backgroundColor: isDark ? theme.brand[400] : theme.brand[600] }]} />
          <Text style={[styles.campusText, { color: theme.text.secondary }]}>{campusName}</Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onNotificationPress}
        style={[
          styles.iconButton,
          {
            backgroundColor: isDark ? theme.surface : theme.backgroundSecondary,
            borderColor: theme.cardBorder,
          },
        ]}
      >
        <Ionicons
          name="notifications-outline"
          size={20}
          color={isDark ? theme.slate[200] : theme.slate[700]}
        />
        <View style={[styles.notificationDot, { backgroundColor: isDark ? theme.brand[400] : theme.brand[600] }]} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  leftSection: {
    flexDirection: "column",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  logoImage: {
    width: 24,
    height: 24,
  },
  brandTitle: {
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  badge: {
    marginLeft: 4,
  },
  campusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  campusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});

