import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
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
  return (
    <View style={styles.headerContainer}>
      <View style={styles.leftSection}>
        <View style={styles.titleRow}>
          <Text style={styles.brandTitle}>Otium</Text>
          <Badge variant="brand" size="sm" style={styles.badge}>
            {badge}
          </Badge>
        </View>
        <View style={styles.campusRow}>
          <View style={styles.activeDot} />
          <Text style={styles.campusText}>{campusName}</Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onNotificationPress}
        style={styles.iconButton}
      >
        <Ionicons name="notifications-outline" size={20} color={colors.slate[200]} />
        <View style={styles.notificationDot} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  leftSection: {
    flexDirection: "column",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
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
    backgroundColor: colors.brand[400],
    marginRight: 6,
  },
  campusText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.slate[400],
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
    backgroundColor: colors.brand[400],
  },
});
