import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  TouchableOpacity,
  LayoutChangeEvent,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";

export interface LiquidSliderPreset {
  label: string;
  value: number;
}

export interface LiquidSliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (val: number) => void;
  unit?: string;
  presets?: LiquidSliderPreset[];
}

export function LiquidSlider({
  min = 50,
  max = 95,
  step = 1,
  value,
  onChange,
  unit = "%",
  presets,
}: LiquidSliderProps) {
  const { colors } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const thumbScale = useRef(new Animated.Value(1)).current;
  const thumbScaleY = useRef(new Animated.Value(1)).current;
  const tooltipOpacity = useRef(new Animated.Value(0.9)).current;

  // Clamp helper
  const clamp = useCallback(
    (v: number) => Math.min(Math.max(v, min), max),
    [min, max]
  );

  const percent = ((clamp(value) - min) / (max - min)) * 100;

  const initialThumbX = useRef(0);

  const handleUpdate = useCallback(
    (xPos: number) => {
      if (trackWidth <= 0) return;
      const ratio = Math.min(Math.max(xPos / trackWidth, 0), 1);
      const raw = min + ratio * (max - min);
      const stepped = Math.round(raw / step) * step;
      onChange(clamp(stepped));
    },
    [trackWidth, min, max, step, clamp, onChange]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        setIsDragging(true);
        Animated.parallel([
          Animated.spring(thumbScale, {
            toValue: 1.25,
            useNativeDriver: true,
          }),
          Animated.spring(thumbScaleY, {
            toValue: 0.85,
            useNativeDriver: true,
          }),
          Animated.timing(tooltipOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();

        const currentThumbX = (percent / 100) * trackWidth;
        if (Math.abs(evt.nativeEvent.locationX - currentThumbX) > 28 && evt.nativeEvent.locationX > 0) {
          initialThumbX.current = evt.nativeEvent.locationX;
          handleUpdate(evt.nativeEvent.locationX);
        } else {
          initialThumbX.current = currentThumbX;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const nextX = initialThumbX.current + gestureState.dx;
        handleUpdate(nextX);
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
        Animated.parallel([
          Animated.spring(thumbScale, {
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.spring(thumbScaleY, {
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(tooltipOpacity, {
            toValue: 0.9,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        Animated.parallel([
          Animated.spring(thumbScale, { toValue: 1, useNativeDriver: true }),
          Animated.spring(thumbScaleY, { toValue: 1, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const thumbPosition = (percent / 100) * trackWidth;

  return (
    <View style={styles.container}>
      {/* Track & Thumb Container */}
      <View
        onLayout={onLayout}
        {...panResponder.panHandlers}
        style={styles.touchArea}
      >
        {/* Background Inactive Track */}
        <View
          style={[
            styles.trackBackground,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
        >
          {/* Active Filled Liquid Track */}
          <View
            style={[
              styles.trackActive,
              {
                width: `${percent}%`,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>

        {/* Liquid Thumb */}
        {trackWidth > 0 && (
          <Animated.View
            style={[
              styles.thumb,
              {
                backgroundColor: colors.card,
                borderColor: colors.primary,
                left: thumbPosition - 13,
                transform: [{ scaleX: thumbScale }, { scaleY: thumbScaleY }],
              },
            ]}
          >
            {/* Center Core Dot */}
            <View
              style={[
                styles.thumbCore,
                { backgroundColor: colors.primary },
              ]}
            />

            {/* Floating Magnetic Tooltip */}
            <Animated.View
              style={[
                styles.tooltip,
                {
                  backgroundColor: colors.text,
                  opacity: tooltipOpacity,
                  transform: [{ translateY: isDragging ? -32 : -28 }],
                },
              ]}
            >
              <Text style={[styles.tooltipText, { color: colors.background }]}>
                {value}
                <Text style={{ fontSize: 9 }}>{unit}</Text>
              </Text>
            </Animated.View>
          </Animated.View>
        )}
      </View>

      {/* Presets Chips */}
      {presets && presets.length > 0 && (
        <View style={styles.presetsRow}>
          {presets.map((p) => {
            const isSelected = value === p.value;
            return (
              <TouchableOpacity
                key={p.value}
                onPress={() => onChange(p.value)}
                activeOpacity={0.75}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.secondary,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    {
                      color: isSelected ? colors.primaryForeground : colors.textMuted,
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: 4,
  },
  touchArea: {
    height: 48,
    justifyContent: "center",
    position: "relative",
  },
  trackBackground: {
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    overflow: "hidden",
  },
  trackActive: {
    height: "100%",
    borderRadius: 4,
  },
  thumb: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tooltip: {
    position: "absolute",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 32,
  },
  tooltipText: {
    fontSize: 11,
    fontWeight: "800",
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 10,
  },
});
