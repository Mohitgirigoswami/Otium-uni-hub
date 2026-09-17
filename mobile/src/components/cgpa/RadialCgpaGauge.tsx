import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { Badge } from "../ui/Badge";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RadialCgpaGaugeProps {
  gpa: number;
  title?: string;
  subtitle?: string;
}

export function RadialCgpaGauge({
  gpa,
  title = "Academic Standing",
  subtitle,
}: RadialCgpaGaugeProps) {
  const { colors } = useTheme();
  const clampedGpa = Math.min(Math.max(gpa || 0, 0), 10);

  // SVG Geometry
  const size = 150;
  const strokeWidth = 10;
  const center = size / 2;
  const radius = center - strokeWidth - 4;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270 degrees sweep

  // Target dash offset
  const targetOffset = arcLength - (clampedGpa / 10) * arcLength;
  const animatedOffset = useRef(new Animated.Value(arcLength)).current;

  useEffect(() => {
    Animated.spring(animatedOffset, {
      toValue: targetOffset,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [targetOffset, animatedOffset]);

  // Honors tier determination
  let tier = "Pass Standing";
  let tierVariant: "success" | "primary" | "default" | "destructive" = "default";
  let tierIcon = "ribbon-outline";

  if (clampedGpa >= 8.5) {
    tier = "First Class with Distinction";
    tierVariant = "success";
    tierIcon = "sparkles";
  } else if (clampedGpa >= 7.5) {
    tier = "First Class Honours";
    tierVariant = "primary";
    tierIcon = "school";
  } else if (clampedGpa >= 6.5) {
    tier = "First Class";
    tierVariant = "default";
    tierIcon = "trending-up";
  } else if (clampedGpa < 5.0 && clampedGpa > 0) {
    tier = "Remedial / Warning";
    tierVariant = "destructive";
    tierIcon = "alert-circle";
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Header with Title & Tier Badge */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          {title}
        </Text>
        <Badge
          variant={tierVariant}
          size="sm"
          icon={
            <Ionicons
              name={tierIcon as any}
              size={11}
              color={
                tierVariant === "primary"
                  ? colors.primaryForeground
                  : tierVariant === "success"
                  ? colors.success
                  : tierVariant === "destructive"
                  ? colors.destructive
                  : colors.text
              }
            />
          }
        >
          {tier}
        </Badge>
      </View>

      {/* SVG Circular Arc */}
      <View style={styles.dialContainer}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.5" />
              <Stop offset="100%" stopColor={colors.primary} stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Background Track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.secondary}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(135 ${center} ${center})`}
          />

          {/* Animated Active Arc */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={targetOffset}
            strokeLinecap="round"
            transform={`rotate(135 ${center} ${center})`}
          />
        </Svg>

        {/* Dial Center Score */}
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreValue, { color: colors.text }]}>
            {clampedGpa.toFixed(2)}
          </Text>
          <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>
            OUT OF 10.0
          </Text>
        </View>
      </View>

      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dialContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  scoreContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1,
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: -2,
  },
  subtitle: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
});
