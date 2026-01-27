/**
 * Property-Based Tests for User Login
 * Feature: vue-admin-user-frontend
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { createPinia, setActivePinia } from 'pinia';

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

// Setup global localStorage mock
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock authService
const mockUserLogin = vi.fn();
const mockGetToken = vi.fn();
const mockSetToken = vi.fn();
const mockRemoveToken = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogout = vi.fn();

vi.mock('@xboard/shared', () => ({
  authService: {
    userLogin: mockUserLogin,
    getToken: mockGetToken,
    setToken: mockSetToken,
    removeToken: mockRemoveToken,
    getCurrentUser: mockGetCurrentUser,
    logout: mockLogout,
  },
}));

// Import after mocking
const { useAuthStore } = await import('../../stores/auth');

describe('User Login Property Tests', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    // Reset localStorage
    localStorageMock.clear();

    // Create fresh Pinia instance
    pinia = createPinia();
    setActivePinia(pinia);

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockGetToken.mockImplementation(() => localStorageMock.getItem('auth_token'));
    mockSetToken.mockImplementation((token: string) => {
      localStorageMock.setItem('auth_token', token);
      localStorageMock.setItem('user_type', 'user');
    });
    mockRemoveToken.mockImplementation(() => {
      localStorageMock.removeItem('auth_token');
      localStorageMock.removeItem('user_type');
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 26: User authentication token storage', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 26: User authentication token storage
     * Validates: Requirements 18.3
     * 
     * For any valid user credentials, when authentication succeeds,
     * the system should store the session token and redirect to the dashboard.
     */

    it('should store token for any valid user credentials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 64 }),
            token: fc.string({ minLength: 32, maxLength: 128 }),
            userId: fc.integer({ min: 1, max: 10000 }),
            balance: fc.integer({ min: 0, max: 100000 }),
            commissionBalance: fc.integer({ min: 0, max: 100000 }),
          }),
          async ({ email, password, token, userId, balance, commissionBalance }) => {
            // Reset for each property test run
            vi.clearAllMocks();
            localStorageMock.clear();
            
            const freshPinia = createPinia();
            setActivePinia(freshPinia);
            const authStore = useAuthStore();

            // Mock successful login - simulate what authService.userLogin does
            mockUserLogin.mockImplementationOnce(async () => {
              // Call setToken like the real authService does
              mockSetToken(token);
              return {
                token,
                user: {
                  id: userId,
                  email,
                  is_admin: false,
                  is_staff: false,
                  balance,
                  commission_balance: commissionBalance,
                  plan_id: null,
                  expired_at: null,
                  u: 0,
                  d: 0,
                  transfer_enable: 0,
                },
              };
            });

            // Login
            await authStore.login({ email, password });

            // Verify token is stored
            expect(authStore.token).toBe(token);
            expect(localStorage.getItem('auth_token')).toBe(token);
            expect(authStore.isAuthenticated).toBe(true);
            
            // Verify user data is stored
            expect(authStore.user).not.toBeNull();
            expect(authStore.user?.email).toBe(email);
            expect(authStore.user?.id).toBe(userId);
            
            // Verify user type is set
            expect(localStorage.getItem('user_type')).toBe('user');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle login failure without storing token', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 64 }),
            errorMessage: fc.string({ minLength: 10, maxLength: 100 }),
          }),
          async ({ email, password, errorMessage }) => {
            // Reset for each property test run
            vi.clearAllMocks();
            localStorageMock.clear();
            
            const freshPinia = createPinia();
            setActivePinia(freshPinia);
            const authStore = useAuthStore();

            // Mock failed login
            mockUserLogin.mockRejectedValueOnce(new Error(errorMessage));

            // Attempt login
            try {
              await authStore.login({ email, password });
              // Should not reach here
              expect(true).toBe(false);
            } catch (err: any) {
              // Verify error is thrown
              expect(err.message).toBe(errorMessage);
            }

            // Verify no token is stored
            expect(authStore.token).toBeNull();
            expect(localStorage.getItem('auth_token')).toBeNull();
            expect(authStore.isAuthenticated).toBe(false);
            expect(authStore.user).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 28: User session expiration', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 28: User session expiration
     * Validates: Requirements 18.5
     * 
     * For any expired user session, the system should redirect to the login page
     * and clear authentication data.
     */

    it('should clear all authentication data for any expired session', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            token: fc.string({ minLength: 32, maxLength: 128 }),
            userId: fc.integer({ min: 1, max: 10000 }),
            balance: fc.integer({ min: 0, max: 100000 }),
            commissionBalance: fc.integer({ min: 0, max: 100000 }),
          }),
          async ({ email, token, userId, balance, commissionBalance }) => {
            // Reset for each property test run
            vi.clearAllMocks();
            localStorageMock.clear();
            
            const freshPinia = createPinia();
            setActivePinia(freshPinia);
            const authStore = useAuthStore();

            // Mock successful login
            mockUserLogin.mockImplementationOnce(async () => {
              mockSetToken(token);
              return {
                token,
                user: {
                  id: userId,
                  email,
                  is_admin: false,
                  is_staff: false,
                  balance,
                  commission_balance: commissionBalance,
                  plan_id: null,
                  expired_at: null,
                  u: 0,
                  d: 0,
                  transfer_enable: 0,
                },
              };
            });

            // Login to establish session
            await authStore.login({ email, password: 'password123' });

            // Verify session is established
            expect(authStore.isAuthenticated).toBe(true);
            expect(authStore.token).toBe(token);
            expect(authStore.user).not.toBeNull();
            expect(localStorage.getItem('auth_token')).toBe(token);
            expect(localStorage.getItem('user_type')).toBe('user');

            // Simulate session expiration by clearing auth
            authStore.clearAuth();

            // Verify all authentication data is cleared
            expect(authStore.token).toBeNull();
            expect(authStore.user).toBeNull();
            expect(authStore.isAuthenticated).toBe(false);
            expect(localStorage.getItem('auth_token')).toBeNull();
            expect(localStorage.getItem('user_type')).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear session data when fetchUser fails (invalid token)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            token: fc.string({ minLength: 32, maxLength: 128 }),
            errorMessage: fc.string({ minLength: 10, maxLength: 100 }),
          }),
          async ({ token, errorMessage }) => {
            // Reset for each property test run
            vi.clearAllMocks();
            localStorageMock.clear();
            
            const freshPinia = createPinia();
            setActivePinia(freshPinia);
            const authStore = useAuthStore();

            // Set token directly (simulating existing session)
            authStore.setToken(token);
            expect(authStore.token).toBe(token);

            // Mock failed fetchUser (expired/invalid token)
            mockGetCurrentUser.mockRejectedValueOnce(new Error(errorMessage));

            // Attempt to fetch user
            try {
              await authStore.fetchUser();
              // Should not reach here
              expect(true).toBe(false);
            } catch (err: any) {
              // Error should be thrown
              expect(err.message).toBe(errorMessage);
            }

            // Verify session is cleared after fetch failure
            expect(authStore.token).toBeNull();
            expect(authStore.user).toBeNull();
            expect(authStore.isAuthenticated).toBe(false);
            expect(localStorage.getItem('auth_token')).toBeNull();
            expect(localStorage.getItem('user_type')).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle clearAuth when no session exists (idempotent)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // Dummy value for property test
          async () => {
            // Reset for each property test run
            vi.clearAllMocks();
            localStorageMock.clear();
            
            const freshPinia = createPinia();
            setActivePinia(freshPinia);
            const authStore = useAuthStore();

            // Ensure no session exists
            expect(authStore.isAuthenticated).toBe(false);
            expect(authStore.token).toBeNull();
            expect(authStore.user).toBeNull();

            // Call clearAuth on non-existent session
            authStore.clearAuth();

            // Verify state remains cleared (idempotent operation)
            expect(authStore.token).toBeNull();
            expect(authStore.user).toBeNull();
            expect(authStore.isAuthenticated).toBe(false);
            expect(localStorage.getItem('auth_token')).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain cleared state after multiple clearAuth calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            token: fc.string({ minLength: 32, maxLength: 128 }),
            clearCalls: fc.integer({ min: 1, max: 5 }),
          }),
          async ({ token, clearCalls }) => {
            // Reset for each property test run
            vi.clearAllMocks();
            localStorageMock.clear();
            
            const freshPinia = createPinia();
            setActivePinia(freshPinia);
            const authStore = useAuthStore();

            // Mock successful login
            mockUserLogin.mockImplementationOnce(async () => {
              mockSetToken(token);
              return {
                token,
                user: {
                  id: 1,
                  email: 'user@test.com',
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
              };
            });

            // Login
            await authStore.login({ email: 'user@test.com', password: 'password' });
            expect(authStore.isAuthenticated).toBe(true);

            // Call clearAuth multiple times
            for (let i = 0; i < clearCalls; i++) {
              authStore.clearAuth();

              // Verify state remains cleared after each call
              expect(authStore.token).toBeNull();
              expect(authStore.user).toBeNull();
              expect(authStore.isAuthenticated).toBe(false);
              expect(localStorage.getItem('auth_token')).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Session Lifecycle Invariants', () => {
    it('should ensure login and clearAuth are inverse operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 64 }),
            token: fc.string({ minLength: 32, maxLength: 128 }),
          }),
          async ({ email, password, token }) => {
            // Reset for each property test run
            vi.clearAllMocks();
            localStorageMock.clear();
            
            const freshPinia = createPinia();
            setActivePinia(freshPinia);
            const authStore = useAuthStore();

            // Initial state (not authenticated)
            const initialState = {
              token: authStore.token,
              user: authStore.user,
              isAuthenticated: authStore.isAuthenticated,
            };

            // Mock successful login
            mockUserLogin.mockImplementationOnce(async () => {
              mockSetToken(token);
              return {
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
              };
            });

            // Login (changes state)
            await authStore.login({ email, password });
            expect(authStore.isAuthenticated).toBe(true);

            // ClearAuth (should return to initial state)
            authStore.clearAuth();

            // Verify we're back to initial state
            expect(authStore.token).toBe(initialState.token);
            expect(authStore.user).toBe(initialState.user);
            expect(authStore.isAuthenticated).toBe(initialState.isAuthenticated);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
