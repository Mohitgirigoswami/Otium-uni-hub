import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from "react-native";
import { colors } from "../../theme/colors";

export interface ButtonProps {
  title?: string;
  children?: React.ReactNode;
  onPress: () => void;
  variant?: "brand" | "mint" | "outline" | "danger" | "subtle" | "purple";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
}

export function GradientActionButton(props: ButtonProps) {
  return <Button variant="brand" {...props} />;
}

export const MintButton = GradientActionButton;

export function Button({
  title,
  children,
  onPress,
  variant = "brand",
  size = "md",
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
}: ButtonProps) {
  const isInteractive = !loading && !disabled;

  const getVariantContainerStyle = () => {
    switch (variant) {
      case "mint":
      case "brand":
        return styles.btnBrand;
      case "outline":
        return styles.btnOutline;
      case "danger":
        return styles.btnDanger;
      case "purple":
        return styles.btnPurple;
      case "subtle":
        return styles.btnSubtle;
      default:
        return styles.btnBrand;
    }
  };

  const getVariantTextStyle = () => {
    switch (variant) {
      case "mint":
      case "brand":
        return styles.textBrand;
      case "outline":
        return styles.textOutline;
      case "danger":
        return styles.textDanger;
      case "purple":
        return styles.textPurple;
      case "subtle":
        return styles.textSubtle;
      default:
        return styles.textBrand;
    }
  };

  const getSizeContainerStyle = () => {
    switch (size) {
      case "sm":
        return styles.sizeSm;
      case "lg":
        return styles.sizeLg;
      case "md":
      default:
        return styles.sizeMd;
    }
  };

  const getSizeTextStyle = () => {
    switch (size) {
      case "sm":
        return styles.textSizeSm;
      case "lg":
        return styles.textSizeLg;
      case "md":
      default:
        return styles.textSizeMd;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={!isInteractive}
      style={[
        styles.base,
        getVariantContainerStyle(),
        getSizeContainerStyle(),
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "brand" || variant === "mint" ? "#000000" : "#FFFFFF"}
        />
      ) : (
        <View style={styles.contentRow}>
          {leftIcon && <View style={styles.iconMarginLeft}>{leftIcon}</View>}
          {title ? (
            <Text
              style={[
                styles.baseText,
                getVariantTextStyle(),
                getSizeTextStyle(),
                textStyle,
              ]}
            >
              {title}
            </Text>
          ) : (
            children
          )}
          {rightIcon && <View style={styles.iconMarginRight}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  baseText: {
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  iconMarginLeft: {
    marginRight: 8,
  },
  iconMarginRight: {
    marginLeft: 8,
  },
  btnBrand: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  textBrand: {
    color: "#000000",
    fontWeight: "800",
  },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  textOutline: {
    color: "#FFFFFF",
  },
  btnDanger: {
    backgroundColor: "#dc2626",
  },
  textDanger: {
    color: "#FFFFFF",
  },
  btnPurple: {
    backgroundColor: "#27272a",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  textPurple: {
    color: "#FFFFFF",
  },
  btnSubtle: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  textSubtle: {
    color: "#FFFFFF",
  },
  sizeSm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  textSizeSm: {
    fontSize: 12,
  },
  sizeMd: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  textSizeMd: {
    fontSize: 14,
  },
  sizeLg: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  textSizeLg: {
    fontSize: 15,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.4,
  },
});
