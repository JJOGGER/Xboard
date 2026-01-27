/**
 * useSearch Composable
 * Optimized search with debouncing and request cancellation
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'
import apiClient from '../api/client'
import type { ApiResponse } from '../types'

export interface UseSearchOptions<T> {
  endpoint: string
  debounceDelay?: number
  minLength?: number
  transform?: (data: any) => T[]
  params?: Record<string, any>
}

export interface UseSearchReturn<T> {
  results: Ref<T[]>
  loading: Ref<boolean>
  error: Ref<Error | null>
  search: (query: string) => void
  clear: () => void
}

/**
 * Composable for optimized search with debouncing and cancellation
 * @param options - Search configuration options
 */
export function useSearch<T = any>(options: UseSearchOptions<T>): UseSearchReturn<T> {
  const {
    endpoint,
    debounceDelay = 300,
    minLength = 2,
    transform = (data) => data,
    params = {}
  } = options

  const results = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const searchQuery = ref('')
  
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let currentRequestKey: string | null = null

  /**
   * Perform the search request
   */
  const performSearch = async (query: string) => {
    // Cancel previous request if exists
    if (currentRequestKey) {
      apiClient.cancelRequest(currentRequestKey)
    }

    // Don't search if query is too short
    if (query.length < minLength) {
      results.value = []
      return
    }

    loading.value = true
    error.value = null
    currentRequestKey = `search_${endpoint}_${query}`

    try {
      const response = await apiClient.get<{ data: any[] }>(endpoint, {
        params: {
          ...params,
          search: query
        }
      })

      results.value = transform(response.data)
    } catch (err: any) {
      // Ignore cancelled requests
      if (err.type !== 'cancelled') {
        error.value = err
        results.value = []
      }
    } finally {
      loading.value = false
      currentRequestKey = null
    }
  }

  /**
   * Debounced search function
   */
  const search = (query: string) => {
    searchQuery.value = query

    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Clear results if query is empty
    if (!query) {
      results.value = []
      loading.value = false
      return
    }

    // Set loading state immediately
    loading.value = true

    // Debounce the search
    debounceTimer = setTimeout(() => {
      performSearch(query)
    }, debounceDelay)
  }

  /**
   * Clear search results and cancel pending requests
   */
  const clear = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    if (currentRequestKey) {
      apiClient.cancelRequest(currentRequestKey)
      currentRequestKey = null
    }

    searchQuery.value = ''
    results.value = []
    loading.value = false
    error.value = null
  }

  // Cleanup on unmount
  onUnmounted(() => {
    clear()
  })

  return {
    results,
    loading,
    error,
    search,
    clear
  }
}

/**
 * Composable for autocomplete with caching
 */
export function useAutocomplete<T = any>(
  options: UseSearchOptions<T> & { cacheSize?: number }
): UseSearchReturn<T> & { cache: Map<string, T[]> } {
  const { cacheSize = 50, ...searchOptions } = options
  const cache = new Map<string, T[]>()

  const baseSearch = useSearch<T>(searchOptions)

  // Override search to use cache
  const originalSearch = baseSearch.search
  const search = (query: string) => {
    // Check cache first
    if (cache.has(query)) {
      baseSearch.results.value = cache.get(query)!
      baseSearch.loading.value = false
      return
    }

    // Perform search and cache results
    originalSearch(query)
  }

  // Watch results to update cache
  watch(
    () => baseSearch.results.value,
    (newResults) => {
      if (newResults.length > 0 && baseSearch.searchQuery) {
        // Add to cache
        cache.set(baseSearch.searchQuery, newResults)

        // Limit cache size
        if (cache.size > cacheSize) {
          const firstKey = cache.keys().next().value
          cache.delete(firstKey)
        }
      }
    }
  )

  return {
    ...baseSearch,
    search,
    cache
  }
}

/**
 * Composable for multi-field search
 */
export function useMultiFieldSearch<T = any>(
  options: Omit<UseSearchOptions<T>, 'params'> & {
    fields: string[]
    operator?: 'AND' | 'OR'
  }
): UseSearchReturn<T> {
  const { fields, operator = 'OR', ...searchOptions } = options

  return useSearch<T>({
    ...searchOptions,
    params: {
      fields: fields.join(','),
      operator
    }
  })
}
