import React from "react";
import { View, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "../../context/ThemeContext";

export interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "outline" | "secondary";
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  activeOpacity?: number;
}

export function Card({
  children,
  variant = "default",
  style,
  onPress,
  activeOpacity = 0.75,
}: CardProps) {
  const { colors, isDark } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case "secondary":
        return colors.cardSecondary;
      case "outline":
        return "transparent";
      case "default":
      default:
        return colors.card;
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    // Subtle shadow on iOS & elevation on Android
    shadowColor: isDark ? colors.glow : "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={activeOpacity}
        style={[cardStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}
