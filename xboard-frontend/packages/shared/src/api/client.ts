/**
 * API Client
 * Axios-based HTTP client with interceptors for authentication and error handling
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError, type CancelTokenSource } from 'axios';
import type { ApiResponse, ApiError, ErrorResponse } from '../types';

type RuntimeSettings = {
  base_url?: string;
  secure_path?: string;
};

function normalizeSecurePath(value: string): string {
  return value.replace(/^\/+/, '').replace(/\/+$/, '');
}

function getSecurePathFromLocationPathname(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const pathname = window.location.pathname;
  const mazuMatch = pathname.match(/^\/([\w-]+)\/mazu(?:\/|$)/);
  if (mazuMatch?.[1]) return mazuMatch[1];
  const adminMatch = pathname.match(/^\/([\w-]+)\/admin(?:\/|$)/);
  if (adminMatch?.[1]) return adminMatch[1];
  return undefined;
}

function getRuntimeSettings(): RuntimeSettings | undefined {
  return (globalThis as any)?.window?.settings as RuntimeSettings | undefined;
}

function joinUrl(base: string, path: string): string {
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  withCredentials: boolean;
}

class ApiClient {
  private instance: AxiosInstance;
  private tokenGetter: (() => string | null) | null = null;
  private onAuthError: (() => void) | null = null;
  private pendingRequests: Map<string, CancelTokenSource> = new Map();

  constructor(config: ApiClientConfig) {
    this.instance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      withCredentials: config.withCredentials,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  /**
   * Set token getter function
   * This function will be called to get the current auth token
   */
  setTokenGetter(getter: () => string | null): void {
    this.tokenGetter = getter;
  }

  /**
   * Set auth error handler
   * This function will be called when authentication fails
   */
  setAuthErrorHandler(handler: () => void): void {
    this.onAuthError = handler;
  }

  /**
   * Generate a unique key for a request
   */
  private getRequestKey(config: AxiosRequestConfig): string {
    const { method = 'get', url = '', params = {}, data = {} } = config;
    return `${method.toUpperCase()}_${url}_${JSON.stringify(params)}_${JSON.stringify(data)}`;
  }

  /**
   * Cancel a pending request by key
   */
  cancelRequest(key: string): void {
    const source = this.pendingRequests.get(key);
    if (source) {
      source.cancel('Request cancelled by user');
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    this.pendingRequests.forEach((source) => {
      source.cancel('All requests cancelled');
    });
    this.pendingRequests.clear();
  }

  /**
   * Setup request interceptor to inject authentication token and handle cancellation
   */
  private setupRequestInterceptor(): void {
    this.instance.interceptors.request.use(
      (config) => {
        // Inject authentication token if available
        if (this.tokenGetter) {
          const token = this.tokenGetter();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        // Add secure_path prefix for V2 admin API calls
        // V2 admin routes require secure_path: /api/v2/{secure_path}/*
        // IMPORTANT: only enable this behavior when VITE_SECURE_PATH is explicitly provided.
        // User app does not set VITE_SECURE_PATH and must NOT have secure_path injected.
        if (config.url && config.url.startsWith('/v2/')) {
          // Public routes that don't need secure_path
          const publicRoutes = [
            '/v2/passport/',           // Authentication routes
            '/v2/user/info',           // User info
            '/v2/user/resetSecurity',  // Reset security
            // User order routes (do NOT require secure_path)
            '/v2/order/payment/',
            '/v2/order/checkout',
            '/v2/order/check',
            '/v2/order/payment-methods',
            // User shared plans list
            '/v2/user/shared-plans',
            '/v2/user/my-shared-subscriptions',
          ];
          
          const isPublicRoute = publicRoutes.some(route => config.url!.startsWith(route));

          // Only add secure_path if it's NOT a public route AND secure_path is configured
          const runtimeSecurePath = getRuntimeSettings()?.secure_path;
          const securePath = runtimeSecurePath || getSecurePathFromLocationPathname() || import.meta.env.VITE_SECURE_PATH;
          const normalizedSecurePath = typeof securePath === 'string' ? normalizeSecurePath(securePath) : '';

          // If a caller already provided /v2/{secure_path}/..., do not inject again.
          // NOTE: do not treat '/v2/stat/...' (or other admin modules) as already scoped.
          const isAlreadySecureScoped =
            normalizedSecurePath.length > 0 &&
            config.url!.startsWith(`/v2/${normalizedSecurePath}/`);
          
          if (!isPublicRoute && !isAlreadySecureScoped && normalizedSecurePath.length > 0) {
            console.log('[API Client] Adding secure_path to admin route:', config.url);
            // Insert secure_path after /v2/
            config.url = config.url.replace('/v2/', `/v2/${normalizedSecurePath}/`);
          }
        }

        // Add cancel token for request cancellation
        const requestKey = this.getRequestKey(config);
        
        // Cancel previous request with same key if exists
        if (this.pendingRequests.has(requestKey)) {
          const source = this.pendingRequests.get(requestKey);
          source?.cancel('Duplicate request cancelled');
        }

        // Create new cancel token
        const source = axios.CancelToken.source();
        config.cancelToken = source.token;
        this.pendingRequests.set(requestKey, source);

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  /**
   * Setup response interceptor for error handling and transformation
   */
  private setupResponseInterceptor(): void {
    this.instance.interceptors.response.use(
      (response) => {
        // Remove request from pending map
        const requestKey = this.getRequestKey(response.config);
        this.pendingRequests.delete(requestKey);
        
        // Transform successful response
        return response;
      },
      (error: AxiosError<ErrorResponse>) => {
        // Remove request from pending map
        if (error.config) {
          const requestKey = this.getRequestKey(error.config);
          this.pendingRequests.delete(requestKey);
        }

        // Handle cancelled requests
        if (axios.isCancel(error)) {
          return Promise.reject({
            type: 'cancelled',
            message: 'Request was cancelled',
            status: 0,
            retryable: false,
          });
        }

        const apiError = this.transformError(error);
        
        // Handle authentication errors
        if (apiError.type === 'auth' && this.onAuthError) {
          this.onAuthError();
        }
        
        // Note: Error notifications are handled at the component/store level
        // using the useErrorNotification composable
        
        return Promise.reject(apiError);
      }
    );
  }

  /**
   * Transform Axios error to ApiError
   */
  private transformError(error: AxiosError<ErrorResponse>): ApiError {
    const { response, message } = error;

    // Network errors (no response)
    if (!response) {
      return {
        type: 'network',
        message: 'Network error. Please check your connection.',
        status: 0,
        retryable: true,
      };
    }

    // Authentication errors (401)
    if (response.status === 401) {
      return {
        type: 'auth',
        message: response.data?.message || 'Session expired. Please login again.',
        status: response.status,
        retryable: false,
      };
    }

    // Permission errors (403)
    if (response.status === 403) {
      return {
        type: 'permission',
        message: response.data?.message || 'You do not have permission to perform this action.',
        status: response.status,
        retryable: false,
      };
    }

    // Validation errors (422)
    if (response.status === 422) {
      return {
        type: 'validation',
        message: response.data?.message || 'Validation failed.',
        status: response.status,
        retryable: false,
        errors: response.data?.errors,
      };
    }

    // Server errors (5xx)
    if (response.status >= 500) {
      return {
        type: 'server',
        message: response.data?.message || 'Server error. Please try again later.',
        status: response.status,
        retryable: true,
      };
    }

    // Other errors (including 400 with custom data)
    return {
      type: 'unknown',
      message: response.data?.message || message || 'An unknown error occurred.',
      status: response.status,
      retryable: false,
    };
  }

  /**
   * Generic GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  /**
   * Generic POST request
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * Generic PUT request
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * Generic PATCH request
   */
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * Generic DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  /**
   * Get the underlying Axios instance
   * Useful for advanced configurations
   */
  getAxiosInstance(): AxiosInstance {
    return this.instance;
  }
}

// Create and export default API client instance
const apiClient = new ApiClient({
  baseURL: (() => {
    const apiPath = import.meta.env.VITE_API_BASE_URL || '/api';
    const runtimeBaseUrl = getRuntimeSettings()?.base_url;
    if (typeof runtimeBaseUrl === 'string' && runtimeBaseUrl.length > 0) {
      return joinUrl(runtimeBaseUrl, apiPath);
    }
    return apiPath;
  })(),
  timeout: 30000, // 30 seconds
  withCredentials: false,
});

export default apiClient;
export { ApiClient };
