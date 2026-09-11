import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { colors, useTheme } from "../theme/colors";

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  subtitle?: string;
}

export function CircularProgress({
  percentage,
  size = 180,
  strokeWidth = 14,
  subtitle = "Overall Attendance",
}: CircularProgressProps) {
  const { theme, isDark } = useTheme();
  const isSafe = percentage >= 75;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (circumference * clampedPercentage) / 100;

  const gradientStart = isSafe ? "#10B981" : "#EF4444";
  const gradientEnd = isSafe ? "#00FFC6" : "#F59E0B";
  const textColor = isSafe ? colors.emerald[400] : colors.rose[400];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradientStart} />
            <Stop offset="100%" stopColor={gradientEnd} />
          </LinearGradient>
        </Defs>

        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(100, 116, 139, 0.12)"}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Animated Active Progress Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Center Percentage & Status Readout */}
      <View style={styles.centerContent}>
        <Text style={[styles.percentageText, { color: textColor }]}>
          {percentage.toFixed(0)}%
        </Text>
        <Text style={[styles.subtitleText, { color: theme.text.secondary }]}>{subtitle}</Text>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isSafe ? colors.emerald.bg : colors.rose.bg,
              borderColor: isSafe ? colors.emerald.border : colors.rose.border,
            },
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              { color: isSafe ? colors.emerald[400] : colors.rose[400] },
            ]}
          >
            {isSafe ? "✓ Safe (>75%)" : "⚠️ Risk (<75%)"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  centerContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  percentageText: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.slate[400],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
