"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

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
  className?: string;
}

export function LiquidSlider({
  min = 50,
  max = 95,
  step = 1,
  value,
  onChange,
  unit = "%",
  presets,
  className,
}: LiquidSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Clamp helper
  const clamp = useCallback(
    (val: number) => Math.min(Math.max(val, min), max),
    [min, max]
  );

  // Calculate percentage for given value
  const getPercentage = useCallback(
    (val: number) => ((clamp(val) - min) / (max - min)) * 100,
    [clamp, min, max]
  );

  const currentPercent = getPercentage(value);

  // Spring for smooth visual motion
  const springPercent = useSpring(currentPercent, {
    stiffness: 400,
    damping: 35,
  });

  useEffect(() => {
    springPercent.set(currentPercent);
  }, [currentPercent, springPercent]);

  // Handle pointer interactions (mouse & touch)
  const updateValueFromPointer = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const rawPercent = (clientX - rect.left) / rect.width;
      const clampedPercent = Math.min(Math.max(rawPercent, 0), 1);
      const rawValue = min + clampedPercent * (max - min);

      // Quantize to step
      const steppedValue = Math.round(rawValue / step) * step;
      onChange(clamp(steppedValue));
    },
    [min, max, step, clamp, onChange]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateValueFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updateValueFromPointer(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(clamp(value + step));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(clamp(value - step));
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(min);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(max);
    }
  };

  return (
    <div className={cn("space-y-3 select-none", className)}>
      {/* Slider Track Area */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative py-4 cursor-pointer touch-none flex items-center"
      >
        {/* Background Track */}
        <div className="w-full h-3 rounded-full bg-secondary border border-border/80 overflow-hidden relative shadow-inner">
          {/* Preset Marker Ticks */}
          {presets?.map((preset) => {
            const p = getPercentage(preset.value);
            return (
              <div
                key={preset.value}
                style={{ left: `${p}%` }}
                className="absolute top-0 bottom-0 w-[2px] bg-border/80 -translate-x-1/2 pointer-events-none"
              />
            );
          })}

          {/* Filled Liquid Track */}
          <motion.div
            className="h-full bg-primary relative metallic-surface shadow-[0_0_12px_var(--glow-color)] transition-all"
            style={{ width: `${currentPercent}%` }}
          />
        </div>

        {/* Liquid Thumb Element */}
        <motion.div
          tabIndex={0}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          onKeyDown={handleKeyDown}
          style={{ left: `${currentPercent}%` }}
          animate={{
            scale: isDragging ? 1.25 : hovered ? 1.12 : 1,
            scaleY: isDragging ? 0.88 : 1,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-card border-2 border-primary shadow-md flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-20 cursor-grab active:cursor-grabbing"
        >
          {/* Inner Liquid Node */}
          <motion.div
            animate={{
              scale: isDragging ? [1, 1.3, 1] : 1,
              borderRadius: isDragging ? "40%" : "50%",
            }}
            transition={{ repeat: isDragging ? Infinity : 0, duration: 1 }}
            className="w-2.5 h-2.5 rounded-full bg-primary"
          />

          {/* Floating Magnetic Tooltip Badge */}
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{
              opacity: isDragging || hovered ? 1 : 0.85,
              y: isDragging ? -34 : -28,
              scale: isDragging ? 1.08 : 1,
            }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            className="absolute pointer-events-none px-2 py-0.5 rounded-md bg-foreground text-background text-[11px] font-mono font-bold shadow-lg flex items-center gap-0.5 whitespace-nowrap z-30"
          >
            <span>{value}</span>
            <span className="text-[10px] opacity-80">{unit}</span>
            {/* Downward triangle arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
          </motion.div>
        </motion.div>
      </div>

      {/* Preset Quick Chips */}
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[11px] text-muted-foreground mr-1">Quick Select:</span>
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value)}
              className={cn(
                "text-[10px] px-2.5 py-1 rounded-md transition-all font-medium border cursor-pointer",
                value === preset.value
                  ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                  : "bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground border-border"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
