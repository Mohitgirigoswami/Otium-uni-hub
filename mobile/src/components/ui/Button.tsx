import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { Spinner } from "./Spinner";

export type ButtonVariant = "default" | "secondary" | "outline" | "destructive" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  title?: string;
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  title,
  children,
  variant = "default",
  size = "md",
  isLoading = false,
  disabled = false,
  icon,
  leftIcon,
  rightIcon,
  onPress,
  style,
  textStyle,
}: ButtonProps) {
  const effectiveLeftIcon = icon || leftIcon;
  const { colors } = useTheme();

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case "secondary":
        return {
          container: {
            backgroundColor: colors.secondary,
            borderColor: colors.border,
            borderWidth: 1,
          },
          text: {
            color: colors.secondaryForeground,
          },
        };
      case "outline":
        return {
          container: {
            backgroundColor: "transparent",
            borderColor: colors.border,
            borderWidth: 1,
          },
          text: {
            color: colors.text,
          },
        };
      case "destructive":
        return {
          container: {
            backgroundColor: colors.destructive,
            borderColor: "transparent",
          },
          text: {
            color: colors.destructiveForeground,
          },
        };
      case "ghost":
        return {
          container: {
            backgroundColor: "transparent",
            borderColor: "transparent",
          },
          text: {
            color: colors.text,
          },
        };
      case "default":
      default:
        return {
          container: {
            backgroundColor: colors.primary,
            borderColor: "transparent",
          },
          text: {
            color: colors.primaryForeground,
          },
        };
    }
  };

  const getSizeStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case "sm":
        return {
          container: { height: 34, paddingHorizontal: 12, borderRadius: 8 },
          text: { fontSize: 12, fontWeight: "600" },
        };
      case "lg":
        return {
          container: { height: 50, paddingHorizontal: 22, borderRadius: 12 },
          text: { fontSize: 16, fontWeight: "700" },
        };
      case "md":
      default:
        return {
          container: { height: 44, paddingHorizontal: 16, borderRadius: 10 },
          text: { fontSize: 14, fontWeight: "600" },
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.78}
      style={[
        styles.baseButton,
        sizeStyles.container,
        variantStyles.container,
        isDisabled && styles.disabledButton,
        style,
      ]}
    >
      {isLoading ? (
        <Spinner
          variant="orbit"
          size="xs"
          color={variantStyles.text.color as string}
          style={{ marginRight: 6 }}
        />
      ) : effectiveLeftIcon ? (
        <View style={styles.iconContainer}>{effectiveLeftIcon}</View>
      ) : null}

      {title ? (
        <Text
          style={[
            styles.baseText,
            sizeStyles.text,
            variantStyles.text,
            textStyle,
          ]}
        >
          {title}
        </Text>
      ) : (
        children
      )}

      {!isLoading && rightIcon ? (
        <View style={[styles.iconContainer, { marginLeft: 6, marginRight: 0 }]}>
          {rightIcon}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  baseText: {
    letterSpacing: -0.2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  iconContainer: {
    marginRight: 6,
    alignItems: "center",
    justifyContent: "center",
  },
});
