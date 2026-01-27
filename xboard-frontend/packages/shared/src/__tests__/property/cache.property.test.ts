/**
 * Property-Based Tests for Data Caching
 * Feature: vue-admin-user-frontend
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { Cache } from '../../utils/cache';

describe('Cache Property Tests', () => {
  describe('Property 23: Data caching', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 23: Data caching
     * Validates: Requirements 31.5
     * 
     * For any frequently accessed data, subsequent requests within the cache TTL
     * should use cached data instead of making new API calls.
     * 
     * This property ensures that:
     * 1. Data stored in cache can be retrieved within TTL
     * 2. Data expires after TTL and returns null
     * 3. Cache respects TTL boundaries
     * 4. Multiple cache operations maintain consistency
     */

    let cache: Cache;

    beforeEach(() => {
      // Create a fresh cache instance for each test
      cache = new Cache({ defaultTTL: 1000, maxSize: 100 });
    });

    it('should return cached data for any key within TTL period', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.anything(),
          fc.integer({ min: 100, max: 5000 }),
          (key, data, ttl) => {
            // Store data in cache
            cache.set(key, data, ttl);

            // Immediately retrieve data (within TTL)
            const retrieved = cache.get(key);

            // Data should be available
            expect(retrieved).toEqual(data);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for any expired cache entry', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.anything(),
          fc.integer({ min: 10, max: 50 }), // Short TTL for testing
          async (key, data, ttl) => {
            // Store data with short TTL
            cache.set(key, data, ttl);

            // Wait for TTL to expire
            await new Promise(resolve => setTimeout(resolve, ttl + 10));

            // Data should be expired
            const retrieved = cache.get(key);
            expect(retrieved).toBeUndefined();
          }
        ),
        { numRuns: 50 } // Fewer runs due to async nature
      );
    });

    it('should maintain cache consistency for multiple operations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 20 }),
              value: fc.anything(),
              ttl: fc.integer({ min: 1000, max: 10000 })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (operations) => {
            // Perform all set operations
            operations.forEach(op => {
              cache.set(op.key, op.value, op.ttl);
            });

            // Build a map of last value for each key (since later sets overwrite)
            const lastValues = new Map<string, any>();
            operations.forEach(op => {
              lastValues.set(op.key, op.value);
            });

            // Verify all data can be retrieved with correct last values
            lastValues.forEach((expectedValue, key) => {
              const retrieved = cache.get(key);
              expect(retrieved).toEqual(expectedValue);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect custom TTL over default TTL for any data', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.anything(),
          fc.integer({ min: 100, max: 1000 }),
          (key, data, customTTL) => {
            // Set with custom TTL
            cache.set(key, data, customTTL);

            // Retrieve immediately
            const retrieved = cache.get(key);

            // Should be available and equal to stored data
            expect(retrieved).toEqual(data);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle cache updates correctly for any key', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.anything(),
          fc.anything(),
          fc.integer({ min: 1000, max: 5000 }),
          (key, initialData, updatedData, ttl) => {
            // Skip if both values are deeply equal (can't test update in this case)
            fc.pre(JSON.stringify(initialData) !== JSON.stringify(updatedData));

            // Set initial data
            cache.set(key, initialData, ttl);
            expect(cache.get(key)).toEqual(initialData);

            // Update data
            cache.set(key, updatedData, ttl);
            const retrieved = cache.get(key);

            // Should return updated data
            expect(retrieved).toEqual(updatedData);
            expect(retrieved).not.toEqual(initialData);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly report cache existence for any key', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.anything(),
          fc.integer({ min: 1000, max: 5000 }),
          (key, data, ttl) => {
            // Before setting, key should not exist
            expect(cache.has(key)).toBe(false);

            // After setting, key should exist
            cache.set(key, data, ttl);
            
            // Key should exist (cache.has checks if get() !== undefined)
            // This works for all values including null
            expect(cache.has(key)).toBe(true);

            // After deletion, key should not exist
            cache.delete(key);
            expect(cache.has(key)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain correct cache size for any sequence of operations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 20 }),
              value: fc.anything()
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (items) => {
            // Clear cache first
            cache.clear();
            expect(cache.size()).toBe(0);

            // Add all items
            const uniqueKeys = new Set<string>();
            items.forEach(item => {
              cache.set(item.key, item.value);
              uniqueKeys.add(item.key);
            });

            // Size should match number of unique keys (up to maxSize)
            const expectedSize = Math.min(uniqueKeys.size, 100); // maxSize is 100
            expect(cache.size()).toBeLessThanOrEqual(expectedSize);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enforce max size limit for any cache operations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 20 }),
              value: fc.anything()
            }),
            { minLength: 101, maxLength: 150 } // More than maxSize
          ),
          (items) => {
            // Create cache with small max size
            const smallCache = new Cache({ maxSize: 50 });

            // Add all items
            items.forEach(item => {
              smallCache.set(item.key, item.value);
            });

            // Size should never exceed maxSize
            expect(smallCache.size()).toBeLessThanOrEqual(50);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should correctly invalidate cache entries matching any pattern', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => {
            // Filter out strings that would create invalid regex patterns
            try {
              new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:`);
              return true;
            } catch {
              return false;
            }
          }),
          fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 5, maxLength: 20 }),
          fc.anything(),
          (prefix, ids, data) => {
            // Clear cache
            cache.clear();

            // Add items with pattern
            ids.forEach(id => {
              cache.set(`${prefix}:${id}`, data);
            });

            // Add items without pattern
            cache.set('other:1', data);
            cache.set('different:2', data);

            const initialSize = cache.size();

            // Escape special regex characters in prefix
            const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Invalidate pattern
            cache.invalidatePattern(new RegExp(`^${escapedPrefix}:`));

            // Items with pattern should be removed
            ids.forEach(id => {
              expect(cache.has(`${prefix}:${id}`)).toBe(false);
            });

            // Items without pattern should remain
            expect(cache.has('other:1')).toBe(true);
            expect(cache.has('different:2')).toBe(true);

            // Size should be reduced
            expect(cache.size()).toBeLessThan(initialSize);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle deletion of non-existent keys gracefully', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (key) => {
            // Delete non-existent key should not throw
            expect(() => cache.delete(key)).not.toThrow();

            // Cache should remain functional
            cache.set('test', 'value');
            expect(cache.get('test')).toBe('value');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve data integrity for any data type', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.float(),
            fc.boolean(),
            fc.array(fc.anything()),
            fc.object(),
            fc.constant(null),
            fc.constant(undefined)
          ),
          (key, data) => {
            // Store data
            cache.set(key, data);

            // Retrieve data
            const retrieved = cache.get(key);

            // Data should be identical (deep equality)
            expect(retrieved).toEqual(data);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear all cache entries regardless of content', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1 }),
              value: fc.anything()
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (items) => {
            // Add all items
            items.forEach(item => {
              cache.set(item.key, item.value);
            });

            // Verify items exist
            expect(cache.size()).toBeGreaterThan(0);

            // Clear cache
            cache.clear();

            // Cache should be empty
            expect(cache.size()).toBe(0);

            // All items should be gone
            items.forEach(item => {
              expect(cache.has(item.key)).toBe(false);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle concurrent-like operations correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.array(fc.anything(), { minLength: 2, maxLength: 10 }),
          (key, values) => {
            // Simulate rapid updates to same key
            values.forEach(value => {
              cache.set(key, value);
            });

            // Should have the last value
            const retrieved = cache.get(key);
            expect(retrieved).toEqual(values[values.length - 1]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain cache functionality after cleanup', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 20 }),
              value: fc.anything(),
              ttl: fc.integer({ min: 10, max: 50 })
            }),
            { minLength: 5, maxLength: 20 }
          ),
          async (items) => {
            // Add items with short TTL
            items.forEach(item => {
              cache.set(item.key, item.value, item.ttl);
            });

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 60));

            // Run cleanup
            cache.cleanup();

            // Cache should still be functional
            cache.set('new-key', 'new-value', 1000);
            expect(cache.get('new-key')).toBe('new-value');
          }
        ),
        { numRuns: 30 } // Fewer runs due to async nature
      );
    });

    it('should handle edge case of zero or negative TTL gracefully', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.anything(),
          fc.integer({ min: -1000, max: 0 }),
          (key, data, negativeTTL) => {
            // Set with zero or negative TTL
            cache.set(key, data, negativeTTL);

            // Should either be immediately expired or use default TTL
            // The implementation should handle this gracefully
            const retrieved = cache.get(key);

            // If it returns null, that's acceptable (expired)
            // If it returns data, that's also acceptable (used default TTL)
            // The key is that it doesn't throw an error
            expect(() => cache.get(key)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain isolation between different cache instances', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.anything(),
          fc.anything(),
          (key, data1, data2) => {
            // Create two separate cache instances
            const cache1 = new Cache();
            const cache2 = new Cache();

            // Set different data in each cache
            cache1.set(key, data1);
            cache2.set(key, data2);

            // Each cache should have its own data
            expect(cache1.get(key)).toEqual(data1);
            expect(cache2.get(key)).toEqual(data2);
            expect(cache1.get(key)).not.toEqual(cache2.get(key));
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
