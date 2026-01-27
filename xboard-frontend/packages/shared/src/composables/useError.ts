/**
 * useError Composable
 * Manages error states and error handling
 */

import { ref, type Ref } from 'vue';
import type { ApiError } from '../types';

export interface UseErrorReturn {
  error: Ref<ApiError | null>;
  hasError: Ref<boolean>;
  setError: (err: ApiError | Error | string) => void;
  clearError: () => void;
  handleError: (err: any) => void;
}

/**
 * Composable for managing error states
 */
export function useError(): UseErrorReturn {
  const error = ref<ApiError | null>(null);
  const hasError = ref(false);

  /**
   * Set error
   * @param err - Error to set (ApiError, Error, or string)
   */
  const setError = (err: ApiError | Error | string): void => {
    if (typeof err === 'string') {
      error.value = {
        type: 'unknown',
        message: err,
        status: 0,
        retryable: false,
      };
    } else if (err instanceof Error) {
      error.value = {
        type: 'unknown',
        message: err.message,
        status: 0,
        retryable: false,
      };
    } else {
      error.value = err;
    }
    hasError.value = true;
  };

  /**
   * Clear error
   */
  const clearError = (): void => {
    error.value = null;
    hasError.value = false;
  };

  /**
   * Handle error (generic error handler)
   * @param err - Error to handle
   */
  const handleError = (err: any): void => {
    console.error('Error occurred:', err);
    setError(err);
  };

  return {
    error,
    hasError,
    setError,
    clearError,
    handleError,
  };
}
