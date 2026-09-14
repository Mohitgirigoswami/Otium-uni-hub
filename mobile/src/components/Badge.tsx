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
    borderRadius: 8,
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
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  textSizeSm: {
    fontSize: 10.5,
  },
  sizeMd: {
    paddingHorizontal: 10,
    paddingVertical: 3.5,
  },
  textSizeMd: {
    fontSize: 11.5,
  },
  // Monochrome Variants
  variantBrand: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  textBrand: {
    color: "#FFFFFF",
  },
  variantNeutral: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  textNeutral: {
    color: colors.slate[400],
  },
  variantDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  textDanger: {
    color: "#f87171",
  },
  variantWarning: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  textWarning: {
    color: "#fbbf24",
  },
  variantSuccess: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  textSuccess: {
    color: "#FFFFFF",
  },
  variantPurple: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  textPurple: {
    color: colors.slate[200],
  },
});
