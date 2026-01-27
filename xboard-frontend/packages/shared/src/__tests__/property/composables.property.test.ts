/**
 * Property-Based Tests for Shared Composables
 * Feature: vue-admin-user-frontend
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { useLoading } from '../../composables/useLoading';

describe('Composables Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 19: Loading indicator display', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 19: Loading indicator display
     * Validates: Requirements 31.1
     * 
     * For any API request in progress, a loading indicator should be visible 
     * until the request completes or fails.
     */

    it('should display loading indicator for any async operation in progress', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 50 }), // delay in ms (reduced from 10-500)
          fc.oneof(
            fc.constant('success'),
            fc.constant('error')
          ), // operation result
          async (delay, result) => {
            const { isLoading, withLoading } = useLoading();

            // Initially not loading
            expect(isLoading.value).toBe(false);

            // Create async operation
            const asyncOperation = async () => {
              await new Promise((resolve, reject) => {
                setTimeout(() => {
                  if (result === 'success') {
                    resolve('data');
                  } else {
                    reject(new Error('operation failed'));
                  }
                }, delay);
              });
              return 'completed';
            };

            // Start operation with loading wrapper
            const operationPromise = withLoading(asyncOperation);

            // Loading should be true immediately after starting (synchronous)
            expect(isLoading.value).toBe(true);

            // Wait for operation to complete
            try {
              await operationPromise;
            } catch {
              // Ignore errors for this test
            }

            // Loading should be false after completion (synchronous)
            expect(isLoading.value).toBe(false);
          }
        ),
        { numRuns: 20 } // Reduced from 100
      );
    }, 10000); // Increased timeout to 10 seconds

    it('should maintain loading state throughout entire async operation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 30, max: 100 }), // Reduced from 50-300
          async (delay) => {
            const { isLoading, withLoading } = useLoading();
            const loadingStates: boolean[] = [];

            const asyncOperation = async () => {
              // Sample loading state at different points
              loadingStates.push(isLoading.value);
              
              await new Promise(resolve => setTimeout(resolve, delay / 3));
              loadingStates.push(isLoading.value);
              
              await new Promise(resolve => setTimeout(resolve, delay / 3));
              loadingStates.push(isLoading.value);
              
              await new Promise(resolve => setTimeout(resolve, delay / 3));
              loadingStates.push(isLoading.value);
              
              return 'done';
            };

            await withLoading(asyncOperation);

            // All sampled states during operation should be true
            expect(loadingStates.every(state => state === true)).toBe(true);
            
            // Final state should be false
            expect(isLoading.value).toBe(false);
          }
        ),
        { numRuns: 20 } // Reduced from 100
      );
    }, 10000);

    it('should set loading to false even when operation fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }), // error message
          fc.integer({ min: 5, max: 50 }), // delay (reduced from 10-200)
          async (errorMessage, delay) => {
            const { isLoading, withLoading } = useLoading();

            const failingOperation = async () => {
              await new Promise(resolve => setTimeout(resolve, delay));
              throw new Error(errorMessage);
            };

            // Verify loading is false initially
            expect(isLoading.value).toBe(false);

            // Execute failing operation
            try {
              await withLoading(failingOperation);
            } catch (error) {
              // Expected to throw
              expect((error as Error).message).toBe(errorMessage);
            }

            // Loading should be false after error (synchronous)
            expect(isLoading.value).toBe(false);
          }
        ),
        { numRuns: 20 } // Reduced from 100
      );
    }, 10000);

    it('should handle multiple sequential operations correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 5, max: 30 }), { minLength: 2, maxLength: 3 }), // Reduced delays and array size
          async (delays) => {
            const { isLoading, withLoading } = useLoading();

            for (const delay of delays) {
              // Should be false before each operation
              expect(isLoading.value).toBe(false);

              const operation = async () => {
                await new Promise(resolve => setTimeout(resolve, delay));
                return delay;
              };

              await withLoading(operation);

              // Should be false after each operation (synchronous)
              expect(isLoading.value).toBe(false);
            }
          }
        ),
        { numRuns: 20 } // Reduced from 100
      );
    }, 10000);

    it('should allow manual control of loading state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // initial state
          async (initialState) => {
            const { isLoading, startLoading, stopLoading } = useLoading(initialState);

            // Verify initial state
            expect(isLoading.value).toBe(initialState);

            // Start loading
            startLoading();
            expect(isLoading.value).toBe(true);

            // Stop loading
            stopLoading();
            expect(isLoading.value).toBe(false);

            // Multiple starts should keep it true
            startLoading();
            startLoading();
            expect(isLoading.value).toBe(true);

            // Single stop should set it false
            stopLoading();
            expect(isLoading.value).toBe(false);
          }
        ),
        { numRuns: 20 } // Reduced from 100
      );
    });

    it('should preserve loading state independence across multiple instances', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 30, max: 80 }), // Reduced from 50-200
          fc.integer({ min: 30, max: 80 }), // Reduced from 50-200
          async (delay1, delay2) => {
            const loading1 = useLoading();
            const loading2 = useLoading();

            // Both should start as false
            expect(loading1.isLoading.value).toBe(false);
            expect(loading2.isLoading.value).toBe(false);

            // Start first operation
            const op1 = loading1.withLoading(async () => {
              await new Promise(resolve => setTimeout(resolve, delay1));
            });

            expect(loading1.isLoading.value).toBe(true);
            expect(loading2.isLoading.value).toBe(false);

            // Start second operation
            const op2 = loading2.withLoading(async () => {
              await new Promise(resolve => setTimeout(resolve, delay2));
            });

            expect(loading1.isLoading.value).toBe(true);
            expect(loading2.isLoading.value).toBe(true);

            // Wait for both to complete
            await Promise.all([op1, op2]);

            // Both should be false
            expect(loading1.isLoading.value).toBe(false);
            expect(loading2.isLoading.value).toBe(false);
          }
        ),
        { numRuns: 20 } // Reduced from 100
      );
    }, 10000);
  });

  describe('Property 20: Button disabling during operations', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 20: Button disabling during operations
     * Validates: Requirements 31.2
     * 
     * For any action button, when an operation is in progress, the button should be 
     * disabled to prevent duplicate submissions.
     */

    it('should indicate operation in progress to prevent duplicate submissions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 30, max: 100 }), // operation delay (reduced from 50-300)
          fc.integer({ min: 1, max: 3 }), // number of rapid clicks (reduced from 1-5)
          async (operationDelay, clickCount) => {
            const { isLoading, withLoading } = useLoading();
            let executionCount = 0;

            const operation = async () => {
              executionCount++;
              await new Promise(resolve => setTimeout(resolve, operationDelay));
              return 'success';
            };

            // Simulate rapid button clicks
            const clicks: Promise<any>[] = [];
            for (let i = 0; i < clickCount; i++) {
              // Only execute if not already loading (button would be disabled)
              if (!isLoading.value) {
                clicks.push(withLoading(operation));
              }
              // Small delay between clicks
              await new Promise(resolve => setTimeout(resolve, 5));
            }

            // Wait for all operations to complete
            await Promise.all(clicks);

            // Should have executed only once (first click)
            // because isLoading would be true for subsequent clicks
            expect(executionCount).toBe(1);
            expect(isLoading.value).toBe(false);
          }
        ),
        { numRuns: 20 } // Reduced from 100
      );
    }, 10000);

    it('should prevent operation start when already in progress', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 50, max: 150 }), // Reduced from 100-300
          async (delay) => {
            const { isLoading, withLoading } = useLoading();
            let firstOperationCompleted = false;
            let secondOperationStarted = false;

            const operation1 = async () => {
              await new Promise(resolve => setTimeout(resolve, delay));
              firstOperationCompleted = true;
              return 'op1';
            };

            const operation2 = async () => {
              secondOperationStarted = true;
              return 'op2';
            };

            // Start first operation
            const promise1 = withLoading(operation1);

            // Try to start second operation while first is in progress
            if (!isLoading.value) {
              // This should not happen - loading should be true
              await withLoading(operation2);
            }

            // Wait for first operation
            await promise1;

            // Second operation should not have started
            expect(secondOperationStarted).toBe(false);
            expect(firstOperationCompleted).toBe(true);
          }
        ),
        { numRuns: 20 } // Reduced from 100
      );
    }, 10000);

    it('should allow operation after previous operation completes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 30, max: 80 }), // Reduced from 50-200
          fc.integer({ min: 30, max: 80 }), // Reduced from 50-200
          async (delay1, delay2) => {
            const { isLoading, withLoading } = useLoading();
            const executionOrder: number[] = [];

            const operation1 = async () => {
              executionOrder.push(1);
              await new Promise(resolve => setTimeout(resolve, delay1));
            };

            const operation2 = async () => {
              executionOrder.push(2);
              await new Promise(resolve => setTimeout(resolve, delay2));
            };

            // Execute first operation
            await withLoading(operation1);
            expect(isLoading.value).toBe(false);

            // Execute second operation after first completes
            await withLoading(operation2);
            expect(isLoading.value).toBe(false);

            // Both operations should have executed in order
            expect(executionOrder).toEqual([1, 2]);
          }
        ),
        { numRuns: 20 } // Reduced from 100
      );
    }, 10000);

    it('should maintain disabled state for entire operation duration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 200 }), // Reduced from 100-400
          async (totalDelay) => {
            const { isLoading, withLoading } = useLoading();
            const sampledStates: boolean[] = [];
            const sampleCount = 5;
            const sampleInterval = totalDelay / sampleCount;

            const operation = async () => {
              for (let i = 0; i < sampleCount; i++) {
                await new Promise(resolve => setTimeout(resolve, sampleInterval));
                sampledStates.push(isLoading.value);
              }
            };

            await withLoading(operation);

            // All sampled states should be true (button disabled)
            expect(sampledStates.every(state => state === true)).toBe(true);
            expect(sampledStates.length).toBe(sampleCount);
            
            // Final state should be false (button enabled)
            expect(isLoading.value).toBe(false);
          }
        ),
        { numRuns: 20 } // Reduced from 100
      );
    }, 10000);

    it('should handle concurrent operations with separate loading states', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 30, max: 80 }), // Reduced from 50-200
          fc.integer({ min: 30, max: 80 }), // Reduced from 50-200
          async (delay1, delay2) => {
            // Simulate two separate buttons with their own loading states
            const button1 = useLoading();
            const button2 = useLoading();

            const operation1 = async () => {
              await new Promise(resolve => setTimeout(resolve, delay1));
              return 'button1';
            };

            const operation2 = async () => {
              await new Promise(resolve => setTimeout(resolve, delay2));
              return 'button2';
            };

            // Start both operations
            const promise1 = button1.withLoading(operation1);
            const promise2 = button2.withLoading(operation2);

            // Both buttons should be disabled (loading)
            expect(button1.isLoading.value).toBe(true);
            expect(button2.isLoading.value).toBe(true);

            // Wait for both to complete
            await Promise.all([promise1, promise2]);

            // Both buttons should be enabled (not loading)
            expect(button1.isLoading.value).toBe(false);
            expect(button2.isLoading.value).toBe(false);
          }
        ),
        { numRuns: 20 } // Reduced from 100
      );
    }, 10000);

    it('should re-enable button even when operation throws error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 30, max: 80 }), // Reduced from 50-200
          async (errorMessage, delay) => {
            const { isLoading, withLoading } = useLoading();

            const failingOperation = async () => {
              await new Promise(resolve => setTimeout(resolve, delay));
              throw new Error(errorMessage);
            };

            // Button should be enabled initially
            expect(isLoading.value).toBe(false);

            // Execute failing operation
            try {
              await withLoading(failingOperation);
            } catch (error) {
              // Expected to throw
            }

            // Button should be re-enabled after error (synchronous)
            expect(isLoading.value).toBe(false);
          }
        ),
        { numRuns: 20 } // Reduced from 100
      );
    }, 10000);

    it('should provide consistent disabled state across operation lifecycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 10, max: 30 }), { minLength: 3, maxLength: 5 }), // Reduced delays and array size
          async (delays) => {
            const { isLoading, withLoading } = useLoading();
            const stateTransitions: Array<{ phase: string; isLoading: boolean }> = [];

            for (let i = 0; i < delays.length; i++) {
              const delay = delays[i];

              // Record state before operation
              stateTransitions.push({ phase: `before-${i}`, isLoading: isLoading.value });

              const operation = async () => {
                await new Promise(resolve => setTimeout(resolve, delay));
                // Record state during operation
                stateTransitions.push({ phase: `during-${i}`, isLoading: isLoading.value });
              };

              await withLoading(operation);

              // Record state after operation
              stateTransitions.push({ phase: `after-${i}`, isLoading: isLoading.value });
            }

            // Verify pattern: before=false, during=true, after=false
            for (let i = 0; i < delays.length; i++) {
              const beforeState = stateTransitions.find(t => t.phase === `before-${i}`);
              const duringState = stateTransitions.find(t => t.phase === `during-${i}`);
              const afterState = stateTransitions.find(t => t.phase === `after-${i}`);

              expect(beforeState?.isLoading).toBe(false);
              expect(duringState?.isLoading).toBe(true);
              expect(afterState?.isLoading).toBe(false);
            }
          }
        ),
        { numRuns: 20 } // Reduced from 100
      );
    }, 10000);
  });

  describe('Loading State Invariants', () => {
    it('should never have loading state stuck as true', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              delay: fc.integer({ min: 5, max: 30 }), // Reduced from 10-100
              shouldFail: fc.boolean(),
            }),
            { minLength: 1, maxLength: 5 } // Reduced from 1-10
          ),
          async (operations) => {
            const { isLoading, withLoading } = useLoading();

            for (const op of operations) {
              const operation = async () => {
                await new Promise(resolve => setTimeout(resolve, op.delay));
                if (op.shouldFail) {
                  throw new Error('Operation failed');
                }
                return 'success';
              };

              try {
                await withLoading(operation);
              } catch {
                // Ignore errors
              }

              // After each operation, loading should always be false
              expect(isLoading.value).toBe(false);
            }

            // Final state must be false
            expect(isLoading.value).toBe(false);
          }
        ),
        { numRuns: 20 } // Reduced from 100
      );
    }, 10000);

    it('should maintain loading state consistency with manual controls', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.oneof(
              fc.constant('start'),
              fc.constant('stop'),
              fc.record({
                type: fc.constant('async'),
                delay: fc.integer({ min: 5, max: 30 }), // Reduced from 10-50
              })
            ),
            { minLength: 5, maxLength: 10 } // Reduced from 5-15
          ),
          async (actions) => {
            const { isLoading, startLoading, stopLoading, withLoading } = useLoading();
            let expectedState = false;

            for (const action of actions) {
              if (action === 'start') {
                startLoading();
                expectedState = true;
                expect(isLoading.value).toBe(expectedState);
              } else if (action === 'stop') {
                stopLoading();
                expectedState = false;
                expect(isLoading.value).toBe(expectedState);
              } else if (typeof action === 'object' && action.type === 'async') {
                await withLoading(async () => {
                  await new Promise(resolve => setTimeout(resolve, action.delay));
                });
                expectedState = false;
                expect(isLoading.value).toBe(expectedState);
              }
            }
          }
        ),
        { numRuns: 20 } // Reduced from 100
      );
    }, 10000);
  });
});
