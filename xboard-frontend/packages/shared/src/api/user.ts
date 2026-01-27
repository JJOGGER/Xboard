/**
 * User API Service
 * Handles user profile and subscription-related API calls
 */

import type { ApiResponse } from '../types';
import type { AuthUser } from '../types/auth';
import type { TrafficLog } from '../types/traffic';
import apiClient from './client';

export interface UpdateProfileData {
  email?: string;
  password?: string;
  current_password?: string;
}

export interface SubscriptionInfo {
  plan_id: number | null;
  plan_name: string | null;
  expired_at: number | null;
  u: number;
  d: number;
  transfer_enable: number;
  subscription_url: string;
  reset_day: number | null;
}

export interface TrafficStats {
  today: number;
  yesterday: number;
  month: number;
  last_month: number;
}

export const userApi = {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<AuthUser>> {
    return apiClient.get('/v1/user/info');
  },

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileData): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v1/user/update', data);
  },

  /**
   * Change password
   */
  async changePassword(data: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v1/user/changePassword', data);
  },

  /**
   * Get subscription information
   */
  async getSubscription(): Promise<ApiResponse<SubscriptionInfo>> {
    return apiClient.get('/v1/user/getSubscribe');
  },

  /**
   * Reset subscription secret
   */
  async resetSubscriptionSecret(): Promise<ApiResponse<{ subscription_url: string }>> {
    return apiClient.post('/v1/user/resetSecurity');
  },

  /**
   * Get user statistics
   */
  async getStats(): Promise<ApiResponse<{
    commission_balance: number;
    commission_count: number;
    invite_count: number;
  }>> {
    return apiClient.get('/v1/user/getStat');
  },

  /**
   * Get traffic logs
   */
  async getTrafficLogs(params?: {
    start_date?: string;
    end_date?: string;
    server_id?: number;
  }): Promise<ApiResponse<TrafficLog[]>> {
    return apiClient.get('/v1/user/stat/getTrafficLog', { params });
  },

  /**
   * Get traffic statistics
   */
  async getTrafficStats(): Promise<ApiResponse<TrafficStats>> {
    return apiClient.get('/v1/user/getStat');
  },
};

