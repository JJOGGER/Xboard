/**
 * API Response and Error Types
 * These types define the structure of API responses and errors
 */

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: number;
}

export interface ApiError {
  message: string;
  code?: string;
  status: number;
  type: 'network' | 'auth' | 'permission' | 'validation' | 'server' | 'unknown' | 'cancelled';
  retryable: boolean;
  errors?: Record<string, string[]>;
}

export interface PaginationParams {
  page: number;
  page_size: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  current_page: number;
  per_page: number;
  last_page: number;
}

export interface FilterParams {
  search?: string;
  status?: number;
  date_start?: string;
  date_end?: string;
  [key: string]: any;
}

export interface SortParams {
  sort_by: string;
  sort_order: 'asc' | 'desc';
}

export interface StandardResponse<T> {
  data: T;
  message?: string;
}

export interface ErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}
