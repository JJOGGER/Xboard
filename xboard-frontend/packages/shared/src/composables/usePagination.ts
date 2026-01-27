/**
 * usePagination Composable
 * Manages pagination state and logic
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue';

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

export interface UsePaginationReturn {
  currentPage: Ref<number>;
  pageSize: Ref<number>;
  total: Ref<number>;
  totalPages: ComputedRef<number>;
  hasNextPage: ComputedRef<boolean>;
  hasPrevPage: ComputedRef<boolean>;
  startIndex: ComputedRef<number>;
  endIndex: ComputedRef<number>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotal: (total: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  reset: () => void;
}

/**
 * Composable for managing pagination
 * @param options - Pagination options
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const {
    initialPage = 1,
    initialPageSize = 20,
  } = options;

  const currentPage = ref(initialPage);
  const pageSize = ref(initialPageSize);
  const total = ref(0);

  /**
   * Calculate total pages
   */
  const totalPages = computed(() => {
    return Math.ceil(total.value / pageSize.value);
  });

  /**
   * Check if there's a next page
   */
  const hasNextPage = computed(() => {
    return currentPage.value < totalPages.value;
  });

  /**
   * Check if there's a previous page
   */
  const hasPrevPage = computed(() => {
    return currentPage.value > 1;
  });

  /**
   * Calculate start index for current page
   */
  const startIndex = computed(() => {
    return (currentPage.value - 1) * pageSize.value;
  });

  /**
   * Calculate end index for current page
   */
  const endIndex = computed(() => {
    return Math.min(startIndex.value + pageSize.value, total.value);
  });

  /**
   * Set current page
   * @param page - Page number to set
   */
  const setPage = (page: number): void => {
    if (page < 1 || page > totalPages.value) return;
    currentPage.value = page;
  };

  /**
   * Set page size
   * @param size - Page size to set
   */
  const setPageSize = (size: number): void => {
    pageSize.value = size;
    // Reset to first page when page size changes
    currentPage.value = 1;
  };

  /**
   * Set total items
   * @param totalItems - Total number of items
   */
  const setTotal = (totalItems: number): void => {
    total.value = totalItems;
    // Adjust current page if it exceeds total pages
    if (currentPage.value > totalPages.value && totalPages.value > 0) {
      currentPage.value = totalPages.value;
    }
  };

  /**
   * Go to next page
   */
  const nextPage = (): void => {
    if (hasNextPage.value) {
      currentPage.value++;
    }
  };

  /**
   * Go to previous page
   */
  const prevPage = (): void => {
    if (hasPrevPage.value) {
      currentPage.value--;
    }
  };

  /**
   * Go to first page
   */
  const firstPage = (): void => {
    currentPage.value = 1;
  };

  /**
   * Go to last page
   */
  const lastPage = (): void => {
    if (totalPages.value > 0) {
      currentPage.value = totalPages.value;
    }
  };

  /**
   * Reset pagination to initial state
   */
  const reset = (): void => {
    currentPage.value = initialPage;
    pageSize.value = initialPageSize;
    total.value = 0;
  };

  return {
    currentPage,
    pageSize,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    startIndex,
    endIndex,
    setPage,
    setPageSize,
    setTotal,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    reset,
  };
}
