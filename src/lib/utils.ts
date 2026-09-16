import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format paise / cents to formatted currency string (INR)
 * @param paise Amount in paise (1 INR = 100 paise)
 */
export function formatPaiseToRupees(paise: number | undefined | null): string {
  if (paise === undefined || paise === null || isNaN(Number(paise))) {
    return "₹0";
  }
  const rupees = Number(paise) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

/**
 * Convert Rupees to Paise
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Calculate attendance deficit or safe bunkable classes
 * Default target is 75%, but configurable for students needing other thresholds (e.g. 65%, 80%, etc.)
 */
export function calculateAttendanceMetrics(
  attended: number,
  total: number,
  targetPercentage: number = 75
) {
  const target = Math.max(1, Math.min(99, targetPercentage));
  const targetRatio = target / 100;

  if (total === 0) {
    return {
      percentage: 100,
      status: "SAFE",
      consecutiveNeeded: 0,
      canBunk: 0,
    };
  }

  const percentage = (attended / total) * 100;

  if (percentage < target) {
    // Formula: (attended + x) / (total + x) >= targetRatio
    // attended + x >= targetRatio * total + targetRatio * x
    // x * (1 - targetRatio) >= targetRatio * total - attended
    // x >= (targetRatio * total - attended) / (1 - targetRatio)
    const consecutiveNeeded = Math.max(
      0,
      Math.ceil((targetRatio * total - attended) / (1 - targetRatio))
    );
    return {
      percentage: Number(percentage.toFixed(1)),
      status: "DANGER",
      consecutiveNeeded,
      canBunk: 0,
    };
  } else {
    // Formula: attended / (total + y) >= targetRatio
    // targetRatio * (total + y) <= attended
    // y <= (attended / targetRatio) - total
    const canBunk = Math.max(0, Math.floor(attended / targetRatio - total));
    return {
      percentage: Number(percentage.toFixed(1)),
      status: "SAFE",
      consecutiveNeeded: 0,
      canBunk,
    };
  }
}

/**
 * Format relative or absolute date
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function formatTimeOnly(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    timeStyle: "short",
  }).format(d);
}
