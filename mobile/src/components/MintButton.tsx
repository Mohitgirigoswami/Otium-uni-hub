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
import { colors } from "../theme/colors";

interface ButtonProps {
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

export function MintButton(props: ButtonProps) {
  return <Button variant="mint" {...props} />;
}

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
      activeOpacity={0.85}
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
          color={variant === "outline" ? colors.brand[400] : "#FFFFFF"}
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
    borderRadius: 14,
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
  // Variant styles
  btnBrand: {
    backgroundColor: colors.brand[600],
    shadowColor: colors.brand[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  textBrand: {
    color: "#FFFFFF",
  },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  textOutline: {
    color: colors.slate[200],
  },
  btnDanger: {
    backgroundColor: colors.rose[600],
    shadowColor: colors.rose[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  textDanger: {
    color: "#FFFFFF",
  },
  btnPurple: {
    backgroundColor: colors.purple[600],
    shadowColor: colors.purple[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  textPurple: {
    color: "#FFFFFF",
  },
  btnSubtle: {
    backgroundColor: colors.slate[800],
  },
  textSubtle: {
    color: colors.slate[300],
  },
  // Sizes
  sizeSm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  textSizeSm: {
    fontSize: 12,
  },
  sizeMd: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  textSizeMd: {
    fontSize: 14,
  },
  sizeLg: {
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  textSizeLg: {
    fontSize: 16,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.45,
  },
});
