/**
 * Authentication Service
 * Handles user authentication, registration, and token management
 */

import apiClient from './client';
import type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  AuthUser,
  ChangePasswordData,
  ResetPasswordData,
} from '../types';

const TOKEN_KEY = 'auth_token';
const USER_TYPE_KEY = 'user_type';

class AuthService {
  /**
   * Admin login
   * Authenticates an admin user and stores the session token
   */
  async adminLogin(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/v2/passport/auth/login', credentials);

    // Backend may return 'auth_data' field with Bearer token
    const token = response.data.auth_data || response.data.token;
    if (token) {
      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace(/^Bearer\s+/i, '');
      this.setToken(cleanToken);
      localStorage.setItem(USER_TYPE_KEY, 'admin');
    }
    
    return response.data;
  }

  /**
   * User login
   * Authenticates an end user and stores the session token
   */
  async userLogin(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/v1/passport/auth/login', credentials);
    
    // Backend returns 'auth_data' field with Bearer token
    const token = response.data.auth_data || response.data.token;
    if (token) {
      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace(/^Bearer\s+/i, '');
      this.setToken(cleanToken);
      localStorage.setItem(USER_TYPE_KEY, 'user');
    }
    
    return response.data;
  }

  /**
   * User registration
   * Registers a new user account
   */
  async userRegister(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/v1/passport/auth/register', data);
    
    // Backend returns 'auth_data' field with Bearer token
    const token = response.data.auth_data || response.data.token;
    if (token) {
      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace(/^Bearer\s+/i, '');
      this.setToken(cleanToken);
      localStorage.setItem(USER_TYPE_KEY, 'user');
    }
    
    return response.data;
  }

  /**
   * Logout
   * Invalidates the current session and clears stored credentials
   */
  async logout(): Promise<void> {
    try {
      // Backend does not expose a logout endpoint in current routes.
      // Treat logout as a purely client-side token cleanup.
    } catch (error) {
      // Continue with local cleanup even if backend call fails
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear local storage
      this.removeToken();
      localStorage.removeItem(USER_TYPE_KEY);
    }
  }

  /**
   * Get current user
   * Fetches the authenticated user's profile
   */
  async getCurrentUser(): Promise<AuthUser> {
    const userType = localStorage.getItem(USER_TYPE_KEY);
    const endpoint = userType === 'admin' ? '/v2/user/info' : '/v1/user/info';
    const response = await apiClient.get<AuthUser>(endpoint);
    return response.data;
  }

  /**
   * Refresh token
   * Refreshes the authentication token
   */
  async refreshToken(): Promise<string> {
    const userType = localStorage.getItem(USER_TYPE_KEY);
    const endpoint = userType === 'admin' ? '/v2/passport/auth/refresh' : '/v1/passport/auth/refresh';
    const response = await apiClient.post<{ token: string }>(endpoint);
    
    if (response.data.token) {
      this.setToken(response.data.token);
    }
    
    return response.data.token;
  }

  /**
   * Change password
   * Changes the current user's password
   */
  async changePassword(data: ChangePasswordData): Promise<void> {
    const userType = localStorage.getItem(USER_TYPE_KEY);
    const endpoint = userType === 'admin' ? '/v2/user/changePassword' : '/v1/user/changePassword';
    await apiClient.post(endpoint, data);
  }

  /**
   * Request password reset
   * Sends a password reset email
   */
  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post('/v1/passport/auth/forget', { email });
  }

  /**
   * Forgot password (alias for requestPasswordReset)
   * Sends a password reset email
   */
  async forgotPassword(email: string): Promise<void> {
    return this.requestPasswordReset(email);
  }

  /**
   * Reset password
   * Resets password using the reset token
   */
  async resetPassword(data: ResetPasswordData): Promise<void> {
    await apiClient.post('/v1/passport/auth/reset', data);
  }

  /**
   * Get authentication token
   * Retrieves the stored authentication token
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Set authentication token
   * Stores the authentication token in local storage
   */
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  /**
   * Remove authentication token
   * Clears the stored authentication token
   */
  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  /**
   * Check if user is authenticated
   * Returns true if a valid token exists
   */
  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  /**
   * Get user type
   * Returns 'admin' or 'user' based on stored user type
   */
  getUserType(): 'admin' | 'user' | null {
    const type = localStorage.getItem(USER_TYPE_KEY);
    return type as 'admin' | 'user' | null;
  }
}

// Create and export singleton instance
const authService = new AuthService();

// Configure API client to use auth service for token management
apiClient.setTokenGetter(() => authService.getToken());
apiClient.setAuthErrorHandler(() => {
  // Clear auth data on authentication error
  authService.removeToken();
  localStorage.removeItem(USER_TYPE_KEY);
});

export default authService;
export { AuthService };
