import React from "react";
import { View, StyleSheet, ViewStyle, TouchableOpacity } from "react-native";
import { colors } from "../theme/colors";

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
  const variantStyles = {
    default: styles.variantDefault,
    brand: styles.variantBrand,
    danger: styles.variantDanger,
    warning: styles.variantWarning,
    purple: styles.variantPurple,
  }[variant];

  if (interactive && onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[styles.card, variantStyles, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, variantStyles, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  variantDefault: {
    borderColor: colors.cardBorder,
  },
  variantBrand: {
    borderColor: "rgba(255, 255, 255, 0.25)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  variantDanger: {
    borderColor: colors.rose.border,
    backgroundColor: colors.rose.bg,
  },
  variantWarning: {
    borderColor: colors.amber.border,
    backgroundColor: colors.amber.bg,
  },
  variantPurple: {
    borderColor: colors.purple.border,
    backgroundColor: colors.purple.bg,
  },
});
