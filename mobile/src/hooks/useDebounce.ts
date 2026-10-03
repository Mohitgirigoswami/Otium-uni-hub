import { useState, useEffect } from "react";

/**
 * useDebounce Hook
 * Debounces any fast-changing value (e.g. user search input) by the specified delay.
 * Prevents network request flooding and out-of-order race conditions.
 */
export function useDebounce<T>(value: T, delayMs: number = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
