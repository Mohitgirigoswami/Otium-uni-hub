import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  StyleProp,
  TextStyle,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.card,
            borderColor: error
              ? colors.destructive
              : isFocused
              ? colors.primary
              : colors.border,
          },
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}

        <TextInput
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            { color: colors.text },
            inputStyle,
          ]}
          {...props}
        />

        {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          {error}
        </Text>
      ) : helperText ? (
        <Text style={[styles.helperText, { color: colors.textMuted }]}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  errorText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: "500",
  },
  helperText: {
    fontSize: 11,
    marginTop: 4,
  },
});
