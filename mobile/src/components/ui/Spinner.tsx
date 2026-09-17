import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import Svg, { Circle, Path, G } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";

export type MobileSpinnerVariant = "orbit" | "radar" | "classic";
export type MobileSpinnerSize = "xs" | "sm" | "md" | "lg";

export interface MobileSpinnerProps {
  variant?: MobileSpinnerVariant;
  size?: MobileSpinnerSize;
  color?: string;
  style?: any;
}

const SIZE_CONFIG: Record<MobileSpinnerSize, { dim: number; stroke: number }> = {
  xs: { dim: 16, stroke: 2 },
  sm: { dim: 20, stroke: 2.2 },
  md: { dim: 26, stroke: 2.5 },
  lg: { dim: 38, stroke: 3 },
};

export function Spinner({
  variant = "orbit",
  size = "md",
  color,
  style,
}: MobileSpinnerProps) {
  const { colors } = useTheme();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const reverseSpinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  const { dim, stroke } = SIZE_CONFIG[size];
  const activeColor = color || colors.primary;

  useEffect(() => {
    const forwardLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const reverseLoop = Animated.loop(
      Animated.timing(reverseSpinAnim, {
        toValue: 1,
        duration: 1300,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    forwardLoop.start();
    reverseLoop.start();
    pulseLoop.start();

    return () => {
      forwardLoop.stop();
      reverseLoop.stop();
      pulseLoop.stop();
    };
  }, [spinAnim, reverseSpinAnim, pulseAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const reverseSpin = reverseSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["360deg", "0deg"],
  });

  if (variant === "orbit") {
    return (
      <View style={[{ width: dim, height: dim, alignItems: "center", justifyContent: "center" }, style]}>
        {/* Outer Ring */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ rotate: spin }] },
          ]}
        >
          <Svg width={dim} height={dim} viewBox="0 0 50 50">
            <Circle
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke={activeColor}
              strokeWidth={stroke * 1.5}
              strokeDasharray="45, 60"
              strokeLinecap="round"
              opacity={0.8}
            />
          </Svg>
        </Animated.View>

        {/* Inner Counter-Rotating Ring */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ rotate: reverseSpin }] },
          ]}
        >
          <Svg width={dim} height={dim} viewBox="0 0 50 50">
            <Circle
              cx="25"
              cy="25"
              r="12"
              fill="none"
              stroke={activeColor}
              strokeWidth={stroke * 1.2}
              strokeDasharray="25, 35"
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>
      </View>
    );
  }

  if (variant === "radar") {
    return (
      <Animated.View
        style={[
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            borderWidth: stroke,
            borderColor: activeColor,
            alignItems: "center",
            justifyContent: "center",
            opacity: pulseAnim,
          },
          style,
        ]}
      >
        <View
          style={{
            width: dim * 0.35,
            height: dim * 0.35,
            borderRadius: (dim * 0.35) / 2,
            backgroundColor: activeColor,
          }}
        />
      </Animated.View>
    );
  }

  // Classic Spinner
  return (
    <Animated.View
      style={[
        {
          width: dim,
          height: dim,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ rotate: spin }],
        },
        style,
      ]}
    >
      <Svg width={dim} height={dim} viewBox="0 0 24 24">
        <Circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke={activeColor}
          strokeWidth={stroke}
          opacity={0.2}
        />
        <Path
          fill="none"
          stroke={activeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          d="M12 2a10 10 0 0 1 10 10"
        />
      </Svg>
    </Animated.View>
  );
}
