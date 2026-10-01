import React from "react";
import { View, StyleSheet, ViewStyle, TouchableOpacity } from "react-native";
import { useTheme } from "../context/ThemeContext";

interface GlassCardProps {
  children: React.ReactNode;
  variant?: "default" | "brand" | "danger" | "warning" | "purple";
  interactive?: boolean;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
}

export function GlassCard({
  children,
  variant = "default",
  interactive = false,
  onPress,
  style,
}: GlassCardProps) {
  const { colors } = useTheme();

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "brand":
        return {
          borderColor: colors.primary + "40",
          backgroundColor: colors.primary + "0A",
        };
      case "danger":
        return {
          borderColor: colors.destructive + "40",
          backgroundColor: colors.destructive + "14",
        };
      case "warning":
        return {
          borderColor: colors.warning + "40",
          backgroundColor: colors.warning + "14",
        };
      case "purple":
        return {
          borderColor: colors.secondary + "40",
          backgroundColor: colors.secondary + "14",
        };
      case "default":
      default:
        return {
          borderColor: colors.border,
          backgroundColor: colors.card,
        };
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  };

  if (interactive && onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[cardStyle, getVariantStyle(), style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyle, getVariantStyle(), style]}>{children}</View>;
}
