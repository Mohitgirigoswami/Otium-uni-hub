import React from "react";
import { View, StyleSheet, ViewStyle, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/ThemeContext";

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
  const { theme, isDark } = useTheme();

  const dynamicBase = {
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    shadowOpacity: isDark ? 0.25 : 0.06,
    shadowColor: isDark ? "#000" : "#0F172A",
  };

  const dynamicVariants = {
    default: {
      borderColor: theme.cardBorder,
    },
    brand: {
      borderColor: theme.cardBorderHighlight,
      backgroundColor: theme.emerald.bg,
    },
    danger: {
      borderColor: theme.rose.border,
      backgroundColor: theme.rose.bg,
    },
    warning: {
      borderColor: theme.amber.border,
      backgroundColor: theme.amber.bg,
    },
    purple: {
      borderColor: theme.purple.border,
      backgroundColor: theme.purple.bg,
    },
  }[variant];

  if (interactive && onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[styles.card, dynamicBase, dynamicVariants, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, dynamicBase, dynamicVariants, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
});

