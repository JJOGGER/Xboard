/**
 * useLoading Composable
 * Manages loading states for async operations
 */

import { ref, type Ref } from 'vue';

export interface UseLoadingReturn {
  isLoading: Ref<boolean>;
  startLoading: () => void;
  stopLoading: () => void;
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
}

/**
 * Composable for managing loading states
 * @param initialState - Initial loading state (default: false)
 */
export function useLoading(initialState = false): UseLoadingReturn {
  const isLoading = ref(initialState);

  /**
   * Start loading
   */
  const startLoading = (): void => {
    isLoading.value = true;
  };

  /**
   * Stop loading
   */
  const stopLoading = (): void => {
    isLoading.value = false;
  };

  /**
   * Execute async function with loading state management
   * @param fn - Async function to execute
   */
  const withLoading = async <T>(fn: () => Promise<T>): Promise<T> => {
    startLoading();
    try {
      return await fn();
    } finally {
      stopLoading();
    }
  };

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading,
  };
}
