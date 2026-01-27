/**
 * Property-Based Tests for Auth Store
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
const mockAdminLogin = vi.fn();
const mockGetToken = vi.fn();
const mockSetToken = vi.fn();
const mockRemoveToken = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogout = vi.fn();

vi.mock('@xboard/shared', () => ({
  authService: {
    adminLogin: mockAdminLogin,
    getToken: mockGetToken,
    setToken: mockSetToken,
    removeToken: mockRemoveToken,
    getCurrentUser: mockGetCurrentUser,
    logout: mockLogout,
  },
}));

// Import after mocking
const { useAuthStore } = await import('../../stores/auth');

describe('Auth Store Property Tests', () => {
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
    });
    mockRemoveToken.mockImplementation(() => {
      localStorageMock.removeItem('auth_token');
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 2: Session expiration cleanup', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 2: Session expiration cleanup
     * Validates: Requirements 1.2
     * 
     * For any expired session, the system should redirect to the login page
     * and clear all authentication data from local storage.
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
            const authStore = useAuthStore();

            // Mock successful login
            mockAdminLogin.mockResolvedValueOnce({
              token,
              user: {
                id: userId,
                email,
                is_admin: true,
                is_staff: true,
                balance,
                commission_balance: commissionBalance,
                plan_id: null,
                expired_at: null,
                u: 0,
                d: 0,
                transfer_enable: 0,
              },
            });

            // Login to establish session
            await authStore.login({ email, password: 'password123' });

            // Verify session is established
            expect(authStore.isAuthenticated).toBe(true);
            expect(authStore.token).toBe(token);
            expect(authStore.user).not.toBeNull();
            expect(localStorage.getItem('auth_token')).toBe(token);
            expect(localStorage.getItem('user_type')).toBe('admin');

            // Simulate session expiration
            authStore.handleSessionExpiration();

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

    it('should clear theme and sidebar preferences on session expiration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            token: fc.string({ minLength: 32, maxLength: 128 }),
            theme: fc.constantFrom('light', 'dark'),
            sidebarCollapsed: fc.boolean(),
          }),
          async ({ token, theme, sidebarCollapsed }) => {
            const authStore = useAuthStore();

            // Mock successful login
            mockAdminLogin.mockResolvedValueOnce({
              token,
              user: {
                id: 1,
                email: 'admin@test.com',
                is_admin: true,
                is_staff: true,
                balance: 0,
                commission_balance: 0,
                plan_id: null,
                expired_at: null,
                u: 0,
                d: 0,
                transfer_enable: 0,
              },
            });

            // Login and set preferences
            await authStore.login({ email: 'admin@test.com', password: 'password' });
            localStorage.setItem('theme', theme);
            localStorage.setItem('sidebar_collapsed', sidebarCollapsed.toString());

            // Verify preferences are set
            expect(localStorage.getItem('theme')).toBe(theme);
            expect(localStorage.getItem('sidebar_collapsed')).toBe(sidebarCollapsed.toString());

            // Simulate session expiration
            authStore.handleSessionExpiration();

            // Verify preferences are cleared
            expect(localStorage.getItem('theme')).toBeNull();
            expect(localStorage.getItem('sidebar_collapsed')).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain cleared state after multiple expiration calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            token: fc.string({ minLength: 32, maxLength: 128 }),
            expirationCalls: fc.integer({ min: 1, max: 5 }),
          }),
          async ({ token, expirationCalls }) => {
            const authStore = useAuthStore();

            // Mock successful login
            mockAdminLogin.mockResolvedValueOnce({
              token,
              user: {
                id: 1,
                email: 'admin@test.com',
                is_admin: true,
                is_staff: true,
                balance: 0,
                commission_balance: 0,
                plan_id: null,
                expired_at: null,
                u: 0,
                d: 0,
                transfer_enable: 0,
              },
            });

            // Login
            await authStore.login({ email: 'admin@test.com', password: 'password' });
            expect(authStore.isAuthenticated).toBe(true);

            // Call handleSessionExpiration multiple times
            for (let i = 0; i < expirationCalls; i++) {
              authStore.handleSessionExpiration();

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

    it('should clear session data regardless of user properties', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            token: fc.string({ minLength: 32, maxLength: 128 }),
            userId: fc.integer({ min: 1, max: 10000 }),
            email: fc.emailAddress(),
            isAdmin: fc.boolean(),
            isStaff: fc.boolean(),
            balance: fc.integer({ min: 0, max: 1000000 }),
            commissionBalance: fc.integer({ min: 0, max: 1000000 }),
            planId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
            expiredAt: fc.option(fc.integer({ min: 0 }), { nil: null }),
            u: fc.integer({ min: 0, max: 1000000000 }),
            d: fc.integer({ min: 0, max: 1000000000 }),
            transferEnable: fc.integer({ min: 0, max: 1000000000 }),
          }),
          async (userData) => {
            const authStore = useAuthStore();

            // Mock login with various user properties
            mockAdminLogin.mockResolvedValueOnce({
              token: userData.token,
              user: {
                id: userData.userId,
                email: userData.email,
                is_admin: userData.isAdmin,
                is_staff: userData.isStaff,
                balance: userData.balance,
                commission_balance: userData.commissionBalance,
                plan_id: userData.planId,
                expired_at: userData.expiredAt,
                u: userData.u,
                d: userData.d,
                transfer_enable: userData.transferEnable,
              },
            });

            // Login
            await authStore.login({ email: userData.email, password: 'password' });

            // Simulate session expiration
            authStore.handleSessionExpiration();

            // Verify all data is cleared regardless of user properties
            expect(authStore.token).toBeNull();
            expect(authStore.user).toBeNull();
            expect(authStore.isAuthenticated).toBe(false);
            expect(authStore.isAdmin).toBe(false);
            expect(authStore.userEmail).toBe('');
            expect(localStorage.getItem('auth_token')).toBeNull();
            expect(localStorage.getItem('user_type')).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle session expiration when no session exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // Dummy value for property test
          async () => {
            const authStore = useAuthStore();

            // Ensure no session exists
            expect(authStore.isAuthenticated).toBe(false);
            expect(authStore.token).toBeNull();
            expect(authStore.user).toBeNull();

            // Call handleSessionExpiration on non-existent session
            authStore.handleSessionExpiration();

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
  });

  describe('Property 3: Logout cleanup', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 3: Logout cleanup
     * Validates: Requirements 1.3
     * 
     * For any authenticated user, when logout is triggered,
     * the system should clear all authentication tokens and user data
     * from local storage.
     */

    it('should clear all authentication data for any authenticated user on logout', async () => {
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
            // Reset mocks for each property test run
            vi.clearAllMocks();
            
            // Reset localStorage
            localStorageMock.clear();
            
            // Create fresh Pinia instance for each test run
            const freshPinia = createPinia();
            setActivePinia(freshPinia);
            
            const authStore = useAuthStore();

            // Mock successful login
            mockAdminLogin.mockResolvedValueOnce({
              token,
              user: {
                id: userId,
                email,
                is_admin: true,
                is_staff: true,
                balance,
                commission_balance: commissionBalance,
                plan_id: null,
                expired_at: null,
                u: 0,
                d: 0,
                transfer_enable: 0,
              },
            });

            // Mock successful logout
            mockLogout.mockResolvedValueOnce(undefined);

            // Login to establish session
            await authStore.login({ email, password: 'password123' });

            // Verify session is established
            expect(authStore.isAuthenticated).toBe(true);
            expect(authStore.token).toBe(token);
            expect(authStore.user).not.toBeNull();
            expect(localStorage.getItem('auth_token')).toBe(token);
            expect(localStorage.getItem('user_type')).toBe('admin');

            // Logout
            await authStore.logout();

            // Verify all authentication data is cleared
            expect(authStore.token).toBeNull();
            expect(authStore.user).toBeNull();
            expect(authStore.isAuthenticated).toBe(false);
            expect(localStorage.getItem('auth_token')).toBeNull();
            expect(localStorage.getItem('user_type')).toBeNull();
            
            // Verify logout API was called
            expect(mockLogout).toHaveBeenCalledOnce();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear all stored preferences on logout', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            token: fc.string({ minLength: 32, maxLength: 128 }),
            theme: fc.constantFrom('light', 'dark'),
            sidebarCollapsed: fc.boolean(),
          }),
          async ({ token, theme, sidebarCollapsed }) => {
            const authStore = useAuthStore();

            // Mock successful login
            mockAdminLogin.mockResolvedValueOnce({
              token,
              user: {
                id: 1,
                email: 'admin@test.com',
                is_admin: true,
                is_staff: true,
                balance: 0,
                commission_balance: 0,
                plan_id: null,
                expired_at: null,
                u: 0,
                d: 0,
                transfer_enable: 0,
              },
            });

            // Mock successful logout
            mockLogout.mockResolvedValueOnce(undefined);

            // Login and set preferences
            await authStore.login({ email: 'admin@test.com', password: 'password' });
            localStorage.setItem('theme', theme);
            localStorage.setItem('sidebar_collapsed', sidebarCollapsed.toString());

            // Verify preferences are set
            expect(localStorage.getItem('theme')).toBe(theme);
            expect(localStorage.getItem('sidebar_collapsed')).toBe(sidebarCollapsed.toString());

            // Logout
            await authStore.logout();

            // Verify all preferences are cleared
            expect(localStorage.getItem('theme')).toBeNull();
            expect(localStorage.getItem('sidebar_collapsed')).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear authentication data even when logout API fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            token: fc.string({ minLength: 32, maxLength: 128 }),
            errorMessage: fc.string({ minLength: 10, maxLength: 100 }),
          }),
          async ({ token, errorMessage }) => {
            const authStore = useAuthStore();

            // Mock successful login
            mockAdminLogin.mockResolvedValueOnce({
              token,
              user: {
                id: 1,
                email: 'admin@test.com',
                is_admin: true,
                is_staff: true,
                balance: 0,
                commission_balance: 0,
                plan_id: null,
                expired_at: null,
                u: 0,
                d: 0,
                transfer_enable: 0,
              },
            });

            // Mock failed logout API call
            mockLogout.mockRejectedValueOnce(new Error(errorMessage));

            // Login
            await authStore.login({ email: 'admin@test.com', password: 'password' });
            expect(authStore.isAuthenticated).toBe(true);

            // Logout (should not throw even if API fails)
            await authStore.logout();

            // Verify local data is cleared despite API failure
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

    it('should clear data for any user type on logout', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            token: fc.string({ minLength: 32, maxLength: 128 }),
            userId: fc.integer({ min: 1, max: 10000 }),
            email: fc.emailAddress(),
            isAdmin: fc.boolean(),
            isStaff: fc.boolean(),
            balance: fc.integer({ min: 0, max: 1000000 }),
            commissionBalance: fc.integer({ min: 0, max: 1000000 }),
            planId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
            expiredAt: fc.option(fc.integer({ min: 0 }), { nil: null }),
            u: fc.integer({ min: 0, max: 1000000000 }),
            d: fc.integer({ min: 0, max: 1000000000 }),
            transferEnable: fc.integer({ min: 0, max: 1000000000 }),
          }),
          async (userData) => {
            const authStore = useAuthStore();

            // Mock login with various user properties
            mockAdminLogin.mockResolvedValueOnce({
              token: userData.token,
              user: {
                id: userData.userId,
                email: userData.email,
                is_admin: userData.isAdmin,
                is_staff: userData.isStaff,
                balance: userData.balance,
                commission_balance: userData.commissionBalance,
                plan_id: userData.planId,
                expired_at: userData.expiredAt,
                u: userData.u,
                d: userData.d,
                transfer_enable: userData.transferEnable,
              },
            });

            // Mock successful logout
            mockLogout.mockResolvedValueOnce(undefined);

            // Login
            await authStore.login({ email: userData.email, password: 'password' });

            // Logout
            await authStore.logout();

            // Verify all data is cleared regardless of user properties
            expect(authStore.token).toBeNull();
            expect(authStore.user).toBeNull();
            expect(authStore.isAuthenticated).toBe(false);
            expect(authStore.isAdmin).toBe(false);
            expect(authStore.userEmail).toBe('');
            expect(localStorage.getItem('auth_token')).toBeNull();
            expect(localStorage.getItem('user_type')).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle logout when no session exists (idempotent)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // Dummy value for property test
          async () => {
            const authStore = useAuthStore();

            // Mock successful logout (even though no session exists)
            mockLogout.mockResolvedValueOnce(undefined);

            // Ensure no session exists
            expect(authStore.isAuthenticated).toBe(false);
            expect(authStore.token).toBeNull();
            expect(authStore.user).toBeNull();

            // Call logout on non-existent session
            await authStore.logout();

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

    it('should maintain cleared state after multiple logout calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            token: fc.string({ minLength: 32, maxLength: 128 }),
            logoutCalls: fc.integer({ min: 1, max: 5 }),
          }),
          async ({ token, logoutCalls }) => {
            const authStore = useAuthStore();

            // Mock successful login
            mockAdminLogin.mockResolvedValueOnce({
              token,
              user: {
                id: 1,
                email: 'admin@test.com',
                is_admin: true,
                is_staff: true,
                balance: 0,
                commission_balance: 0,
                plan_id: null,
                expired_at: null,
                u: 0,
                d: 0,
                transfer_enable: 0,
              },
            });

            // Login
            await authStore.login({ email: 'admin@test.com', password: 'password' });
            expect(authStore.isAuthenticated).toBe(true);

            // Call logout multiple times
            for (let i = 0; i < logoutCalls; i++) {
              // Mock successful logout for each call
              mockLogout.mockResolvedValueOnce(undefined);
              
              await authStore.logout();

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

    it('should clear authentication state completely on logout', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            token: fc.string({ minLength: 32, maxLength: 128 }),
            email: fc.emailAddress(),
          }),
          async ({ token, email }) => {
            const authStore = useAuthStore();

            // Mock successful login
            mockAdminLogin.mockResolvedValueOnce({
              token,
              user: {
                id: 1,
                email,
                is_admin: true,
                is_staff: true,
                balance: 0,
                commission_balance: 0,
                plan_id: null,
                expired_at: null,
                u: 0,
                d: 0,
                transfer_enable: 0,
              },
            });

            // Mock successful logout
            mockLogout.mockResolvedValueOnce(undefined);

            // Login
            await authStore.login({ email, password: 'password' });

            // Verify authenticated state
            expect(authStore.isAuthenticated).toBe(true);
            expect(authStore.isAdmin).toBe(true);
            expect(authStore.userEmail).toBe(email);

            // Logout
            await authStore.logout();

            // Verify all computed properties return default values
            expect(authStore.isAuthenticated).toBe(false);
            expect(authStore.isAdmin).toBe(false);
            expect(authStore.userEmail).toBe('');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Cleanup Invariants', () => {
    it('should ensure clearAuth is called by both logout and handleSessionExpiration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            token: fc.string({ minLength: 32, maxLength: 128 }),
            useLogout: fc.boolean(), // true = logout, false = handleSessionExpiration
          }),
          async ({ token, useLogout }) => {
            const authStore = useAuthStore();

            // Mock successful login
            mockAdminLogin.mockResolvedValueOnce({
              token,
              user: {
                id: 1,
                email: 'admin@test.com',
                is_admin: true,
                is_staff: true,
                balance: 0,
                commission_balance: 0,
                plan_id: null,
                expired_at: null,
                u: 0,
                d: 0,
                transfer_enable: 0,
              },
            });

            // Login
            await authStore.login({ email: 'admin@test.com', password: 'password' });
            expect(authStore.isAuthenticated).toBe(true);

            // Call either logout or handleSessionExpiration
            if (useLogout) {
              mockLogout.mockResolvedValueOnce(undefined);
              await authStore.logout();
            } else {
              authStore.handleSessionExpiration();
            }

            // Both methods should result in the same cleared state
            expect(authStore.token).toBeNull();
            expect(authStore.user).toBeNull();
            expect(authStore.isAuthenticated).toBe(false);
            expect(localStorage.getItem('auth_token')).toBeNull();
            expect(localStorage.getItem('user_type')).toBeNull();
            expect(localStorage.getItem('theme')).toBeNull();
            expect(localStorage.getItem('sidebar_collapsed')).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
