import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format paise / cents to formatted currency string (INR)
 * @param paise Amount in paise (1 INR = 100 paise)
 */
export function formatPaiseToRupees(paise: number): string {
  const rupees = paise / 100;
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
 * Target is 75%
 */
export function calculateAttendanceMetrics(attended: number, total: number) {
  if (total === 0) {
    return {
      percentage: 100,
      status: "SAFE",
      consecutiveNeeded: 0,
      canBunk: 0,
    };
  }

  const percentage = (attended / total) * 100;

  if (percentage < 75) {
    // Formula: (attended + x) / (total + x) >= 0.75
    // attended + x >= 0.75 * total + 0.75 * x
    // 0.25 * x >= 0.75 * total - attended
    // x >= (3 * total - 4 * attended)
    const consecutiveNeeded = Math.max(0, Math.ceil(3 * total - 4 * attended));
    return {
      percentage: Number(percentage.toFixed(1)),
      status: "DANGER",
      consecutiveNeeded,
      canBunk: 0,
    };
  } else {
    // Formula: attended / (total + y) >= 0.75
    // 0.75 * (total + y) <= attended
    // y <= (attended / 0.75) - total = (4 * attended / 3) - total
    const canBunk = Math.max(0, Math.floor((4 * attended) / 3 - total));
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
