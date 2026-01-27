/**
 * Notice API Service
 * Handles all notice-related API calls
 */

import type { ApiResponse } from '../types';
import type { Notice } from '../types/notice';
import apiClient from './client';

export const noticeApi = {
  // ========== USER API ==========
  
  /**
   * USER API: Get user-visible notices
   */
  async getUserNotices(): Promise<ApiResponse<Notice[]>> {
    return apiClient.get('/v1/user/notice/fetch');
  },

  // ========== ADMIN API ==========

  /**
   * ADMIN API: Get all notices (including hidden ones)
   */
  async getNotices(): Promise<ApiResponse<Notice[]>> {
    return apiClient.get('/v2/notice/fetch');
  },

  /**
   * ADMIN API: Create new notice
   */
  async createNotice(data: {
    title: string;
    content: string;
    img_url?: string | null;
    show?: number;
    sort?: number;
  }): Promise<ApiResponse<Notice>> {
    return apiClient.post('/v2/notice/save', data);
  },

  /**
   * ADMIN API: Update notice
   */
  async updateNotice(id: number, data: Partial<Notice>): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/notice/update', { id, ...data });
  },

  /**
   * ADMIN API: Delete notice
   */
  async deleteNotice(id: number): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/notice/drop', { id });
  },

  /**
   * ADMIN API: Toggle notice visibility
   */
  async toggleVisibility(id: number, show: number): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/notice/show', { id, show });
  },

  /**
   * ADMIN API: Update notice sort order
   */
  async updateSort(items: { id: number; sort: number }[]): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/notice/sort', { items });
  },
};
