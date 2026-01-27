/**
 * Property-Based Tests for Authentication
 * Feature: vue-admin-user-frontend
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import type { AuthResponse } from '../../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock apiClient before importing AuthService
const mockPost = vi.fn();
const mockGet = vi.fn();
const mockSetTokenGetter = vi.fn();
const mockSetAuthErrorHandler = vi.fn();

vi.mock('../../api/client', () => ({
  default: {
    post: mockPost,
    get: mockGet,
    setTokenGetter: mockSetTokenGetter,
    setAuthErrorHandler: mockSetAuthErrorHandler,
  },
}));

// Import AuthService after mocking
const { AuthService } = await import('../../api/auth');

describe('Authentication Property Tests', () => {
  let authService: InstanceType<typeof AuthService>;

  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock.clear();
    
    // Setup global localStorage mock
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Reset mocks
    vi.clearAllMocks();
    
    // Create fresh AuthService instance
    authService = new AuthService();
  });

  describe('Property 1: Admin authentication token storage', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 1: Admin authentication token storage
     * Validates: Requirements 1.1
     * 
     * For any valid admin credentials, when authentication succeeds, 
     * the system should store the session token in local storage and 
     * set the authenticated state to true.
     */
    
    it('should store token in localStorage for any valid admin credentials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 32 }),
          }),
          fc.string({ minLength: 32, maxLength: 128 }), // token
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            email: fc.emailAddress(),
            is_admin: fc.constant(true),
            is_staff: fc.boolean(),
            balance: fc.integer({ min: 0, max: 100000 }),
            commission_balance: fc.integer({ min: 0, max: 100000 }),
            plan_id: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
            expired_at: fc.option(fc.integer({ min: 0 }), { nil: null }),
            u: fc.integer({ min: 0 }),
            d: fc.integer({ min: 0 }),
            transfer_enable: fc.integer({ min: 0 }),
            banned: fc.integer({ min: 0, max: 1 }),
            invite_user_id: fc.option(fc.integer({ min: 1 }), { nil: null }),
            created_at: fc.date().map(d => d.toISOString()),
            updated_at: fc.date().map(d => d.toISOString()),
          }),
          async (credentials, token, user) => {
            // Mock successful API response
            const mockResponse: AuthResponse = {
              token,
              user,
            };
            
            mockPost.mockResolvedValueOnce({
              data: mockResponse,
            });

            // Call adminLogin
            const response = await authService.adminLogin(credentials);

            // Verify token is stored in localStorage
            expect(localStorage.getItem('auth_token')).toBe(token);
            
            // Verify user type is stored
            expect(localStorage.getItem('user_type')).toBe('admin');
            
            // Verify response contains token and user
            expect(response.token).toBe(token);
            expect(response.user).toEqual(user);
            
            // Verify isAuthenticated returns true
            expect(authService.isAuthenticated()).toBe(true);
            
            // Verify getToken returns the stored token
            expect(authService.getToken()).toBe(token);
            
            // Verify getUserType returns 'admin'
            expect(authService.getUserType()).toBe('admin');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain token persistence across AuthService instances', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 32, maxLength: 128 }),
          async (token) => {
            // Mock successful API response
            mockPost.mockResolvedValueOnce({
              data: {
                token,
                user: {
                  id: 1,
                  email: 'admin@test.com',
                  is_admin: true,
                  is_staff: false,
                  balance: 0,
                  commission_balance: 0,
                  plan_id: null,
                  expired_at: null,
                  u: 0,
                  d: 0,
                  transfer_enable: 0,
                },
              },
            });

            // Login with first instance
            await authService.adminLogin({
              email: 'admin@test.com',
              password: 'password123',
            });

            // Create new AuthService instance
            const newAuthService = new AuthService();

            // Verify new instance can access the stored token
            expect(newAuthService.getToken()).toBe(token);
            expect(newAuthService.isAuthenticated()).toBe(true);
            expect(newAuthService.getUserType()).toBe('admin');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not store token if API response does not contain token', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8 }),
          }),
          async (credentials) => {
            // Mock API response without token
            mockPost.mockResolvedValueOnce({
              data: {
                user: {
                  id: 1,
                  email: credentials.email,
                  is_admin: true,
                },
              },
            });

            // Clear any existing token
            localStorageMock.clear();

            // Call adminLogin
            await authService.adminLogin(credentials);

            // Verify no token is stored
            expect(localStorage.getItem('auth_token')).toBeNull();
            expect(authService.isAuthenticated()).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should overwrite existing token with new token on subsequent login', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 32, maxLength: 128 }),
          fc.string({ minLength: 32, maxLength: 128 }),
          async (firstToken, secondToken) => {
            // Ensure tokens are different
            fc.pre(firstToken !== secondToken);

            // First login
            mockPost.mockResolvedValueOnce({
              data: {
                token: firstToken,
                user: { id: 1, email: 'admin@test.com', is_admin: true },
              },
            });

            await authService.adminLogin({
              email: 'admin@test.com',
              password: 'password1',
            });

            expect(localStorage.getItem('auth_token')).toBe(firstToken);

            // Second login
            mockPost.mockResolvedValueOnce({
              data: {
                token: secondToken,
                user: { id: 1, email: 'admin@test.com', is_admin: true },
              },
            });

            await authService.adminLogin({
              email: 'admin@test.com',
              password: 'password2',
            });

            // Verify token is updated
            expect(localStorage.getItem('auth_token')).toBe(secondToken);
            expect(authService.getToken()).toBe(secondToken);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 26: User authentication token storage', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 26: User authentication token storage
     * Validates: Requirements 18.3
     * 
     * For any valid user credentials, when authentication succeeds, 
     * the system should store the session token and redirect to the dashboard.
     */
    
    it('should store token in localStorage for any valid user credentials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 32 }),
          }),
          fc.string({ minLength: 32, maxLength: 128 }), // token
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            email: fc.emailAddress(),
            is_admin: fc.constant(false),
            is_staff: fc.constant(false),
            balance: fc.integer({ min: 0, max: 100000 }),
            commission_balance: fc.integer({ min: 0, max: 100000 }),
            plan_id: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
            expired_at: fc.option(fc.integer({ min: 0 }), { nil: null }),
            u: fc.integer({ min: 0 }),
            d: fc.integer({ min: 0 }),
            transfer_enable: fc.integer({ min: 0 }),
            banned: fc.integer({ min: 0, max: 1 }),
            invite_user_id: fc.option(fc.integer({ min: 1 }), { nil: null }),
            created_at: fc.date().map(d => d.toISOString()),
            updated_at: fc.date().map(d => d.toISOString()),
          }),
          async (credentials, token, user) => {
            // Mock successful API response
            const mockResponse: AuthResponse = {
              token,
              user,
            };
            
            mockPost.mockResolvedValueOnce({
              data: mockResponse,
            });

            // Call userLogin
            const response = await authService.userLogin(credentials);

            // Verify token is stored in localStorage
            expect(localStorage.getItem('auth_token')).toBe(token);
            
            // Verify user type is stored as 'user'
            expect(localStorage.getItem('user_type')).toBe('user');
            
            // Verify response contains token and user
            expect(response.token).toBe(token);
            expect(response.user).toEqual(user);
            
            // Verify isAuthenticated returns true
            expect(authService.isAuthenticated()).toBe(true);
            
            // Verify getToken returns the stored token
            expect(authService.getToken()).toBe(token);
            
            // Verify getUserType returns 'user'
            expect(authService.getUserType()).toBe('user');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should store token for user registration with any valid data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 32 }),
            password_confirmation: fc.string({ minLength: 8, maxLength: 32 }),
            invite_code: fc.option(fc.string({ minLength: 6, maxLength: 20 }), { nil: undefined }),
          }),
          fc.string({ minLength: 32, maxLength: 128 }), // token
          async (registerData, token) => {
            // Ensure passwords match for valid registration
            const validData = {
              ...registerData,
              password_confirmation: registerData.password,
            };

            // Mock successful API response
            mockPost.mockResolvedValueOnce({
              data: {
                token,
                user: {
                  id: 1,
                  email: validData.email,
                  is_admin: false,
                  is_staff: false,
                  balance: 0,
                  commission_balance: 0,
                  plan_id: null,
                  expired_at: null,
                  u: 0,
                  d: 0,
                  transfer_enable: 0,
                },
              },
            });

            // Call userRegister
            const response = await authService.userRegister(validData);

            // Verify token is stored in localStorage
            expect(localStorage.getItem('auth_token')).toBe(token);
            
            // Verify user type is stored as 'user'
            expect(localStorage.getItem('user_type')).toBe('user');
            
            // Verify response contains token
            expect(response.token).toBe(token);
            
            // Verify isAuthenticated returns true
            expect(authService.isAuthenticated()).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should distinguish between admin and user tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 32, maxLength: 128 }),
          fc.string({ minLength: 32, maxLength: 128 }),
          async (adminToken, userToken) => {
            // Ensure tokens are different
            fc.pre(adminToken !== userToken);

            // Admin login
            mockPost.mockResolvedValueOnce({
              data: {
                token: adminToken,
                user: { id: 1, email: 'admin@test.com', is_admin: true },
              },
            });

            await authService.adminLogin({
              email: 'admin@test.com',
              password: 'password',
            });

            expect(localStorage.getItem('auth_token')).toBe(adminToken);
            expect(localStorage.getItem('user_type')).toBe('admin');

            // Clear and do user login
            localStorageMock.clear();

            mockPost.mockResolvedValueOnce({
              data: {
                token: userToken,
                user: { id: 2, email: 'user@test.com', is_admin: false },
              },
            });

            await authService.userLogin({
              email: 'user@test.com',
              password: 'password',
            });

            expect(localStorage.getItem('auth_token')).toBe(userToken);
            expect(localStorage.getItem('user_type')).toBe('user');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistent authentication state after token storage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 32, maxLength: 128 }),
          fc.emailAddress(),
          async (token, email) => {
            // Mock successful user login
            mockPost.mockResolvedValueOnce({
              data: {
                token,
                user: {
                  id: 1,
                  email,
                  is_admin: false,
                  is_staff: false,
                  balance: 0,
                  commission_balance: 0,
                  plan_id: null,
                  expired_at: null,
                  u: 0,
                  d: 0,
                  transfer_enable: 0,
                },
              },
            });

            await authService.userLogin({
              email,
              password: 'password123',
            });

            // Verify all authentication state is consistent
            expect(authService.isAuthenticated()).toBe(true);
            expect(authService.getToken()).toBe(token);
            expect(authService.getUserType()).toBe('user');
            expect(localStorage.getItem('auth_token')).toBe(token);
            expect(localStorage.getItem('user_type')).toBe('user');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle token storage for any valid token format', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.string({ minLength: 32, maxLength: 128 }), // Standard token
            fc.hexaString({ minLength: 64, maxLength: 128 }), // Hex token
            fc.base64String({ minLength: 32, maxLength: 128 }), // Base64 token
            fc.uuid(), // UUID token
          ),
          async (token) => {
            // Mock successful API response
            mockPost.mockResolvedValueOnce({
              data: {
                token,
                user: {
                  id: 1,
                  email: 'user@test.com',
                  is_admin: false,
                },
              },
            });

            await authService.userLogin({
              email: 'user@test.com',
              password: 'password',
            });

            // Verify token is stored correctly regardless of format
            expect(localStorage.getItem('auth_token')).toBe(token);
            expect(authService.getToken()).toBe(token);
            expect(authService.isAuthenticated()).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Token Storage Invariants', () => {
    it('should always store user_type alongside token', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 32 }),
          fc.boolean(), // isAdmin
          async (token, isAdmin) => {
            // Mock API response
            mockPost.mockResolvedValueOnce({
              data: {
                token,
                user: {
                  id: 1,
                  email: 'test@test.com',
                  is_admin: isAdmin,
                },
              },
            });

            // Login based on user type
            if (isAdmin) {
              await authService.adminLogin({
                email: 'test@test.com',
                password: 'password',
              });
            } else {
              await authService.userLogin({
                email: 'test@test.com',
                password: 'password',
              });
            }

            // Verify both token and user_type are stored
            expect(localStorage.getItem('auth_token')).toBe(token);
            expect(localStorage.getItem('user_type')).toBe(isAdmin ? 'admin' : 'user');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
