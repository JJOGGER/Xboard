/**
 * Property-Based Tests for User Store Operations
 * Feature: vue-admin-user-frontend
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { createPinia, setActivePinia } from 'pinia';
import type { User } from '@xboard/shared/types';

// Mock apiClient
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('@xboard/shared/api', () => ({
  apiClient: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
  },
}));

// Import after mocking
const { useUserStore } = await import('../../stores/user');

describe('User Store Property Tests', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    // Create fresh Pinia instance
    pinia = createPinia();
    setActivePinia(pinia);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 7: Update synchronization', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 7: Update synchronization
     * Validates: Requirements 3.3
     * 
     * For any data update operation, when the API call succeeds,
     * the local state should reflect the updated values.
     */

    it('should synchronize local state with API response for any user update', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.integer({ min: 1, max: 10000 }),
            originalEmail: fc.emailAddress(),
            updatedEmail: fc.emailAddress(),
            originalBalance: fc.integer({ min: 0, max: 100000 }),
            updatedBalance: fc.integer({ min: 0, max: 100000 }),
            originalCommissionBalance: fc.integer({ min: 0, max: 50000 }),
            updatedCommissionBalance: fc.integer({ min: 0, max: 50000 }),
            originalPlanId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
            updatedPlanId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
            originalExpiredAt: fc.option(fc.integer({ min: 0 }), { nil: null }),
            updatedExpiredAt: fc.option(fc.integer({ min: 0 }), { nil: null }),
            originalBanned: fc.constantFrom(0, 1),
            updatedBanned: fc.constantFrom(0, 1),
          }),
          async (data) => {
            const userStore = useUserStore();

            // Create original user
            const originalUser: User = {
              id: data.userId,
              email: data.originalEmail,
              balance: data.originalBalance,
              commission_balance: data.originalCommissionBalance,
              plan_id: data.originalPlanId,
              expired_at: data.originalExpiredAt,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: data.originalBanned,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            };

            // Create updated user
            const updatedUser: User = {
              ...originalUser,
              email: data.updatedEmail,
              balance: data.updatedBalance,
              commission_balance: data.updatedCommissionBalance,
              plan_id: data.updatedPlanId,
              expired_at: data.updatedExpiredAt,
              banned: data.updatedBanned,
              updated_at: '2024-01-02T00:00:00Z',
            };

            // Set original user in store
            userStore.users = [originalUser];
            userStore.currentUser = originalUser;

            // Mock successful update API call
            mockPut.mockResolvedValueOnce({
              data: {
                data: updatedUser,
              },
            });

            // Perform update
            await userStore.updateUser(data.userId, {
              email: data.updatedEmail,
              balance: data.updatedBalance,
              commission_balance: data.updatedCommissionBalance,
              plan_id: data.updatedPlanId,
              expired_at: data.updatedExpiredAt,
              banned: data.updatedBanned,
            });

            // Verify local state is synchronized with API response
            expect(userStore.users[0]).toEqual(updatedUser);
            expect(userStore.currentUser).toEqual(updatedUser);
            expect(userStore.users[0].email).toBe(data.updatedEmail);
            expect(userStore.users[0].balance).toBe(data.updatedBalance);
            expect(userStore.users[0].commission_balance).toBe(data.updatedCommissionBalance);
            expect(userStore.users[0].plan_id).toBe(data.updatedPlanId);
            expect(userStore.users[0].expired_at).toBe(data.updatedExpiredAt);
            expect(userStore.users[0].banned).toBe(data.updatedBanned);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should synchronize balance adjustments with API response', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.integer({ min: 1, max: 10000 }),
            originalBalance: fc.integer({ min: 0, max: 100000 }),
            adjustmentAmount: fc.integer({ min: -50000, max: 50000 }),
          }),
          async ({ userId, originalBalance, adjustmentAmount }) => {
            const userStore = useUserStore();

            const newBalance = Math.max(0, originalBalance + adjustmentAmount);

            // Create original user
            const originalUser: User = {
              id: userId,
              email: 'user@test.com',
              balance: originalBalance,
              commission_balance: 0,
              plan_id: null,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            };

            // Create updated user with new balance
            const updatedUser: User = {
              ...originalUser,
              balance: newBalance,
              updated_at: '2024-01-02T00:00:00Z',
            };

            // Set original user in store
            userStore.users = [originalUser];
            userStore.currentUser = originalUser;

            // Mock successful balance adjustment API call
            mockPost.mockResolvedValueOnce({
              data: {
                data: updatedUser,
              },
            });

            // Perform balance adjustment
            await userStore.adjustBalance(userId, adjustmentAmount);

            // Verify local state is synchronized with API response
            expect(userStore.users[0].balance).toBe(newBalance);
            expect(userStore.currentUser?.balance).toBe(newBalance);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should synchronize traffic adjustments with API response', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.integer({ min: 1, max: 10000 }),
            originalTransferEnable: fc.integer({ min: 0, max: 1000000000 }),
            newTransferEnable: fc.integer({ min: 0, max: 1000000000 }),
          }),
          async ({ userId, originalTransferEnable, newTransferEnable }) => {
            const userStore = useUserStore();

            // Create original user
            const originalUser: User = {
              id: userId,
              email: 'user@test.com',
              balance: 0,
              commission_balance: 0,
              plan_id: null,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: originalTransferEnable,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            };

            // Create updated user with new traffic
            const updatedUser: User = {
              ...originalUser,
              transfer_enable: newTransferEnable,
              updated_at: '2024-01-02T00:00:00Z',
            };

            // Set original user in store
            userStore.users = [originalUser];
            userStore.currentUser = originalUser;

            // Mock successful traffic adjustment API call
            mockPost.mockResolvedValueOnce({
              data: {
                data: updatedUser,
              },
            });

            // Perform traffic adjustment
            await userStore.adjustTraffic(userId, newTransferEnable);

            // Verify local state is synchronized with API response
            expect(userStore.users[0].transfer_enable).toBe(newTransferEnable);
            expect(userStore.currentUser?.transfer_enable).toBe(newTransferEnable);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should synchronize referral updates with API response', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.integer({ min: 1, max: 10000 }),
            originalInviteUserId: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: null }),
            newInviteUserId: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: null }),
          }),
          async ({ userId, originalInviteUserId, newInviteUserId }) => {
            const userStore = useUserStore();

            // Create original user
            const originalUser: User = {
              id: userId,
              email: 'user@test.com',
              balance: 0,
              commission_balance: 0,
              plan_id: null,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: originalInviteUserId,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            };

            // Create updated user with new referral
            const updatedUser: User = {
              ...originalUser,
              invite_user_id: newInviteUserId,
              updated_at: '2024-01-02T00:00:00Z',
            };

            // Set original user in store
            userStore.users = [originalUser];
            userStore.currentUser = originalUser;

            // Mock successful referral update API call
            mockPost.mockResolvedValueOnce({
              data: {
                data: updatedUser,
              },
            });

            // Perform referral update
            await userStore.updateReferral(userId, newInviteUserId);

            // Verify local state is synchronized with API response
            expect(userStore.users[0].invite_user_id).toBe(newInviteUserId);
            expect(userStore.currentUser?.invite_user_id).toBe(newInviteUserId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update user in list but not currentUser when different user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            listUserId: fc.integer({ min: 1, max: 10000 }),
            currentUserId: fc.integer({ min: 10001, max: 20000 }),
            updatedBalance: fc.integer({ min: 0, max: 100000 }),
          }),
          async ({ listUserId, currentUserId, updatedBalance }) => {
            const userStore = useUserStore();

            // Create user in list
            const listUser: User = {
              id: listUserId,
              email: 'list@test.com',
              balance: 0,
              commission_balance: 0,
              plan_id: null,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            };

            // Create current user (different from list user)
            const currentUser: User = {
              ...listUser,
              id: currentUserId,
              email: 'current@test.com',
            };

            // Create updated list user
            const updatedListUser: User = {
              ...listUser,
              balance: updatedBalance,
              updated_at: '2024-01-02T00:00:00Z',
            };

            // Set users in store
            userStore.users = [listUser];
            userStore.currentUser = currentUser;

            // Mock successful update API call
            mockPut.mockResolvedValueOnce({
              data: {
                data: updatedListUser,
              },
            });

            // Perform update on list user
            await userStore.updateUser(listUserId, { balance: updatedBalance });

            // Verify list user is updated
            expect(userStore.users[0].balance).toBe(updatedBalance);
            
            // Verify currentUser is NOT updated (different user)
            expect(userStore.currentUser?.balance).toBe(0);
            expect(userStore.currentUser?.id).toBe(currentUserId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain synchronization across multiple updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.integer({ min: 1, max: 10000 }),
            updates: fc.array(
              fc.record({
                balance: fc.integer({ min: 0, max: 100000 }),
                commissionBalance: fc.integer({ min: 0, max: 50000 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
          }),
          async ({ userId, updates }) => {
            const userStore = useUserStore();

            // Create initial user
            let currentUser: User = {
              id: userId,
              email: 'user@test.com',
              balance: 0,
              commission_balance: 0,
              plan_id: null,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            };

            userStore.users = [currentUser];
            userStore.currentUser = currentUser;

            // Apply each update sequentially
            for (const update of updates) {
              const updatedUser: User = {
                ...currentUser,
                balance: update.balance,
                commission_balance: update.commissionBalance,
                updated_at: new Date().toISOString(),
              };

              // Mock successful update API call
              mockPut.mockResolvedValueOnce({
                data: {
                  data: updatedUser,
                },
              });

              // Perform update
              await userStore.updateUser(userId, {
                balance: update.balance,
                commission_balance: update.commissionBalance,
              });

              // Verify synchronization after each update
              expect(userStore.users[0].balance).toBe(update.balance);
              expect(userStore.users[0].commission_balance).toBe(update.commissionBalance);
              expect(userStore.currentUser?.balance).toBe(update.balance);
              expect(userStore.currentUser?.commission_balance).toBe(update.commissionBalance);

              // Update current user for next iteration
              currentUser = updatedUser;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: State toggle consistency', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 8: State toggle consistency
     * Validates: Requirements 3.4
     * 
     * For any toggleable state (ban/unban, show/hide), applying the toggle
     * twice should return to the original state.
     */

    it('should return to original state after toggling ban/unban twice', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.integer({ min: 1, max: 10000 }),
            initialBannedState: fc.constantFrom(0, 1),
          }),
          async ({ userId, initialBannedState }) => {
            const userStore = useUserStore();

            // Create user with initial banned state
            const initialUser: User = {
              id: userId,
              email: 'user@test.com',
              balance: 0,
              commission_balance: 0,
              plan_id: null,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: initialBannedState,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            };

            // Set user in store
            userStore.users = [initialUser];
            userStore.currentUser = initialUser;

            // Record initial state
            const originalBannedState = initialBannedState;

            // First toggle
            if (initialBannedState === 0) {
              // Ban the user
              mockPost.mockResolvedValueOnce({ data: {} });
              await userStore.banUser(userId);
              expect(userStore.users[0].banned).toBe(1);
              expect(userStore.currentUser?.banned).toBe(1);
            } else {
              // Unban the user
              mockPost.mockResolvedValueOnce({ data: {} });
              await userStore.unbanUser(userId);
              expect(userStore.users[0].banned).toBe(0);
              expect(userStore.currentUser?.banned).toBe(0);
            }

            // Second toggle (should return to original state)
            if (initialBannedState === 0) {
              // Unban the user (return to original unbanned state)
              mockPost.mockResolvedValueOnce({ data: {} });
              await userStore.unbanUser(userId);
            } else {
              // Ban the user (return to original banned state)
              mockPost.mockResolvedValueOnce({ data: {} });
              await userStore.banUser(userId);
            }

            // Verify state returned to original
            expect(userStore.users[0].banned).toBe(originalBannedState);
            expect(userStore.currentUser?.banned).toBe(originalBannedState);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency after multiple ban/unban toggles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.integer({ min: 1, max: 10000 }),
            initialBannedState: fc.constantFrom(0, 1),
            toggleCount: fc.integer({ min: 2, max: 10 }).filter((n) => n % 2 === 0), // Even number of toggles
          }),
          async ({ userId, initialBannedState, toggleCount }) => {
            const userStore = useUserStore();

            // Create user with initial banned state
            const initialUser: User = {
              id: userId,
              email: 'user@test.com',
              balance: 0,
              commission_balance: 0,
              plan_id: null,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: initialBannedState,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            };

            // Set user in store
            userStore.users = [initialUser];
            userStore.currentUser = initialUser;

            // Record initial state
            const originalBannedState = initialBannedState;
            let currentState = initialBannedState;

            // Apply toggles
            for (let i = 0; i < toggleCount; i++) {
              mockPost.mockResolvedValueOnce({ data: {} });

              if (currentState === 0) {
                await userStore.banUser(userId);
                currentState = 1;
              } else {
                await userStore.unbanUser(userId);
                currentState = 0;
              }
            }

            // After even number of toggles, should return to original state
            expect(userStore.users[0].banned).toBe(originalBannedState);
            expect(userStore.currentUser?.banned).toBe(originalBannedState);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should toggle correctly for any user in the list', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userCount: fc.integer({ min: 1, max: 10 }),
            targetUserIndex: fc.integer({ min: 0, max: 9 }),
            initialBannedState: fc.constantFrom(0, 1),
          }),
          async ({ userCount, targetUserIndex, initialBannedState }) => {
            // Ensure targetUserIndex is within bounds
            const actualIndex = targetUserIndex % userCount;

            const userStore = useUserStore();

            // Create multiple users
            const users: User[] = Array.from({ length: userCount }, (_, i) => ({
              id: i + 1,
              email: `user${i + 1}@test.com`,
              balance: 0,
              commission_balance: 0,
              plan_id: null,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: i === actualIndex ? initialBannedState : 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            // Set users in store
            userStore.users = users;

            const targetUserId = users[actualIndex].id;
            const originalState = initialBannedState;

            // First toggle
            mockPost.mockResolvedValueOnce({ data: {} });
            if (initialBannedState === 0) {
              await userStore.banUser(targetUserId);
              expect(userStore.users[actualIndex].banned).toBe(1);
            } else {
              await userStore.unbanUser(targetUserId);
              expect(userStore.users[actualIndex].banned).toBe(0);
            }

            // Verify other users are not affected
            for (let i = 0; i < userCount; i++) {
              if (i !== actualIndex) {
                expect(userStore.users[i].banned).toBe(0);
              }
            }

            // Second toggle (return to original)
            mockPost.mockResolvedValueOnce({ data: {} });
            if (initialBannedState === 0) {
              await userStore.unbanUser(targetUserId);
            } else {
              await userStore.banUser(targetUserId);
            }

            // Verify target user returned to original state
            expect(userStore.users[actualIndex].banned).toBe(originalState);

            // Verify other users still not affected
            for (let i = 0; i < userCount; i++) {
              if (i !== actualIndex) {
                expect(userStore.users[i].banned).toBe(0);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain toggle consistency in both users list and currentUser', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.integer({ min: 1, max: 10000 }),
            initialBannedState: fc.constantFrom(0, 1),
          }),
          async ({ userId, initialBannedState }) => {
            const userStore = useUserStore();

            // Create user
            const user: User = {
              id: userId,
              email: 'user@test.com',
              balance: 0,
              commission_balance: 0,
              plan_id: null,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: initialBannedState,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            };

            // Set user in both list and currentUser
            userStore.users = [user];
            userStore.currentUser = user;

            // First toggle
            mockPost.mockResolvedValueOnce({ data: {} });
            if (initialBannedState === 0) {
              await userStore.banUser(userId);
            } else {
              await userStore.unbanUser(userId);
            }

            // Verify both list and currentUser are updated
            const expectedFirstState = initialBannedState === 0 ? 1 : 0;
            expect(userStore.users[0].banned).toBe(expectedFirstState);
            expect(userStore.currentUser?.banned).toBe(expectedFirstState);

            // Second toggle
            mockPost.mockResolvedValueOnce({ data: {} });
            if (initialBannedState === 0) {
              await userStore.unbanUser(userId);
            } else {
              await userStore.banUser(userId);
            }

            // Verify both returned to original state
            expect(userStore.users[0].banned).toBe(initialBannedState);
            expect(userStore.currentUser?.banned).toBe(initialBannedState);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle toggle idempotency - multiple bans on already banned user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.integer({ min: 1, max: 10000 }),
            banAttempts: fc.integer({ min: 1, max: 5 }),
          }),
          async ({ userId, banAttempts }) => {
            const userStore = useUserStore();

            // Create unbanned user
            const user: User = {
              id: userId,
              email: 'user@test.com',
              balance: 0,
              commission_balance: 0,
              plan_id: null,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            };

            userStore.users = [user];
            userStore.currentUser = user;

            // Ban user multiple times
            for (let i = 0; i < banAttempts; i++) {
              mockPost.mockResolvedValueOnce({ data: {} });
              await userStore.banUser(userId);

              // Should remain banned (idempotent)
              expect(userStore.users[0].banned).toBe(1);
              expect(userStore.currentUser?.banned).toBe(1);
            }

            // Single unban should return to unbanned state
            mockPost.mockResolvedValueOnce({ data: {} });
            await userStore.unbanUser(userId);

            expect(userStore.users[0].banned).toBe(0);
            expect(userStore.currentUser?.banned).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle toggle idempotency - multiple unbans on already unbanned user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.integer({ min: 1, max: 10000 }),
            unbanAttempts: fc.integer({ min: 1, max: 5 }),
          }),
          async ({ userId, unbanAttempts }) => {
            const userStore = useUserStore();

            // Create banned user
            const user: User = {
              id: userId,
              email: 'user@test.com',
              balance: 0,
              commission_balance: 0,
              plan_id: null,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: 1,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            };

            userStore.users = [user];
            userStore.currentUser = user;

            // Unban user multiple times
            for (let i = 0; i < unbanAttempts; i++) {
              mockPost.mockResolvedValueOnce({ data: {} });
              await userStore.unbanUser(userId);

              // Should remain unbanned (idempotent)
              expect(userStore.users[0].banned).toBe(0);
              expect(userStore.currentUser?.banned).toBe(0);
            }

            // Single ban should return to banned state
            mockPost.mockResolvedValueOnce({ data: {} });
            await userStore.banUser(userId);

            expect(userStore.users[0].banned).toBe(1);
            expect(userStore.currentUser?.banned).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain toggle consistency across different user properties', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.integer({ min: 1, max: 10000 }),
            email: fc.emailAddress(),
            balance: fc.integer({ min: 0, max: 100000 }),
            commissionBalance: fc.integer({ min: 0, max: 50000 }),
            planId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
            transferEnable: fc.integer({ min: 0, max: 1000000000 }),
            initialBannedState: fc.constantFrom(0, 1),
          }),
          async (userData) => {
            const userStore = useUserStore();

            // Create user with various properties
            const user: User = {
              id: userData.userId,
              email: userData.email,
              balance: userData.balance,
              commission_balance: userData.commissionBalance,
              plan_id: userData.planId,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: userData.transferEnable,
              banned: userData.initialBannedState,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            };

            userStore.users = [user];
            userStore.currentUser = user;

            // First toggle
            mockPost.mockResolvedValueOnce({ data: {} });
            if (userData.initialBannedState === 0) {
              await userStore.banUser(userData.userId);
            } else {
              await userStore.unbanUser(userData.userId);
            }

            // Verify other properties remain unchanged
            expect(userStore.users[0].email).toBe(userData.email);
            expect(userStore.users[0].balance).toBe(userData.balance);
            expect(userStore.users[0].commission_balance).toBe(userData.commissionBalance);
            expect(userStore.users[0].plan_id).toBe(userData.planId);
            expect(userStore.users[0].transfer_enable).toBe(userData.transferEnable);

            // Second toggle
            mockPost.mockResolvedValueOnce({ data: {} });
            if (userData.initialBannedState === 0) {
              await userStore.unbanUser(userData.userId);
            } else {
              await userStore.banUser(userData.userId);
            }

            // Verify returned to original state and other properties still unchanged
            expect(userStore.users[0].banned).toBe(userData.initialBannedState);
            expect(userStore.users[0].email).toBe(userData.email);
            expect(userStore.users[0].balance).toBe(userData.balance);
            expect(userStore.users[0].commission_balance).toBe(userData.commissionBalance);
            expect(userStore.users[0].plan_id).toBe(userData.planId);
            expect(userStore.users[0].transfer_enable).toBe(userData.transferEnable);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Pagination consistency', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 5: Pagination consistency
     * Validates: Requirements 3.1
     * 
     * For any paginated data set, the total number of items across all pages
     * should equal the reported total count.
     */

    it('should maintain total count consistency across all pages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            totalItems: fc.integer({ min: 1, max: 100 }),
            pageSize: fc.integer({ min: 5, max: 20 }),
          }),
          async ({ totalItems, pageSize }) => {
            const userStore = useUserStore();

            // Calculate expected number of pages
            const totalPages = Math.ceil(totalItems / pageSize);

            // Generate users for all pages
            const allUsers: User[] = Array.from({ length: totalItems }, (_, i) => ({
              id: i + 1,
              email: `user${i + 1}@test.com`,
              balance: 0,
              commission_balance: 0,
              plan_id: null,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            let collectedItems = 0;

            // Fetch all pages and count items
            for (let page = 1; page <= totalPages; page++) {
              const startIndex = (page - 1) * pageSize;
              const endIndex = Math.min(startIndex + pageSize, totalItems);
              const pageUsers = allUsers.slice(startIndex, endIndex);

              // Mock API response for this page
              mockGet.mockResolvedValueOnce({
                data: {
                  data: pageUsers,
                  total: totalItems,
                  current_page: page,
                  per_page: pageSize,
                  last_page: totalPages,
                },
              });

              await userStore.fetchUsers({ page, page_size: pageSize });

              // Count items on this page
              collectedItems += userStore.users.length;

              // Verify page metadata
              expect(userStore.currentPage).toBe(page);
              expect(userStore.pageSize).toBe(pageSize);
              expect(userStore.total).toBe(totalItems);
            }

            // Verify total collected items equals reported total
            expect(collectedItems).toBe(totalItems);
            expect(userStore.total).toBe(totalItems);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency for partial last page', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            totalItems: fc.integer({ min: 1, max: 100 }),
            pageSize: fc.integer({ min: 5, max: 20 }),
          }),
          async ({ totalItems, pageSize }) => {
            // Ensure we have a partial last page
            if (totalItems % pageSize === 0) {
              totalItems += 1;
            }

            const userStore = useUserStore();
            const totalPages = Math.ceil(totalItems / pageSize);
            const lastPageSize = totalItems % pageSize || pageSize;

            // Generate all users
            const allUsers: User[] = Array.from({ length: totalItems }, (_, i) => ({
              id: i + 1,
              email: `user${i + 1}@test.com`,
              balance: 0,
              commission_balance: 0,
              plan_id: null,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            // Fetch last page
            const startIndex = (totalPages - 1) * pageSize;
            const lastPageUsers = allUsers.slice(startIndex);

            mockGet.mockResolvedValueOnce({
              data: {
                data: lastPageUsers,
                total: totalItems,
                current_page: totalPages,
                per_page: pageSize,
                last_page: totalPages,
              },
            });

            await userStore.fetchUsers({ page: totalPages, page_size: pageSize });

            // Verify last page has correct number of items
            expect(userStore.users.length).toBe(lastPageSize);
            expect(userStore.total).toBe(totalItems);
            expect(userStore.currentPage).toBe(totalPages);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency when changing page size', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            totalItems: fc.integer({ min: 20, max: 100 }),
            initialPageSize: fc.integer({ min: 5, max: 15 }),
            newPageSize: fc.integer({ min: 10, max: 25 }),
          }),
          async ({ totalItems, initialPageSize, newPageSize }) => {
            const userStore = useUserStore();

            // Generate all users
            const allUsers: User[] = Array.from({ length: totalItems }, (_, i) => ({
              id: i + 1,
              email: `user${i + 1}@test.com`,
              balance: 0,
              commission_balance: 0,
              plan_id: null,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            // Fetch with initial page size
            const initialTotalPages = Math.ceil(totalItems / initialPageSize);
            mockGet.mockResolvedValueOnce({
              data: {
                data: allUsers.slice(0, initialPageSize),
                total: totalItems,
                current_page: 1,
                per_page: initialPageSize,
                last_page: initialTotalPages,
              },
            });

            await userStore.fetchUsers({ page: 1, page_size: initialPageSize });
            expect(userStore.total).toBe(totalItems);

            // Fetch with new page size
            const newTotalPages = Math.ceil(totalItems / newPageSize);
            mockGet.mockResolvedValueOnce({
              data: {
                data: allUsers.slice(0, newPageSize),
                total: totalItems,
                current_page: 1,
                per_page: newPageSize,
                last_page: newTotalPages,
              },
            });

            await userStore.fetchUsers({ page: 1, page_size: newPageSize });

            // Total should remain consistent
            expect(userStore.total).toBe(totalItems);
            expect(userStore.pageSize).toBe(newPageSize);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle single page correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            itemCount: fc.integer({ min: 1, max: 20 }),
            pageSize: fc.integer({ min: 20, max: 50 }),
          }),
          async ({ itemCount, pageSize }) => {
            const userStore = useUserStore();

            // Generate users (less than page size)
            const users: User[] = Array.from({ length: itemCount }, (_, i) => ({
              id: i + 1,
              email: `user${i + 1}@test.com`,
              balance: 0,
              commission_balance: 0,
              plan_id: null,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            mockGet.mockResolvedValueOnce({
              data: {
                data: users,
                total: itemCount,
                current_page: 1,
                per_page: pageSize,
                last_page: 1,
              },
            });

            await userStore.fetchUsers({ page: 1, page_size: pageSize });

            // Verify single page consistency
            expect(userStore.users.length).toBe(itemCount);
            expect(userStore.total).toBe(itemCount);
            expect(userStore.totalPages).toBe(1);
            expect(userStore.currentPage).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency across random page access', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            totalItems: fc.integer({ min: 30, max: 100 }),
            pageSize: fc.integer({ min: 5, max: 15 }),
            pagesToAccess: fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 2, maxLength: 5 }),
          }),
          async ({ totalItems, pageSize, pagesToAccess }) => {
            const userStore = useUserStore();
            const totalPages = Math.ceil(totalItems / pageSize);

            // Generate all users
            const allUsers: User[] = Array.from({ length: totalItems }, (_, i) => ({
              id: i + 1,
              email: `user${i + 1}@test.com`,
              balance: 0,
              commission_balance: 0,
              plan_id: null,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            // Access random pages
            for (const pageNum of pagesToAccess) {
              const page = Math.min(pageNum, totalPages);
              const startIndex = (page - 1) * pageSize;
              const endIndex = Math.min(startIndex + pageSize, totalItems);
              const pageUsers = allUsers.slice(startIndex, endIndex);

              mockGet.mockResolvedValueOnce({
                data: {
                  data: pageUsers,
                  total: totalItems,
                  current_page: page,
                  per_page: pageSize,
                  last_page: totalPages,
                },
              });

              await userStore.fetchUsers({ page, page_size: pageSize });

              // Verify consistency on each page access
              expect(userStore.total).toBe(totalItems);
              expect(userStore.currentPage).toBe(page);
              expect(userStore.users.length).toBe(pageUsers.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty result set correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10, max: 50 }),
          async (pageSize) => {
            const userStore = useUserStore();

            mockGet.mockResolvedValueOnce({
              data: {
                data: [],
                total: 0,
                current_page: 1,
                per_page: pageSize,
                last_page: 1,
              },
            });

            await userStore.fetchUsers({ page: 1, page_size: pageSize });

            // Verify empty result consistency
            expect(userStore.users.length).toBe(0);
            expect(userStore.total).toBe(0);
            expect(userStore.totalPages).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Filter correctness', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 6: Filter correctness
     * Validates: Requirements 3.2
     * 
     * For any filter criteria applied to a data set, all returned items
     * should match the filter conditions.
     */

    it('should return only users matching search filter', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            searchTerm: fc.string({ minLength: 3, maxLength: 10 }),
            matchingCount: fc.integer({ min: 1, max: 10 }),
            nonMatchingCount: fc.integer({ min: 0, max: 5 }),
          }),
          async ({ searchTerm, matchingCount, nonMatchingCount }) => {
            const userStore = useUserStore();

            // Generate matching users (email contains search term)
            const matchingUsers: User[] = Array.from({ length: matchingCount }, (_, i) => ({
              id: i + 1,
              email: `${searchTerm}user${i + 1}@test.com`,
              balance: 0,
              commission_balance: 0,
              plan_id: null,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            // Mock API response with only matching users
            mockGet.mockResolvedValueOnce({
              data: {
                data: matchingUsers,
                total: matchingCount,
                current_page: 1,
                per_page: 20,
                last_page: 1,
              },
            });

            await userStore.fetchUsers({ search: searchTerm });

            // Verify all returned users match the search term
            expect(userStore.users.length).toBe(matchingCount);
            userStore.users.forEach((user) => {
              expect(user.email.toLowerCase()).toContain(searchTerm.toLowerCase());
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return only users matching plan_id filter', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            targetPlanId: fc.integer({ min: 1, max: 100 }),
            matchingCount: fc.integer({ min: 1, max: 20 }),
          }),
          async ({ targetPlanId, matchingCount }) => {
            const userStore = useUserStore();

            // Generate users with target plan_id
            const matchingUsers: User[] = Array.from({ length: matchingCount }, (_, i) => ({
              id: i + 1,
              email: `user${i + 1}@test.com`,
              balance: 0,
              commission_balance: 0,
              plan_id: targetPlanId,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            mockGet.mockResolvedValueOnce({
              data: {
                data: matchingUsers,
                total: matchingCount,
                current_page: 1,
                per_page: 20,
                last_page: 1,
              },
            });

            await userStore.fetchUsers({ plan_id: targetPlanId });

            // Verify all returned users have the target plan_id
            expect(userStore.users.length).toBe(matchingCount);
            userStore.users.forEach((user) => {
              expect(user.plan_id).toBe(targetPlanId);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return only users matching banned status filter', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bannedStatus: fc.constantFrom(0, 1),
            matchingCount: fc.integer({ min: 1, max: 20 }),
          }),
          async ({ bannedStatus, matchingCount }) => {
            const userStore = useUserStore();

            // Generate users with target banned status
            const matchingUsers: User[] = Array.from({ length: matchingCount }, (_, i) => ({
              id: i + 1,
              email: `user${i + 1}@test.com`,
              balance: 0,
              commission_balance: 0,
              plan_id: null,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: bannedStatus,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            mockGet.mockResolvedValueOnce({
              data: {
                data: matchingUsers,
                total: matchingCount,
                current_page: 1,
                per_page: 20,
                last_page: 1,
              },
            });

            await userStore.fetchUsers({ banned: bannedStatus });

            // Verify all returned users have the target banned status
            expect(userStore.users.length).toBe(matchingCount);
            userStore.users.forEach((user) => {
              expect(user.banned).toBe(bannedStatus);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return only users within date range filter', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            startDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }),
            endDate: fc.date({ min: new Date('2024-06-02'), max: new Date('2024-12-31') }),
            matchingCount: fc.integer({ min: 1, max: 20 }),
          }),
          async ({ startDate, endDate, matchingCount }) => {
            const userStore = useUserStore();

            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            // Generate users within date range
            const matchingUsers: User[] = Array.from({ length: matchingCount }, (_, i) => {
              const randomDate = new Date(
                startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
              );
              return {
                id: i + 1,
                email: `user${i + 1}@test.com`,
                balance: 0,
                commission_balance: 0,
                plan_id: null,
                expired_at: null,
                u: 0,
                d: 0,
                transfer_enable: 1000000,
                banned: 0,
                is_admin: false,
                is_staff: false,
                invite_user_id: null,
                created_at: randomDate.toISOString(),
                updated_at: randomDate.toISOString(),
              };
            });

            mockGet.mockResolvedValueOnce({
              data: {
                data: matchingUsers,
                total: matchingCount,
                current_page: 1,
                per_page: 20,
                last_page: 1,
              },
            });

            await userStore.fetchUsers({ date_start: startDateStr, date_end: endDateStr });

            // Verify all returned users are within date range
            expect(userStore.users.length).toBe(matchingCount);
            userStore.users.forEach((user) => {
              const userDate = new Date(user.created_at);
              expect(userDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
              expect(userDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return users matching multiple combined filters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            searchTerm: fc.string({ minLength: 3, maxLength: 10 }),
            planId: fc.integer({ min: 1, max: 100 }),
            bannedStatus: fc.constantFrom(0, 1),
            matchingCount: fc.integer({ min: 1, max: 15 }),
          }),
          async ({ searchTerm, planId, bannedStatus, matchingCount }) => {
            const userStore = useUserStore();

            // Generate users matching all filter criteria
            const matchingUsers: User[] = Array.from({ length: matchingCount }, (_, i) => ({
              id: i + 1,
              email: `${searchTerm}user${i + 1}@test.com`,
              balance: 0,
              commission_balance: 0,
              plan_id: planId,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: bannedStatus,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            mockGet.mockResolvedValueOnce({
              data: {
                data: matchingUsers,
                total: matchingCount,
                current_page: 1,
                per_page: 20,
                last_page: 1,
              },
            });

            await userStore.fetchUsers({
              search: searchTerm,
              plan_id: planId,
              banned: bannedStatus,
            });

            // Verify all returned users match ALL filter criteria
            expect(userStore.users.length).toBe(matchingCount);
            userStore.users.forEach((user) => {
              expect(user.email.toLowerCase()).toContain(searchTerm.toLowerCase());
              expect(user.plan_id).toBe(planId);
              expect(user.banned).toBe(bannedStatus);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty result when no users match filter', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            searchTerm: fc.string({ minLength: 10, maxLength: 20 }),
            planId: fc.integer({ min: 1000, max: 9999 }),
          }),
          async ({ searchTerm, planId }) => {
            const userStore = useUserStore();

            // Mock empty result
            mockGet.mockResolvedValueOnce({
              data: {
                data: [],
                total: 0,
                current_page: 1,
                per_page: 20,
                last_page: 1,
              },
            });

            await userStore.fetchUsers({ search: searchTerm, plan_id: planId });

            // Verify empty result
            expect(userStore.users.length).toBe(0);
            expect(userStore.total).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain filter correctness across pagination', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            planId: fc.integer({ min: 1, max: 100 }),
            totalMatchingUsers: fc.integer({ min: 25, max: 60 }),
            pageSize: fc.integer({ min: 10, max: 20 }),
          }),
          async ({ planId, totalMatchingUsers, pageSize }) => {
            const userStore = useUserStore();
            const totalPages = Math.ceil(totalMatchingUsers / pageSize);

            // Generate all matching users
            const allMatchingUsers: User[] = Array.from({ length: totalMatchingUsers }, (_, i) => ({
              id: i + 1,
              email: `user${i + 1}@test.com`,
              balance: 0,
              commission_balance: 0,
              plan_id: planId,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            // Fetch all pages with filter
            for (let page = 1; page <= totalPages; page++) {
              const startIndex = (page - 1) * pageSize;
              const endIndex = Math.min(startIndex + pageSize, totalMatchingUsers);
              const pageUsers = allMatchingUsers.slice(startIndex, endIndex);

              mockGet.mockResolvedValueOnce({
                data: {
                  data: pageUsers,
                  total: totalMatchingUsers,
                  current_page: page,
                  per_page: pageSize,
                  last_page: totalPages,
                },
              });

              await userStore.fetchUsers({ plan_id: planId, page, page_size: pageSize });

              // Verify all users on this page match the filter
              userStore.users.forEach((user) => {
                expect(user.plan_id).toBe(planId);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve filter state across multiple fetches', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            initialPlanId: fc.integer({ min: 1, max: 50 }),
            newPlanId: fc.integer({ min: 51, max: 100 }),
            userCount: fc.integer({ min: 5, max: 15 }),
          }),
          async ({ initialPlanId, newPlanId, userCount }) => {
            const userStore = useUserStore();

            // First fetch with initial filter
            const initialUsers: User[] = Array.from({ length: userCount }, (_, i) => ({
              id: i + 1,
              email: `user${i + 1}@test.com`,
              balance: 0,
              commission_balance: 0,
              plan_id: initialPlanId,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            mockGet.mockResolvedValueOnce({
              data: {
                data: initialUsers,
                total: userCount,
                current_page: 1,
                per_page: 20,
                last_page: 1,
              },
            });

            await userStore.fetchUsers({ plan_id: initialPlanId });

            // Verify initial filter results
            userStore.users.forEach((user) => {
              expect(user.plan_id).toBe(initialPlanId);
            });

            // Second fetch with new filter
            const newUsers: User[] = Array.from({ length: userCount }, (_, i) => ({
              id: i + 100,
              email: `newuser${i + 1}@test.com`,
              balance: 0,
              commission_balance: 0,
              plan_id: newPlanId,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 1000000,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            mockGet.mockResolvedValueOnce({
              data: {
                data: newUsers,
                total: userCount,
                current_page: 1,
                per_page: 20,
                last_page: 1,
              },
            });

            await userStore.fetchUsers({ plan_id: newPlanId });

            // Verify new filter results (no contamination from previous filter)
            userStore.users.forEach((user) => {
              expect(user.plan_id).toBe(newPlanId);
              expect(user.plan_id).not.toBe(initialPlanId);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: User detail completeness', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 11: User detail completeness
     * Validates: Requirements 3.11
     * 
     * For any user detail view, the displayed information should include
     * subscription status, traffic usage, orders, and commission logs.
     */

    it('should include all required user detail information', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.integer({ min: 1, max: 10000 }),
            email: fc.emailAddress(),
            balance: fc.integer({ min: 0, max: 100000 }),
            commissionBalance: fc.integer({ min: 0, max: 50000 }),
            planId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
            expiredAt: fc.option(fc.integer({ min: 0 }), { nil: null }),
            uploadTraffic: fc.integer({ min: 0, max: 1000000000 }),
            downloadTraffic: fc.integer({ min: 0, max: 1000000000 }),
            transferEnable: fc.integer({ min: 0, max: 1000000000 }),
            banned: fc.constantFrom(0, 1),
            isAdmin: fc.boolean(),
            isStaff: fc.boolean(),
            inviteUserId: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: null }),
          }),
          async (userData) => {
            const userStore = useUserStore();

            // Create complete user object with all subscription and traffic information
            const user: User = {
              id: userData.userId,
              email: userData.email,
              balance: userData.balance,
              commission_balance: userData.commissionBalance,
              plan_id: userData.planId,
              expired_at: userData.expiredAt,
              u: userData.uploadTraffic,
              d: userData.downloadTraffic,
              transfer_enable: userData.transferEnable,
              banned: userData.banned,
              is_admin: userData.isAdmin,
              is_staff: userData.isStaff,
              invite_user_id: userData.inviteUserId,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-02T00:00:00Z',
            };

            // Mock API response for user details
            mockGet.mockResolvedValueOnce({
              data: {
                data: user,
              },
            });

            // Fetch user details
            await userStore.fetchUserById(userData.userId);

            // Verify user detail completeness - all required fields should be present
            expect(userStore.currentUser).not.toBeNull();
            expect(userStore.currentUser).toBeDefined();

            // Basic user information
            expect(userStore.currentUser?.id).toBe(userData.userId);
            expect(userStore.currentUser?.email).toBe(userData.email);
            expect(userStore.currentUser?.balance).toBe(userData.balance);
            expect(userStore.currentUser?.commission_balance).toBe(userData.commissionBalance);
            expect(userStore.currentUser?.banned).toBe(userData.banned);
            expect(userStore.currentUser?.is_admin).toBe(userData.isAdmin);
            expect(userStore.currentUser?.is_staff).toBe(userData.isStaff);
            expect(userStore.currentUser?.invite_user_id).toBe(userData.inviteUserId);

            // Subscription status information
            expect(userStore.currentUser?.plan_id).toBe(userData.planId);
            expect(userStore.currentUser?.expired_at).toBe(userData.expiredAt);

            // Traffic usage information
            expect(userStore.currentUser?.u).toBe(userData.uploadTraffic);
            expect(userStore.currentUser?.d).toBe(userData.downloadTraffic);
            expect(userStore.currentUser?.transfer_enable).toBe(userData.transferEnable);

            // Timestamps
            expect(userStore.currentUser?.created_at).toBeDefined();
            expect(userStore.currentUser?.updated_at).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include subscription status fields for users with active plans', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.integer({ min: 1, max: 10000 }),
            planId: fc.integer({ min: 1, max: 100 }),
            expiredAt: fc.integer({ min: Math.floor(Date.now() / 1000), max: Math.floor(Date.now() / 1000) + 31536000 }), // Future date
            transferEnable: fc.integer({ min: 1000000, max: 1000000000 }),
            uploadTraffic: fc.integer({ min: 0, max: 500000000 }),
            downloadTraffic: fc.integer({ min: 0, max: 500000000 }),
          }),
          async ({ userId, planId, expiredAt, transferEnable, uploadTraffic, downloadTraffic }) => {
            const userStore = useUserStore();

            // Create user with active subscription
            const user: User = {
              id: userId,
              email: 'user@test.com',
              balance: 0,
              commission_balance: 0,
              plan_id: planId,
              expired_at: expiredAt,
              u: uploadTraffic,
              d: downloadTraffic,
              transfer_enable: transferEnable,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            };

            mockGet.mockResolvedValueOnce({
              data: {
                data: user,
              },
            });

            await userStore.fetchUserById(userId);

            // Verify subscription status is complete
            expect(userStore.currentUser?.plan_id).toBe(planId);
            expect(userStore.currentUser?.expired_at).toBe(expiredAt);
            expect(userStore.currentUser?.transfer_enable).toBe(transferEnable);

            // Verify traffic usage is complete
            expect(userStore.currentUser?.u).toBeDefined();
            expect(userStore.currentUser?.d).toBeDefined();
            expect(userStore.currentUser?.u).toBe(uploadTraffic);
            expect(userStore.currentUser?.d).toBe(downloadTraffic);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include all fields for users without active plans', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.integer({ min: 1, max: 10000 }),
            email: fc.emailAddress(),
            balance: fc.integer({ min: 0, max: 100000 }),
          }),
          async ({ userId, email, balance }) => {
            const userStore = useUserStore();

            // Create user without active subscription
            const user: User = {
              id: userId,
              email: email,
              balance: balance,
              commission_balance: 0,
              plan_id: null,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: 0,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            };

            mockGet.mockResolvedValueOnce({
              data: {
                data: user,
              },
            });

            await userStore.fetchUserById(userId);

            // Verify all fields are present even when null/zero
            expect(userStore.currentUser).not.toBeNull();
            expect(userStore.currentUser?.id).toBe(userId);
            expect(userStore.currentUser?.email).toBe(email);
            expect(userStore.currentUser?.balance).toBe(balance);
            expect(userStore.currentUser?.plan_id).toBeNull();
            expect(userStore.currentUser?.expired_at).toBeNull();
            expect(userStore.currentUser?.u).toBe(0);
            expect(userStore.currentUser?.d).toBe(0);
            expect(userStore.currentUser?.transfer_enable).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain data integrity across multiple user detail fetches', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.integer({ min: 1, max: 10000 }),
              email: fc.emailAddress(),
              planId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
              balance: fc.integer({ min: 0, max: 100000 }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (users) => {
            const userStore = useUserStore();

            // Fetch each user sequentially
            for (const userData of users) {
              const user: User = {
                id: userData.userId,
                email: userData.email,
                balance: userData.balance,
                commission_balance: 0,
                plan_id: userData.planId,
                expired_at: null,
                u: 0,
                d: 0,
                transfer_enable: 1000000,
                banned: 0,
                is_admin: false,
                is_staff: false,
                invite_user_id: null,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              };

              mockGet.mockResolvedValueOnce({
                data: {
                  data: user,
                },
              });

              await userStore.fetchUserById(userData.userId);

              // Verify currentUser is updated with complete information
              expect(userStore.currentUser?.id).toBe(userData.userId);
              expect(userStore.currentUser?.email).toBe(userData.email);
              expect(userStore.currentUser?.balance).toBe(userData.balance);
              expect(userStore.currentUser?.plan_id).toBe(userData.planId);

              // Verify all required fields are present
              expect(userStore.currentUser?.u).toBeDefined();
              expect(userStore.currentUser?.d).toBeDefined();
              expect(userStore.currentUser?.transfer_enable).toBeDefined();
              expect(userStore.currentUser?.expired_at).toBeDefined();
              expect(userStore.currentUser?.commission_balance).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include traffic calculation fields for any traffic values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.integer({ min: 1, max: 10000 }),
            uploadTraffic: fc.integer({ min: 0, max: 1000000000 }),
            downloadTraffic: fc.integer({ min: 0, max: 1000000000 }),
            transferEnable: fc.integer({ min: 0, max: 2000000000 }),
          }),
          async ({ userId, uploadTraffic, downloadTraffic, transferEnable }) => {
            const userStore = useUserStore();

            const user: User = {
              id: userId,
              email: 'user@test.com',
              balance: 0,
              commission_balance: 0,
              plan_id: 1,
              expired_at: null,
              u: uploadTraffic,
              d: downloadTraffic,
              transfer_enable: transferEnable,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            };

            mockGet.mockResolvedValueOnce({
              data: {
                data: user,
              },
            });

            await userStore.fetchUserById(userId);

            // Verify all traffic-related fields are present and can be used for calculations
            expect(userStore.currentUser?.u).toBe(uploadTraffic);
            expect(userStore.currentUser?.d).toBe(downloadTraffic);
            expect(userStore.currentUser?.transfer_enable).toBe(transferEnable);

            // Verify we can calculate total used traffic
            const totalUsed = userStore.currentUser!.u + userStore.currentUser!.d;
            expect(totalUsed).toBe(uploadTraffic + downloadTraffic);

            // Verify we can calculate remaining traffic
            const remaining = userStore.currentUser!.transfer_enable - totalUsed;
            expect(remaining).toBe(transferEnable - uploadTraffic - downloadTraffic);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve user detail completeness after store operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.integer({ min: 1, max: 10000 }),
            email: fc.emailAddress(),
            planId: fc.integer({ min: 1, max: 100 }),
            balance: fc.integer({ min: 0, max: 100000 }),
            transferEnable: fc.integer({ min: 1000000, max: 1000000000 }),
          }),
          async ({ userId, email, planId, balance, transferEnable }) => {
            const userStore = useUserStore();

            // Create initial user with complete details
            const user: User = {
              id: userId,
              email: email,
              balance: balance,
              commission_balance: 1000,
              plan_id: planId,
              expired_at: Math.floor(Date.now() / 1000) + 86400,
              u: 100000,
              d: 200000,
              transfer_enable: transferEnable,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            };

            // Fetch user details
            mockGet.mockResolvedValueOnce({
              data: {
                data: user,
              },
            });

            await userStore.fetchUserById(userId);

            // Store initial state
            const initialUser = { ...userStore.currentUser! };

            // Perform an update operation
            const updatedBalance = balance + 5000;
            mockPut.mockResolvedValueOnce({
              data: {
                data: { ...user, balance: updatedBalance },
              },
            });

            await userStore.updateUser(userId, { balance: updatedBalance });

            // Verify all detail fields are still present after update
            expect(userStore.currentUser?.id).toBe(userId);
            expect(userStore.currentUser?.email).toBe(email);
            expect(userStore.currentUser?.balance).toBe(updatedBalance);
            expect(userStore.currentUser?.commission_balance).toBe(initialUser.commission_balance);
            expect(userStore.currentUser?.plan_id).toBe(planId);
            expect(userStore.currentUser?.expired_at).toBe(initialUser.expired_at);
            expect(userStore.currentUser?.u).toBe(initialUser.u);
            expect(userStore.currentUser?.d).toBe(initialUser.d);
            expect(userStore.currentUser?.transfer_enable).toBe(transferEnable);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: Generated user parameters', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 9: Generated user parameters
     * Validates: Requirements 3.8
     * 
     * For any user generation request with specified parameters,
     * the created user should have exactly those parameters.
     */

    it('should generate users with exact specified parameters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            emailPrefix: fc.string({ minLength: 3, maxLength: 10 }).filter(s => /^[a-z0-9]+$/.test(s)),
            emailSuffix: fc.emailAddress().map(e => e.split('@')[1]),
            planId: fc.integer({ min: 1, max: 100 }),
            expiredAt: fc.integer({ min: Math.floor(Date.now() / 1000), max: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60 }),
            transferEnable: fc.integer({ min: 1000000, max: 1000000000 }),
            count: fc.integer({ min: 1, max: 10 }),
          }),
          async ({ emailPrefix, emailSuffix, planId, expiredAt, transferEnable, count }) => {
            const userStore = useUserStore();

            const generateData = {
              email_prefix: emailPrefix,
              email_suffix: emailSuffix,
              plan_id: planId,
              expired_at: expiredAt,
              transfer_enable: transferEnable,
              count,
            };

            // Generate expected users
            const generatedUsers: User[] = Array.from({ length: count }, (_, i) => ({
              id: i + 1,
              email: `${emailPrefix}${i + 1}@${emailSuffix}`,
              balance: 0,
              commission_balance: 0,
              plan_id: planId,
              expired_at: expiredAt,
              u: 0,
              d: 0,
              transfer_enable: transferEnable,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            // Mock API response
            mockPost.mockResolvedValueOnce({
              data: {
                data: generatedUsers,
              },
            });

            // Generate users
            const result = await userStore.generateUsers(generateData);

            // Verify correct number of users generated
            expect(result.length).toBe(count);

            // Verify each generated user has exactly the specified parameters
            result.forEach((user, index) => {
              expect(user.email).toBe(`${emailPrefix}${index + 1}@${emailSuffix}`);
              expect(user.plan_id).toBe(planId);
              expect(user.expired_at).toBe(expiredAt);
              expect(user.transfer_enable).toBe(transferEnable);
              expect(user.balance).toBe(0);
              expect(user.commission_balance).toBe(0);
              expect(user.u).toBe(0);
              expect(user.d).toBe(0);
              expect(user.banned).toBe(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate single user with exact parameters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            emailPrefix: fc.string({ minLength: 3, maxLength: 10 }).filter(s => /^[a-z0-9]+$/.test(s)),
            emailSuffix: fc.emailAddress().map(e => e.split('@')[1]),
            planId: fc.integer({ min: 1, max: 100 }),
            expiredAt: fc.integer({ min: Math.floor(Date.now() / 1000), max: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60 }),
            transferEnable: fc.integer({ min: 1000000, max: 1000000000 }),
          }),
          async ({ emailPrefix, emailSuffix, planId, expiredAt, transferEnable }) => {
            const userStore = useUserStore();

            const generateData = {
              email_prefix: emailPrefix,
              email_suffix: emailSuffix,
              plan_id: planId,
              expired_at: expiredAt,
              transfer_enable: transferEnable,
              count: 1,
            };

            const generatedUser: User = {
              id: 1,
              email: `${emailPrefix}1@${emailSuffix}`,
              balance: 0,
              commission_balance: 0,
              plan_id: planId,
              expired_at: expiredAt,
              u: 0,
              d: 0,
              transfer_enable: transferEnable,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            };

            mockPost.mockResolvedValueOnce({
              data: {
                data: [generatedUser],
              },
            });

            const result = await userStore.generateUsers(generateData);

            // Verify single user generated
            expect(result.length).toBe(1);

            // Verify exact parameters
            expect(result[0].email).toBe(`${emailPrefix}1@${emailSuffix}`);
            expect(result[0].plan_id).toBe(planId);
            expect(result[0].expired_at).toBe(expiredAt);
            expect(result[0].transfer_enable).toBe(transferEnable);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate users with sequential email numbering', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            emailPrefix: fc.string({ minLength: 3, maxLength: 10 }).filter(s => /^[a-z0-9]+$/.test(s)),
            emailSuffix: fc.emailAddress().map(e => e.split('@')[1]),
            planId: fc.integer({ min: 1, max: 100 }),
            expiredAt: fc.integer({ min: Math.floor(Date.now() / 1000), max: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60 }),
            transferEnable: fc.integer({ min: 1000000, max: 1000000000 }),
            count: fc.integer({ min: 2, max: 10 }),
          }),
          async ({ emailPrefix, emailSuffix, planId, expiredAt, transferEnable, count }) => {
            const userStore = useUserStore();

            const generateData = {
              email_prefix: emailPrefix,
              email_suffix: emailSuffix,
              plan_id: planId,
              expired_at: expiredAt,
              transfer_enable: transferEnable,
              count,
            };

            const generatedUsers: User[] = Array.from({ length: count }, (_, i) => ({
              id: i + 1,
              email: `${emailPrefix}${i + 1}@${emailSuffix}`,
              balance: 0,
              commission_balance: 0,
              plan_id: planId,
              expired_at: expiredAt,
              u: 0,
              d: 0,
              transfer_enable: transferEnable,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            mockPost.mockResolvedValueOnce({
              data: {
                data: generatedUsers,
              },
            });

            const result = await userStore.generateUsers(generateData);

            // Verify sequential numbering
            for (let i = 0; i < count; i++) {
              expect(result[i].email).toBe(`${emailPrefix}${i + 1}@${emailSuffix}`);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all specified parameters across multiple generations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              emailPrefix: fc.string({ minLength: 3, maxLength: 10 }).filter(s => /^[a-z0-9]+$/.test(s)),
              emailSuffix: fc.emailAddress().map(e => e.split('@')[1]),
              planId: fc.integer({ min: 1, max: 100 }),
              expiredAt: fc.integer({ min: Math.floor(Date.now() / 1000), max: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60 }),
              transferEnable: fc.integer({ min: 1000000, max: 1000000000 }),
              count: fc.integer({ min: 1, max: 5 }),
            }),
            { minLength: 1, maxLength: 3 }
          ),
          async (generations) => {
            const userStore = useUserStore();

            for (const gen of generations) {
              const generateData = {
                email_prefix: gen.emailPrefix,
                email_suffix: gen.emailSuffix,
                plan_id: gen.planId,
                expired_at: gen.expiredAt,
                transfer_enable: gen.transferEnable,
                count: gen.count,
              };

              const generatedUsers: User[] = Array.from({ length: gen.count }, (_, i) => ({
                id: i + 1,
                email: `${gen.emailPrefix}${i + 1}@${gen.emailSuffix}`,
                balance: 0,
                commission_balance: 0,
                plan_id: gen.planId,
                expired_at: gen.expiredAt,
                u: 0,
                d: 0,
                transfer_enable: gen.transferEnable,
                banned: 0,
                is_admin: false,
                is_staff: false,
                invite_user_id: null,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              }));

              mockPost.mockResolvedValueOnce({
                data: {
                  data: generatedUsers,
                },
              });

              const result = await userStore.generateUsers(generateData);

              // Verify each generation maintains exact parameters
              result.forEach((user) => {
                expect(user.plan_id).toBe(gen.planId);
                expect(user.expired_at).toBe(gen.expiredAt);
                expect(user.transfer_enable).toBe(gen.transferEnable);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate users with zero initial traffic usage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            emailPrefix: fc.string({ minLength: 3, maxLength: 10 }).filter(s => /^[a-z0-9]+$/.test(s)),
            emailSuffix: fc.emailAddress().map(e => e.split('@')[1]),
            planId: fc.integer({ min: 1, max: 100 }),
            expiredAt: fc.integer({ min: Math.floor(Date.now() / 1000), max: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60 }),
            transferEnable: fc.integer({ min: 1000000, max: 1000000000 }),
            count: fc.integer({ min: 1, max: 10 }),
          }),
          async ({ emailPrefix, emailSuffix, planId, expiredAt, transferEnable, count }) => {
            const userStore = useUserStore();

            const generateData = {
              email_prefix: emailPrefix,
              email_suffix: emailSuffix,
              plan_id: planId,
              expired_at: expiredAt,
              transfer_enable: transferEnable,
              count,
            };

            const generatedUsers: User[] = Array.from({ length: count }, (_, i) => ({
              id: i + 1,
              email: `${emailPrefix}${i + 1}@${emailSuffix}`,
              balance: 0,
              commission_balance: 0,
              plan_id: planId,
              expired_at: expiredAt,
              u: 0,
              d: 0,
              transfer_enable: transferEnable,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            mockPost.mockResolvedValueOnce({
              data: {
                data: generatedUsers,
              },
            });

            const result = await userStore.generateUsers(generateData);

            // Verify all generated users have zero initial traffic usage
            result.forEach((user) => {
              expect(user.u).toBe(0);
              expect(user.d).toBe(0);
              expect(user.balance).toBe(0);
              expect(user.commission_balance).toBe(0);
              expect(user.banned).toBe(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: CSV export completeness', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 10: CSV export completeness
     * Validates: Requirements 3.9
     * 
     * For any user data export, the CSV file should contain all selected
     * users with all their data fields.
     */

    it('should export all users with complete data fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              email: fc.emailAddress(),
              balance: fc.integer({ min: 0, max: 100000 }),
              commissionBalance: fc.integer({ min: 0, max: 50000 }),
              planId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
              expiredAt: fc.option(fc.integer({ min: 0 }), { nil: null }),
              u: fc.integer({ min: 0, max: 1000000000 }),
              d: fc.integer({ min: 0, max: 1000000000 }),
              transferEnable: fc.integer({ min: 0, max: 1000000000 }),
              banned: fc.constantFrom(0, 1),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (usersData) => {
            const userStore = useUserStore();

            // Create users from data
            const users: User[] = usersData.map((data) => ({
              id: data.id,
              email: data.email,
              balance: data.balance,
              commission_balance: data.commissionBalance,
              plan_id: data.planId,
              expired_at: data.expiredAt,
              u: data.u,
              d: data.d,
              transfer_enable: data.transferEnable,
              banned: data.banned,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            // Set users in store
            userStore.users = users;

            // Create CSV content with all fields
            const csvHeader = 'id,email,balance,commission_balance,plan_id,expired_at,u,d,transfer_enable,banned,is_admin,is_staff,invite_user_id,created_at,updated_at\n';
            const csvRows = users.map((user) =>
              `${user.id},${user.email},${user.balance},${user.commission_balance},${user.plan_id ?? ''},${user.expired_at ?? ''},${user.u},${user.d},${user.transfer_enable},${user.banned},${user.is_admin},${user.is_staff},${user.invite_user_id ?? ''},${user.created_at},${user.updated_at}`
            ).join('\n');
            const csvContent = csvHeader + csvRows;

            // Mock API response with CSV blob
            const blob = new Blob([csvContent], { type: 'text/csv' });
            mockGet.mockResolvedValueOnce({
              data: blob,
            });

            // Export users
            const result = await userStore.exportUsers();

            // Verify blob is returned
            expect(result).toBeInstanceOf(Blob);
            expect(result.type).toBe('text/csv');

            // Read blob content
            const text = await result.text();

            // Verify CSV contains header
            expect(text).toContain('id,email,balance,commission_balance');

            // Verify all users are in CSV
            users.forEach((user) => {
              expect(text).toContain(user.email);
              expect(text).toContain(user.id.toString());
            });

            // Verify CSV has correct number of rows (header + data rows)
            const lines = text.trim().split('\n');
            expect(lines.length).toBe(users.length + 1); // +1 for header
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should export users with all data fields present in CSV', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userCount: fc.integer({ min: 1, max: 10 }),
            balance: fc.integer({ min: 0, max: 100000 }),
            commissionBalance: fc.integer({ min: 0, max: 50000 }),
            transferEnable: fc.integer({ min: 0, max: 1000000000 }),
          }),
          async ({ userCount, balance, commissionBalance, transferEnable }) => {
            const userStore = useUserStore();

            // Create users
            const users: User[] = Array.from({ length: userCount }, (_, i) => ({
              id: i + 1,
              email: `user${i + 1}@test.com`,
              balance,
              commission_balance: commissionBalance,
              plan_id: 1,
              expired_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
              u: 100000,
              d: 200000,
              transfer_enable: transferEnable,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            userStore.users = users;

            // Create CSV with all fields
            const csvHeader = 'id,email,balance,commission_balance,plan_id,expired_at,u,d,transfer_enable,banned,is_admin,is_staff,invite_user_id,created_at,updated_at\n';
            const csvRows = users.map((user) =>
              `${user.id},${user.email},${user.balance},${user.commission_balance},${user.plan_id},${user.expired_at},${user.u},${user.d},${user.transfer_enable},${user.banned},${user.is_admin},${user.is_staff},${user.invite_user_id ?? ''},${user.created_at},${user.updated_at}`
            ).join('\n');
            const csvContent = csvHeader + csvRows;

            const blob = new Blob([csvContent], { type: 'text/csv' });
            mockGet.mockResolvedValueOnce({
              data: blob,
            });

            const result = await userStore.exportUsers();
            const text = await result.text();

            // Verify all critical fields are present
            expect(text).toContain('balance');
            expect(text).toContain('commission_balance');
            expect(text).toContain('transfer_enable');
            expect(text).toContain('plan_id');
            expect(text).toContain('expired_at');

            // Verify data values are present
            expect(text).toContain(balance.toString());
            expect(text).toContain(commissionBalance.toString());
            expect(text).toContain(transferEnable.toString());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should export filtered users with complete data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            planId: fc.integer({ min: 1, max: 100 }),
            matchingCount: fc.integer({ min: 1, max: 15 }),
          }),
          async ({ planId, matchingCount }) => {
            const userStore = useUserStore();

            // Create users matching filter
            const users: User[] = Array.from({ length: matchingCount }, (_, i) => ({
              id: i + 1,
              email: `user${i + 1}@test.com`,
              balance: 1000,
              commission_balance: 500,
              plan_id: planId,
              expired_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
              u: 100000,
              d: 200000,
              transfer_enable: 10000000,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            userStore.users = users;

            // Create CSV
            const csvHeader = 'id,email,balance,commission_balance,plan_id,expired_at,u,d,transfer_enable,banned,is_admin,is_staff,invite_user_id,created_at,updated_at\n';
            const csvRows = users.map((user) =>
              `${user.id},${user.email},${user.balance},${user.commission_balance},${user.plan_id},${user.expired_at},${user.u},${user.d},${user.transfer_enable},${user.banned},${user.is_admin},${user.is_staff},${user.invite_user_id ?? ''},${user.created_at},${user.updated_at}`
            ).join('\n');
            const csvContent = csvHeader + csvRows;

            const blob = new Blob([csvContent], { type: 'text/csv' });
            mockGet.mockResolvedValueOnce({
              data: blob,
            });

            // Export with filter
            const result = await userStore.exportUsers({ plan_id: planId });
            const text = await result.text();

            // Verify all filtered users are exported
            const lines = text.trim().split('\n');
            expect(lines.length).toBe(matchingCount + 1);

            // Verify plan_id is consistent
            users.forEach((user) => {
              expect(text).toContain(user.email);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should export empty CSV with header when no users match', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            planId: fc.integer({ min: 1000, max: 9999 }),
          }),
          async ({ planId }) => {
            const userStore = useUserStore();

            // Empty users
            userStore.users = [];

            // Create CSV with only header
            const csvContent = 'id,email,balance,commission_balance,plan_id,expired_at,u,d,transfer_enable,banned,is_admin,is_staff,invite_user_id,created_at,updated_at\n';

            const blob = new Blob([csvContent], { type: 'text/csv' });
            mockGet.mockResolvedValueOnce({
              data: blob,
            });

            const result = await userStore.exportUsers({ plan_id: planId });
            const text = await result.text();

            // Verify header is present
            expect(text).toContain('id,email,balance');

            // Verify only one line (header)
            const lines = text.trim().split('\n');
            expect(lines.length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve data integrity in CSV export', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              email: fc.emailAddress(),
              balance: fc.integer({ min: 0, max: 100000 }),
              transferEnable: fc.integer({ min: 0, max: 1000000000 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (usersData) => {
            const userStore = useUserStore();

            const users: User[] = usersData.map((data) => ({
              id: data.id,
              email: data.email,
              balance: data.balance,
              commission_balance: 0,
              plan_id: 1,
              expired_at: null,
              u: 0,
              d: 0,
              transfer_enable: data.transferEnable,
              banned: 0,
              is_admin: false,
              is_staff: false,
              invite_user_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }));

            userStore.users = users;

            const csvHeader = 'id,email,balance,commission_balance,plan_id,expired_at,u,d,transfer_enable,banned,is_admin,is_staff,invite_user_id,created_at,updated_at\n';
            const csvRows = users.map((user) =>
              `${user.id},${user.email},${user.balance},${user.commission_balance},${user.plan_id},${user.expired_at ?? ''},${user.u},${user.d},${user.transfer_enable},${user.banned},${user.is_admin},${user.is_staff},${user.invite_user_id ?? ''},${user.created_at},${user.updated_at}`
            ).join('\n');
            const csvContent = csvHeader + csvRows;

            const blob = new Blob([csvContent], { type: 'text/csv' });
            mockGet.mockResolvedValueOnce({
              data: blob,
            });

            const result = await userStore.exportUsers();
            const text = await result.text();

            // Verify data integrity - all user IDs, emails, balances, and transfer_enable values are present
            users.forEach((user) => {
              expect(text).toContain(user.id.toString());
              expect(text).toContain(user.email);
              expect(text).toContain(user.balance.toString());
              expect(text).toContain(user.transfer_enable.toString());
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
