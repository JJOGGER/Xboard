/**
 * useCachedApi Composable
 * Provides caching functionality for API calls
 */

import { ref, type Ref } from 'vue';
import cache from '../utils/cache';
import type { ApiError } from '../types';

export interface UseCachedApiOptions {
  ttl?: number; // Cache TTL in milliseconds
  cacheKey?: string; // Custom cache key
  forceRefresh?: boolean; // Force refresh even if cached
}

export interface UseCachedApiReturn<T> {
  data: Ref<T | null>;
  isLoading: Ref<boolean>;
  error: Ref<ApiError | null>;
  execute: (options?: UseCachedApiOptions) => Promise<T | null>;
  invalidate: () => void;
}

/**
 * Composable for making cached API calls
 * @param apiFn - API function to call
 * @param defaultCacheKey - Default cache key
 * @param defaultTTL - Default TTL in milliseconds
 */
export function useCachedApi<T>(
  apiFn: () => Promise<T>,
  defaultCacheKey: string,
  defaultTTL?: number
): UseCachedApiReturn<T> {
  const data = ref<T | null>(null);
  const isLoading = ref(false);
  const error = ref<ApiError | null>(null);

  /**
   * Execute API call with caching
   */
  const execute = async (options: UseCachedApiOptions = {}): Promise<T | null> => {
    const cacheKey = options.cacheKey || defaultCacheKey;
    const ttl = options.ttl || defaultTTL;
    const forceRefresh = options.forceRefresh || false;

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = cache.get<T>(cacheKey);
      if (cachedData !== null) {
        data.value = cachedData;
        return cachedData;
      }
    }

    // Make API call
    isLoading.value = true;
    error.value = null;

    try {
      const result = await apiFn();
      data.value = result;
      
      // Cache the result
      cache.set(cacheKey, result, ttl);
      
      return result;
    } catch (err) {
      error.value = err as ApiError;
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Invalidate cache for this API call
   */
  const invalidate = (): void => {
    cache.delete(defaultCacheKey);
  };

  return {
    data,
    isLoading,
    error,
    execute,
    invalidate,
  };
}

/**
 * Invalidate cache by pattern
 * @param pattern - RegExp pattern to match cache keys
 */
export function invalidateCachePattern(pattern: RegExp): void {
  cache.invalidatePattern(pattern);
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  cache.clear();
}
