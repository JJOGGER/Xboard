/**
 * Referral API Service
 * Handles all referral and commission-related API calls
 */

import type { ApiResponse, PaginatedResponse } from '../types';
import type { CommissionLog, ReferralStats, InviteCode, ReferredUser } from '../types/referral';
import apiClient from './client';

export const referralApi = {
  /**
   * Get user statistics (includes commission data)
   */
  async getStats(): Promise<ApiResponse<ReferralStats>> {
    return apiClient.get('/v1/user/getStat');
  },

  /**
   * Get referred users (invite list)
   */
  async getReferredUsers(): Promise<ApiResponse<ReferredUser[]>> {
    return apiClient.get('/v1/user/invite/fetch');
  },

  /**
   * Get invite details
   */
  async getInviteDetails(): Promise<ApiResponse<any>> {
    return apiClient.get('/v1/user/invite/details');
  },

  /**
   * Generate/save new invite code
   */
  async generateInviteCode(): Promise<ApiResponse<InviteCode>> {
    return apiClient.get('/v1/user/invite/save');
  },
};
