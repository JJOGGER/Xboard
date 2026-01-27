/**
 * Property-Based Tests for API Client Error Handling
 * Feature: vue-admin-user-frontend
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { AxiosError } from 'axios';
import type { ApiError, ErrorResponse } from '../../types/api';

/**
 * Helper function to transform errors (extracted from ApiClient logic)
 * This mirrors the transformError method in ApiClient
 */
function transformError(error: AxiosError<ErrorResponse>): ApiError {
  const { response, message } = error;

  // Network errors (no response)
  if (!response) {
    return {
      type: 'network',
      message: 'Network error. Please check your connection.',
      status: 0,
      retryable: true,
    };
  }

  // Authentication errors (401)
  if (response.status === 401) {
    return {
      type: 'auth',
      message: response.data?.message || 'Session expired. Please login again.',
      status: response.status,
      retryable: false,
    };
  }

  // Permission errors (403)
  if (response.status === 403) {
    return {
      type: 'permission',
      message: response.data?.message || 'You do not have permission to perform this action.',
      status: response.status,
      retryable: false,
    };
  }

  // Validation errors (422)
  if (response.status === 422) {
    return {
      type: 'validation',
      message: response.data?.message || 'Validation failed.',
      status: response.status,
      retryable: false,
      errors: response.data?.errors,
    };
  }

  // Server errors (5xx)
  if (response.status >= 500) {
    return {
      type: 'server',
      message: response.data?.message || 'Server error. Please try again later.',
      status: response.status,
      retryable: true,
    };
  }

  // Other errors
  return {
    type: 'unknown',
    message: response.data?.message || message || 'An error occurred.',
    status: response.status,
    retryable: false,
  };
}

describe('API Client Property Tests', () => {
  describe('Property 21: Error message display', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 21: Error message display
     * Validates: Requirements 31.3, 32.2
     * 
     * For any failed API request, an error message should be displayed to the user.
     * This property ensures that all error types produce a user-friendly error message.
     */
    
    it('should return error message for any network error', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (errorMessage) => {
            // Create network error (no response)
            const networkError = {
              message: errorMessage,
              isAxiosError: true,
            } as AxiosError<ErrorResponse>;

            const apiError = transformError(networkError);
            
            // Verify error has a message
            expect(apiError.message).toBeDefined();
            expect(typeof apiError.message).toBe('string');
            expect(apiError.message.length).toBeGreaterThan(0);
            
            // Verify error type is correct
            expect(apiError.type).toBe('network');
            expect(apiError.retryable).toBe(true);
            expect(apiError.status).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return error message for any authentication error (401)', () => {
      fc.assert(
        fc.property(
          fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          (customMessage) => {
            // Create 401 authentication error
            const authError = {
              message: 'Request failed with status code 401',
              isAxiosError: true,
              response: {
                status: 401,
                data: customMessage ? { message: customMessage } : {},
              },
            } as AxiosError<ErrorResponse>;

            const apiError = transformError(authError);
            
            // Verify error has a message
            expect(apiError.message).toBeDefined();
            expect(typeof apiError.message).toBe('string');
            expect(apiError.message.length).toBeGreaterThan(0);
            
            // Verify error type and properties
            expect(apiError.type).toBe('auth');
            expect(apiError.status).toBe(401);
            expect(apiError.retryable).toBe(false);
            
            // If custom message provided, it should be used
            if (customMessage) {
              expect(apiError.message).toBe(customMessage);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return error message for any permission error (403)', () => {
      fc.assert(
        fc.property(
          fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          (customMessage) => {
            // Create 403 permission error
            const permError = {
              message: 'Request failed with status code 403',
              isAxiosError: true,
              response: {
                status: 403,
                data: customMessage ? { message: customMessage } : {},
              },
            } as AxiosError<ErrorResponse>;

            const apiError = transformError(permError);
            
            // Verify error has a message
            expect(apiError.message).toBeDefined();
            expect(typeof apiError.message).toBe('string');
            expect(apiError.message.length).toBeGreaterThan(0);
            
            // Verify error type and properties
            expect(apiError.type).toBe('permission');
            expect(apiError.status).toBe(403);
            expect(apiError.retryable).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return error message for any validation error (422)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.dictionary(fc.string(), fc.array(fc.string())),
          (message, validationErrors) => {
            // Create 422 validation error
            const valError = {
              message: 'Request failed with status code 422',
              isAxiosError: true,
              response: {
                status: 422,
                data: {
                  message,
                  errors: validationErrors,
                },
              },
            } as AxiosError<ErrorResponse>;

            const apiError = transformError(valError);
            
            // Verify error has a message
            expect(apiError.message).toBeDefined();
            expect(typeof apiError.message).toBe('string');
            expect(apiError.message.length).toBeGreaterThan(0);
            
            // Verify error type and properties
            expect(apiError.type).toBe('validation');
            expect(apiError.status).toBe(422);
            expect(apiError.retryable).toBe(false);
            
            // Verify validation errors are included
            if (Object.keys(validationErrors).length > 0) {
              expect(apiError.errors).toBeDefined();
              expect(apiError.errors).toEqual(validationErrors);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return error message for any server error (5xx)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 500, max: 599 }),
          fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          (statusCode, customMessage) => {
            // Create server error
            const serverError = {
              message: `Request failed with status code ${statusCode}`,
              isAxiosError: true,
              response: {
                status: statusCode,
                data: customMessage ? { message: customMessage } : {},
              },
            } as AxiosError<ErrorResponse>;

            const apiError = transformError(serverError);
            
            // Verify error has a message
            expect(apiError.message).toBeDefined();
            expect(typeof apiError.message).toBe('string');
            expect(apiError.message.length).toBeGreaterThan(0);
            
            // Verify error type and properties
            expect(apiError.type).toBe('server');
            expect(apiError.status).toBe(statusCode);
            expect(apiError.retryable).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return error message for any other HTTP error', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 400, max: 499 }).filter(code => code !== 401 && code !== 403 && code !== 422),
          fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          (statusCode, customMessage) => {
            // Create other HTTP error
            const httpError = {
              message: `Request failed with status code ${statusCode}`,
              isAxiosError: true,
              response: {
                status: statusCode,
                data: customMessage ? { message: customMessage } : {},
              },
            } as AxiosError<ErrorResponse>;

            const apiError = transformError(httpError);
            
            // Verify error has a message
            expect(apiError.message).toBeDefined();
            expect(typeof apiError.message).toBe('string');
            expect(apiError.message.length).toBeGreaterThan(0);
            
            // Verify error has a type
            expect(apiError.type).toBeDefined();
            expect(apiError.status).toBe(statusCode);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always provide user-friendly error messages for all error types', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('network'),
            fc.constant(401),
            fc.constant(403),
            fc.constant(422),
            fc.integer({ min: 500, max: 599 }),
            fc.integer({ min: 400, max: 499 })
          ),
          (errorType) => {
            let mockError: any;

            if (errorType === 'network') {
              // Network error
              mockError = {
                message: 'Network Error',
                isAxiosError: true,
              };
            } else {
              // HTTP error
              mockError = {
                message: `Request failed with status code ${errorType}`,
                isAxiosError: true,
                response: {
                  status: errorType,
                  data: {},
                },
              };
            }

            const apiError = transformError(mockError);
            
            // Every error must have a message
            expect(apiError.message).toBeDefined();
            expect(typeof apiError.message).toBe('string');
            expect(apiError.message.length).toBeGreaterThan(0);
            
            // Message should not be technical/raw
            expect(apiError.message).not.toContain('undefined');
            expect(apiError.message).not.toContain('null');
            
            // Every error must have a type
            expect(apiError.type).toBeDefined();
            expect(['network', 'auth', 'permission', 'validation', 'server', 'unknown']).toContain(apiError.type);
            
            // Every error must have retryable flag
            expect(typeof apiError.retryable).toBe('boolean');
            
            // Every error must have a status
            expect(typeof apiError.status).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never return empty or undefined error messages', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 400, max: 599 }),
          fc.option(fc.oneof(fc.constant(''), fc.constant(undefined), fc.constant(null)), { nil: undefined }),
          (statusCode, badMessage) => {
            // Create error with potentially bad message
            const httpError = {
              message: 'Request failed',
              isAxiosError: true,
              response: {
                status: statusCode,
                data: badMessage !== undefined ? { message: badMessage as any } : {},
              },
            } as AxiosError<ErrorResponse>;

            const apiError = transformError(httpError);
            
            // Even with bad input, error must have a valid message
            expect(apiError.message).toBeDefined();
            expect(typeof apiError.message).toBe('string');
            expect(apiError.message.length).toBeGreaterThan(0);
            expect(apiError.message).not.toBe('');
            expect(apiError.message).not.toBe('undefined');
            expect(apiError.message).not.toBe('null');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
