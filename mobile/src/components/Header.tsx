import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { Badge } from "./ui/Badge";

interface HeaderProps {
  title?: string;
  badge?: string;
  campusName?: string;
  onNotificationPress?: () => void;
}

export function Header({
  title = "Otium",
  badge = "Campus Hub",
  campusName = "JCBOSEUST, YMCA",
  onNotificationPress,
}: HeaderProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
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
          <Text style={[styles.brandTitle, { color: colors.text }]}>{title}</Text>
          <Badge variant="primary" size="sm" style={styles.badge}>
            {badge}
          </Badge>
        </View>
        <View style={styles.campusRow}>
          <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.campusText, { color: colors.textSecondary }]}>{campusName}</Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onNotificationPress}
        style={[
          styles.iconButton,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="notifications-outline" size={18} color={colors.text} />
        <View style={[styles.notificationDot, { backgroundColor: colors.primary }]} />
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
    paddingTop: 8,
    paddingBottom: 10,
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
    width: 22,
    height: 22,
  },
  brandTitle: {
    fontSize: 20,
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
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 7,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
