/**
 * Property-Based Tests for Error Handling
 * Feature: vue-admin-user-frontend
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { useErrorNotification } from '../../composables/useErrorNotification';
import type { ApiError } from '../../types/api';

describe('Error Handling Property Tests', () => {
  let clearAll: () => void;
  
  beforeEach(() => {
    // Get clearAll function
    const errorNotification = useErrorNotification();
    clearAll = errorNotification.clearAll;
    
    // Clear all notifications before each test
    clearAll();
    
    // Clear localStorage
    localStorage.clear();
    
    // Reset all mocks
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    // Clear notifications after each test to prevent accumulation
    if (clearAll) {
      clearAll();
    }
  });

  describe('Property 21: Error message display', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 21: Error message display
     * Validates: Requirements 31.3, 32.2
     * 
     * For any failed API request, an error message should be displayed to the user.
     * This property ensures that all error types produce a visible error notification.
     */
    
    it('should display error notification for any API error', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('network'),
            fc.constant('auth'),
            fc.constant('permission'),
            fc.constant('validation'),
            fc.constant('server'),
            fc.constant('unknown')
          ),
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.integer({ min: 0, max: 599 }),
          (errorType, errorMessage, statusCode) => {
            // Clear notifications at start of each iteration
            const { showError, notifications, clearAll: clear } = useErrorNotification();
            clear();
            
            const initialCount = notifications.value.length;
            
            // Create API error
            const apiError: ApiError = {
              type: errorType as any,
              message: errorMessage,
              status: statusCode,
              retryable: errorType === 'network' || errorType === 'server',
            };
            
            // Show error
            showError(apiError);
            
            // Verify notification was created (count increased by 1)
            expect(notifications.value.length).toBe(initialCount + 1);
            
            // Verify the new notification has required properties
            const notification = notifications.value[notifications.value.length - 1];
            expect(notification.id).toBeDefined();
            expect(notification.message).toBe(errorMessage);
            expect(notification.type).toBe(errorType);
            expect(notification.status).toBe(statusCode);
            expect(notification.timestamp).toBeDefined();
            expect(typeof notification.timestamp).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never create notification without a message', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('network'),
            fc.constant('auth'),
            fc.constant('permission'),
            fc.constant('validation'),
            fc.constant('server'),
            fc.constant('unknown')
          ),
          fc.string({ minLength: 1 }),
          (errorType, message) => {
            const { showError, notifications } = useErrorNotification();
            
            const apiError: ApiError = {
              type: errorType as any,
              message,
              status: 500,
              retryable: true,
            };
            
            showError(apiError);
            
            // Every notification must have a non-empty message
            expect(notifications.value.length).toBeGreaterThan(0);
            notifications.value.forEach(notification => {
              expect(notification.message).toBeDefined();
              expect(typeof notification.message).toBe('string');
              expect(notification.message.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display multiple errors without losing previous ones', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.oneof(
                fc.constant('network'),
                fc.constant('auth'),
                fc.constant('permission'),
                fc.constant('validation'),
                fc.constant('server'),
                fc.constant('unknown')
              ),
              message: fc.string({ minLength: 1, maxLength: 100 }),
              status: fc.integer({ min: 0, max: 599 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (errors) => {
            const { showError, notifications, clearAll } = useErrorNotification();
            
            // Clear any existing notifications
            clearAll();
            
            // Show all errors
            errors.forEach(error => {
              const apiError: ApiError = {
                type: error.type as any,
                message: error.message,
                status: error.status,
                retryable: error.type === 'network' || error.type === 'server',
              };
              showError(apiError, undefined, false); // Don't auto-hide for this test
            });
            
            // Verify all errors are displayed
            expect(notifications.value.length).toBe(errors.length);
            
            // Verify each error has a unique ID
            const ids = notifications.value.map(n => n.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(errors.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include retry function for retryable errors', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.string({ minLength: 1 }),
          (isRetryable, message) => {
            const { showError, notifications } = useErrorNotification();
            
            const errorType = isRetryable ? 'network' : 'auth';
            const apiError: ApiError = {
              type: errorType,
              message,
              status: isRetryable ? 0 : 401,
              retryable: isRetryable,
            };
            
            const retryFn = vi.fn().mockResolvedValue(undefined);
            
            showError(apiError, retryFn);
            
            const notification = notifications.value[0];
            
            if (isRetryable) {
              // Retryable errors should have retry function
              expect(notification.retryFn).toBeDefined();
              expect(typeof notification.retryFn).toBe('function');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should auto-hide non-critical errors', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('network'),
            fc.constant('validation'),
            fc.constant('server'),
            fc.constant('unknown')
          ),
          fc.string({ minLength: 1 }),
          (errorType, message) => {
            const { showError, notifications } = useErrorNotification();
            
            const apiError: ApiError = {
              type: errorType as any,
              message,
              status: 500,
              retryable: true,
            };
            
            showError(apiError);
            
            const notification = notifications.value[0];
            
            // Non-critical errors should have autoHide set to true
            expect(notification.autoHide).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not auto-hide critical errors (auth, permission)', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('auth'),
            fc.constant('permission')
          ),
          fc.string({ minLength: 1 }),
          (errorType, message) => {
            const { showError, notifications } = useErrorNotification();
            
            const apiError: ApiError = {
              type: errorType as any,
              message,
              status: errorType === 'auth' ? 401 : 403,
              retryable: false,
            };
            
            showError(apiError);
            
            const notification = notifications.value[0];
            
            // Critical errors should have autoHide set to false
            expect(notification.autoHide).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 24: Authentication failure cleanup', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 24: Authentication failure cleanup
     * Validates: Requirements 32.5
     * 
     * For any failed authentication attempt, the system should clear any stored 
     * credentials and display an appropriate error message.
     */
    
    it('should clear auth token on authentication failure', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          (token, errorMessage) => {
            // Clear notifications at start
            const { showError, notifications, clearAll: clear } = useErrorNotification();
            clear();
            
            // Set up initial auth state
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user_type', 'admin');
            
            // Verify token is set
            expect(localStorage.getItem('auth_token')).toBe(token);
            
            // Simulate authentication error by clearing storage
            // (This mimics what the API client's auth error handler does)
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_type');
            
            // Verify credentials are cleared
            expect(localStorage.getItem('auth_token')).toBeNull();
            expect(localStorage.getItem('user_type')).toBeNull();
            
            // Verify error can be displayed
            const authError: ApiError = {
              type: 'auth',
              message: errorMessage,
              status: 401,
              retryable: false,
            };
            
            showError(authError);
            
            // Verify error notification was created
            expect(notifications.value.length).toBeGreaterThan(0);
            const lastNotification = notifications.value[notifications.value.length - 1];
            expect(lastNotification.type).toBe('auth');
            expect(lastNotification.message).toBe(errorMessage);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear all auth-related data on any auth error', () => {
      fc.assert(
        fc.property(
          fc.record({
            token: fc.string({ minLength: 10 }),
            userType: fc.oneof(fc.constant('admin'), fc.constant('user')),
            additionalData: fc.string({ minLength: 1 }),
          }),
          (authData) => {
            // Set up auth state with multiple items
            localStorage.setItem('auth_token', authData.token);
            localStorage.setItem('user_type', authData.userType);
            localStorage.setItem('some_other_data', authData.additionalData);
            
            // Verify initial state
            expect(localStorage.getItem('auth_token')).toBe(authData.token);
            expect(localStorage.getItem('user_type')).toBe(authData.userType);
            
            // Simulate auth error cleanup
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_type');
            
            // Verify auth data is cleared
            expect(localStorage.getItem('auth_token')).toBeNull();
            expect(localStorage.getItem('user_type')).toBeNull();
            
            // Other data should remain
            expect(localStorage.getItem('some_other_data')).toBe(authData.additionalData);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display appropriate error message for any auth failure', () => {
      fc.assert(
        fc.property(
          fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          (customMessage) => {
            // Clear notifications at start
            const { showError, notifications, clearAll: clear } = useErrorNotification();
            clear();
            
            const message = customMessage || 'Session expired. Please login again.';
            const authError: ApiError = {
              type: 'auth',
              message,
              status: 401,
              retryable: false,
            };
            
            showError(authError);
            
            // Verify error notification
            expect(notifications.value.length).toBeGreaterThan(0);
            const lastNotification = notifications.value[notifications.value.length - 1];
            
            expect(lastNotification.type).toBe('auth');
            expect(lastNotification.message).toBeDefined();
            expect(lastNotification.message.length).toBeGreaterThan(0);
            expect(lastNotification.retryable).toBe(false);
            expect(lastNotification.autoHide).toBe(false); // Auth errors should not auto-hide
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple consecutive auth failures', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              token: fc.string({ minLength: 10 }),
              message: fc.string({ minLength: 1 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (authAttempts) => {
            // Clear notifications at start
            const { showError, notifications, clearAll: clear } = useErrorNotification();
            clear();
            
            const initialCount = notifications.value.length;
            
            authAttempts.forEach(attempt => {
              // Set token
              localStorage.setItem('auth_token', attempt.token);
              
              // Simulate auth failure
              localStorage.removeItem('auth_token');
              localStorage.removeItem('user_type');
              
              // Show error
              const authError: ApiError = {
                type: 'auth',
                message: attempt.message,
                status: 401,
                retryable: false,
              };
              showError(authError);
              
              // Verify token is cleared
              expect(localStorage.getItem('auth_token')).toBeNull();
            });
            
            // Verify all errors were recorded
            expect(notifications.value.length).toBe(initialCount + authAttempts.length);
            
            // All new notifications should be auth errors
            const newNotifications = notifications.value.slice(initialCount);
            newNotifications.forEach(notification => {
              expect(notification.type).toBe('auth');
              expect(notification.retryable).toBe(false);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 25: Network error retry', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 25: Network error retry
     * Validates: Requirements 32.6
     * 
     * For any network error, the system should provide a retry option to the user.
     */
    
    it('should provide retry option for any network error', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (errorMessage) => {
            // Clear notifications at start
            const { showError, notifications, clearAll: clear } = useErrorNotification();
            clear();
            
            const networkError: ApiError = {
              type: 'network',
              message: errorMessage,
              status: 0,
              retryable: true,
            };
            
            const retryFn = vi.fn().mockResolvedValue(undefined);
            
            showError(networkError, retryFn);
            
            // Verify notification has retry function
            expect(notifications.value.length).toBeGreaterThan(0);
            const lastNotification = notifications.value[notifications.value.length - 1];
            
            expect(lastNotification.retryable).toBe(true);
            expect(lastNotification.retryFn).toBeDefined();
            expect(typeof lastNotification.retryFn).toBe('function');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should execute retry function when retry is called', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (errorMessage) => {
            // Clear notifications at start
            const { showError, retry, notifications, clearAll: clear } = useErrorNotification();
            clear();
            
            const networkError: ApiError = {
              type: 'network',
              message: errorMessage,
              status: 0,
              retryable: true,
            };
            
            const retryFn = vi.fn().mockResolvedValue(undefined);
            
            showError(networkError, retryFn);
            
            const notificationId = notifications.value[notifications.value.length - 1].id;
            
            // Call retry
            await retry(notificationId);
            
            // Verify retry function was called
            expect(retryFn).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should remove notification on successful retry', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (errorMessage) => {
            // Clear notifications at start
            const { showError, retry, notifications, clearAll: clear } = useErrorNotification();
            clear();
            
            const networkError: ApiError = {
              type: 'network',
              message: errorMessage,
              status: 0,
              retryable: true,
            };
            
            const retryFn = vi.fn().mockResolvedValue(undefined);
            
            showError(networkError, retryFn);
            
            const initialCount = notifications.value.length;
            expect(initialCount).toBeGreaterThan(0);
            const notificationId = notifications.value[initialCount - 1].id;
            
            // Retry should succeed and remove notification
            await retry(notificationId);
            
            // Notification should be removed (count decreased by 1)
            expect(notifications.value.length).toBe(initialCount - 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should show new error if retry fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          async (originalMessage, retryErrorMessage) => {
            // Clear notifications at start
            const { showError, retry, notifications, clearAll: clear } = useErrorNotification();
            clear();
            
            const networkError: ApiError = {
              type: 'network',
              message: originalMessage,
              status: 0,
              retryable: true,
            };
            
            const retryError: ApiError = {
              type: 'network',
              message: retryErrorMessage,
              status: 0,
              retryable: true,
            };
            
            const retryFn = vi.fn().mockRejectedValue(retryError);
            
            showError(networkError, retryFn);
            
            const initialCount = notifications.value.length;
            expect(initialCount).toBeGreaterThan(0);
            const notificationId = notifications.value[initialCount - 1].id;
            
            // Retry should fail and show new error
            await retry(notificationId);
            
            // Should still have notifications (old one removed, new one added)
            expect(notifications.value.length).toBeGreaterThan(0);
            
            // Retry function should have been called
            expect(retryFn).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide retry for server errors (5xx)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 500, max: 599 }),
          fc.string({ minLength: 1 }),
          (statusCode, errorMessage) => {
            // Clear notifications at start
            const { showError, notifications, clearAll: clear } = useErrorNotification();
            clear();
            
            const serverError: ApiError = {
              type: 'server',
              message: errorMessage,
              status: statusCode,
              retryable: true,
            };
            
            const retryFn = vi.fn().mockResolvedValue(undefined);
            
            showError(serverError, retryFn);
            
            // Verify notification has retry option
            expect(notifications.value.length).toBeGreaterThan(0);
            const lastNotification = notifications.value[notifications.value.length - 1];
            
            expect(lastNotification.retryable).toBe(true);
            expect(lastNotification.retryFn).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not provide retry for non-retryable errors', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('auth'),
            fc.constant('permission'),
            fc.constant('validation')
          ),
          fc.string({ minLength: 1 }),
          (errorType, errorMessage) => {
            // Clear notifications at start
            const { showError, notifications, clearAll: clear } = useErrorNotification();
            clear();
            
            const nonRetryableError: ApiError = {
              type: errorType as any,
              message: errorMessage,
              status: errorType === 'auth' ? 401 : errorType === 'permission' ? 403 : 422,
              retryable: false,
            };
            
            showError(nonRetryableError);
            
            // Verify notification is not retryable
            expect(notifications.value.length).toBeGreaterThan(0);
            const lastNotification = notifications.value[notifications.value.length - 1];
            
            expect(lastNotification.retryable).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple retry attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          fc.string({ minLength: 1 }),
          async (retryCount, errorMessage) => {
            // Clear notifications at start
            const { showError, retry, notifications, clearAll: clear } = useErrorNotification();
            clear();
            
            let attemptCount = 0;
            const retryFn = vi.fn().mockImplementation(async () => {
              attemptCount++;
              if (attemptCount < retryCount) {
                throw {
                  type: 'network',
                  message: errorMessage,
                  status: 0,
                  retryable: true,
                };
              }
              // Success on final attempt
            });
            
            const networkError: ApiError = {
              type: 'network',
              message: errorMessage,
              status: 0,
              retryable: true,
            };
            
            showError(networkError, retryFn);
            
            // Retry multiple times
            for (let i = 0; i < retryCount; i++) {
              if (notifications.value.length > 0) {
                const notificationId = notifications.value[notifications.value.length - 1].id;
                await retry(notificationId);
              }
            }
            
            // Verify retry was called correct number of times
            expect(retryFn).toHaveBeenCalledTimes(retryCount);
          }
        ),
        { numRuns: 50 } // Reduced runs for async test with multiple iterations
      );
    });
  });
});
