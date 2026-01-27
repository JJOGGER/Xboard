/**
 * useErrorNotification Composable
 * Global error notification system with retry logic
 */

import { ref, type Ref } from 'vue';
import type { ApiError } from '../types';

export interface ErrorNotification extends ApiError {
  id: string;
  timestamp: number;
  retryFn?: () => Promise<void>;
  autoHide?: boolean;
}

export interface UseErrorNotificationReturn {
  notifications: Ref<ErrorNotification[]>;
  showError: (error: ApiError, retryFn?: () => Promise<void>, autoHide?: boolean) => void;
  hideError: (id: string) => void;
  clearAll: () => void;
  retry: (id: string) => Promise<void>;
}

// Global state for error notifications
const notifications = ref<ErrorNotification[]>([]);

/**
 * Composable for managing global error notifications
 */
export function useErrorNotification(): UseErrorNotificationReturn {
  /**
   * Show error notification
   * @param error - API error to display
   * @param retryFn - Optional retry function
   * @param autoHide - Whether to auto-hide after 5 seconds (default: true for non-critical errors)
   */
  const showError = (
    error: ApiError,
    retryFn?: () => Promise<void>,
    autoHide?: boolean
  ): void => {
    const id = `error-${Date.now()}-${Math.random()}`;
    
    // Determine auto-hide behavior
    const shouldAutoHide = autoHide !== undefined 
      ? autoHide 
      : error.type !== 'auth' && error.type !== 'permission';

    const notification: ErrorNotification = {
      ...error,
      id,
      timestamp: Date.now(),
      retryFn,
      autoHide: shouldAutoHide,
    };

    notifications.value.push(notification);

    // Auto-hide after 5 seconds for non-critical errors
    if (shouldAutoHide) {
      setTimeout(() => {
        hideError(id);
      }, 5000);
    }
  };

  /**
   * Hide error notification
   * @param id - Notification ID to hide
   */
  const hideError = (id: string): void => {
    const index = notifications.value.findIndex((n) => n.id === id);
    if (index !== -1) {
      notifications.value.splice(index, 1);
    }
  };

  /**
   * Clear all error notifications
   */
  const clearAll = (): void => {
    notifications.value = [];
  };

  /**
   * Retry failed operation
   * @param id - Notification ID to retry
   */
  const retry = async (id: string): Promise<void> => {
    const notification = notifications.value.find((n) => n.id === id);
    if (!notification || !notification.retryFn) {
      return;
    }

    try {
      await notification.retryFn();
      hideError(id);
    } catch (error) {
      // If retry fails, show new error
      if (error && typeof error === 'object' && 'message' in error) {
        showError(error as ApiError, notification.retryFn);
      }
    }
  };

  return {
    notifications,
    showError,
    hideError,
    clearAll,
    retry,
  };
}
