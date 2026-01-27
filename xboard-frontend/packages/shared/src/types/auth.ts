/**
 * Authentication Types
 * Defines authentication-related data structures
 */

import type { AuthUser } from './user';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  password_confirmation: string;
  invite_code?: string;
}

export interface AuthResponse {
  token?: string;
  auth_data?: string;  // Backend returns 'auth_data' with Bearer token
  user?: AuthUser;
  is_admin?: boolean;  // Backend returns is_admin in login response
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

export interface ResetPasswordData {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}
