import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { colors } from "../theme/colors";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "brand" | "neutral" | "danger" | "warning" | "success" | "purple";
  size?: "sm" | "md";
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
}

export function Badge({
  children,
  variant = "brand",
  size = "md",
  style,
  textStyle,
}: BadgeProps) {
  const variantStyles = {
    brand: styles.variantBrand,
    neutral: styles.variantNeutral,
    danger: styles.variantDanger,
    warning: styles.variantWarning,
    success: styles.variantSuccess,
    purple: styles.variantPurple,
  }[variant];

  const textVariantStyles = {
    brand: styles.textBrand,
    neutral: styles.textNeutral,
    danger: styles.textDanger,
    warning: styles.textWarning,
    success: styles.textSuccess,
    purple: styles.textPurple,
  }[variant];

  const sizeContainer = size === "sm" ? styles.sizeSm : styles.sizeMd;
  const sizeText = size === "sm" ? styles.textSizeSm : styles.textSizeMd;

  return (
    <View style={[styles.badgeBase, variantStyles, sizeContainer, style]}>
      {typeof children === "string" ? (
        <Text style={[styles.textBase, textVariantStyles, sizeText, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badgeBase: {
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  textBase: {
    fontWeight: "700",
  },
  // Sizes
  sizeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  textSizeSm: {
    fontSize: 10.5,
  },
  sizeMd: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  textSizeMd: {
    fontSize: 12,
  },
  // Variants (1:1 Web Badge translation)
  variantBrand: {
    backgroundColor: "rgba(20, 184, 166, 0.15)",
    borderColor: "rgba(20, 184, 166, 0.35)",
  },
  textBrand: {
    color: colors.brand[400],
  },
  variantNeutral: {
    backgroundColor: "rgba(100, 116, 139, 0.15)",
    borderColor: "rgba(100, 116, 139, 0.25)",
  },
  textNeutral: {
    color: colors.slate[300],
  },
  variantDanger: {
    backgroundColor: colors.rose.bg,
    borderColor: colors.rose.border,
  },
  textDanger: {
    color: colors.rose[400],
  },
  variantWarning: {
    backgroundColor: colors.amber.bg,
    borderColor: colors.amber.border,
  },
  textWarning: {
    color: colors.amber[400],
  },
  variantSuccess: {
    backgroundColor: colors.emerald.bg,
    borderColor: colors.emerald.border,
  },
  textSuccess: {
    color: colors.emerald[400],
  },
  variantPurple: {
    backgroundColor: colors.purple.bg,
    borderColor: colors.purple.border,
  },
  textPurple: {
    color: colors.purple[400],
  },
});
