/**
 * useDebounce Composable
 * Debounces function calls and reactive values
 */

import { ref, watch, type Ref } from 'vue';

export interface UseDebounceReturn<T> {
  debouncedValue: Ref<T>;
  immediate: (value: T) => void;
}

/**
 * Debounce a reactive value
 * @param value - Reactive value to debounce
 * @param delay - Delay in milliseconds (default: 300)
 */
export function useDebounce<T>(value: Ref<T>, delay = 300): UseDebounceReturn<T> {
  const debouncedValue = ref<T>(value.value) as Ref<T>;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  watch(value, (newValue) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      debouncedValue.value = newValue;
      timeoutId = null;
    }, delay);
  });

  /**
   * Set value immediately without debouncing
   * @param newValue - Value to set
   */
  const immediate = (newValue: T): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    debouncedValue.value = newValue;
  };

  return {
    debouncedValue,
    immediate,
  };
}

/**
 * Debounce a function
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds (default: 300)
 */
export function useDebounceFn<T extends (...args: any[]) => any>(
  fn: T,
  delay = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttle a function
 * @param fn - Function to throttle
 * @param delay - Delay in milliseconds (default: 300)
 */
export function useThrottleFn<T extends (...args: any[]) => any>(
  fn: T,
  delay = 300
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>): void => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      lastCall = now;
      fn(...args);
    } else {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        fn(...args);
        timeoutId = null;
      }, delay - timeSinceLastCall);
    }
  };
}
