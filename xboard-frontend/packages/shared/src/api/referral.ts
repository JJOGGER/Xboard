/**
 * Referral API Service
 * Handles all referral and commission-related API calls
 */

import type { ApiResponse, PaginatedResponse } from '../types';
import type { CommissionLog, InviteCode } from '../types/referral';
import apiClient from './client';

export const referralApi = {
  /**
   * Invite overview: codes + stats
   */
  async getInviteOverview(): Promise<ApiResponse<{ codes: InviteCode[]; stat: any; stat_legacy?: any }>> {
    return apiClient.get('/v1/user/invite/fetch');
  },

  /**
   * Generate/save new invite code
   */
  async generateInviteCode(): Promise<ApiResponse<InviteCode>> {
    return apiClient.get('/v1/user/invite/save');
  },

  /**
   * Get invited users (invite list)
   */
  async getInvitedUsers(params?: { page?: number; page_size?: number }): Promise<ApiResponse<PaginatedResponse<any>>> {
    return apiClient.get('/v1/user/invite/users', { params });
  },

  /**
   * Get commission logs (legacy)
   */
  async getCommissionLogs(params?: { page?: number; page_size?: number }): Promise<ApiResponse<PaginatedResponse<CommissionLog>>> {
    return apiClient.get('/v1/user/invite/details', { params });
  },
};
