import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from "react-native";
import { useTheme } from "../../context/ThemeContext";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "destructive"
  | "primary";

export type BadgeSize = "sm" | "md";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Badge({
  children,
  variant = "default",
  size = "md",
  icon,
  style,
  textStyle,
}: BadgeProps) {
  const { colors } = useTheme();

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case "primary":
        return {
          container: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
          },
          text: {
            color: colors.primaryForeground,
            fontWeight: "700",
          },
        };
      case "secondary":
        return {
          container: {
            backgroundColor: colors.secondary,
            borderColor: colors.border,
          },
          text: {
            color: colors.textSecondary,
            fontWeight: "600",
          },
        };
      case "outline":
        return {
          container: {
            backgroundColor: "transparent",
            borderColor: colors.border,
          },
          text: {
            color: colors.text,
          },
        };
      case "success":
        return {
          container: {
            backgroundColor: colors.success + "18", // 10% opacity hex
            borderColor: colors.success + "40",
          },
          text: {
            color: colors.success,
            fontWeight: "600",
          },
        };
      case "warning":
        return {
          container: {
            backgroundColor: colors.warning + "18",
            borderColor: colors.warning + "40",
          },
          text: {
            color: colors.warning,
            fontWeight: "600",
          },
        };
      case "destructive":
        return {
          container: {
            backgroundColor: colors.destructive + "18",
            borderColor: colors.destructive + "40",
          },
          text: {
            color: colors.destructive,
            fontWeight: "600",
          },
        };
      case "default":
      default:
        return {
          container: {
            backgroundColor: colors.secondary,
            borderColor: colors.border,
          },
          text: {
            color: colors.text,
          },
        };
    }
  };


  const isSmall = size === "sm";

  const sizeContainerStyle: ViewStyle = {
    paddingHorizontal: isSmall ? 7 : 10,
    paddingVertical: isSmall ? 2 : 4,
    borderRadius: isSmall ? 6 : 8,
  };

  const sizeTextStyle: TextStyle = {
    fontSize: isSmall ? 10 : 12,
  };

  const variantStyles = getVariantStyles();

  return (
    <View
      style={[
        styles.baseContainer,
        sizeContainerStyle,
        variantStyles.container,
        style,
      ]}
    >
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      {typeof children === "string" ? (
        <Text
          style={[
            styles.baseText,
            sizeTextStyle,
            variantStyles.text,
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  baseContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  baseText: {
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  iconContainer: {
    marginRight: 4,
  },
});
