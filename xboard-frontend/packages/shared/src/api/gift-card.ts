/**
 * Gift Card API Service
 * Handles all gift card-related API calls
 */

import type { ApiResponse, PaginatedResponse } from '../types';
import type { GiftCardTemplate, GiftCardCode } from '../types/gift-card';
import apiClient from './client';

export const giftCardApi = {
  // ========== User Methods ==========
  /**
   * Check gift card validity (user)
   */
  async checkGiftCard(code: string): Promise<ApiResponse<any>> {
    return apiClient.post('/v1/user/gift-card/check', { code });
  },

  /**
   * Redeem gift card (user)
   */
  async redeemGiftCard(code: string): Promise<ApiResponse<any>> {
    return apiClient.post('/v1/user/gift-card/redeem', { code });
  },

  /**
   * Get gift card usage history (user)
   */
  async getHistory(): Promise<ApiResponse<any[]>> {
    return apiClient.get('/v1/user/gift-card/history');
  },

  /**
   * Get gift card detail (user)
   */
  async getDetail(id: number): Promise<ApiResponse<any>> {
    return apiClient.get('/v1/user/gift-card/detail', { params: { id } });
  },

  /**
   * Get gift card types (user)
   */
  async getTypes(): Promise<ApiResponse<any[]>> {
    return apiClient.get('/v1/user/gift-card/types');
  },

  // ========== Admin Methods ==========
  /**
   * Get templates (admin)
   */
  async getTemplates(): Promise<ApiResponse<GiftCardTemplate[]>> {
    return apiClient.get('/v2/gift-card/templates');
  },

  /**
   * Create template (admin)
   */
  async createTemplate(data: {
    name: string;
    type: number;
    amount: number;
    validity_period?: number | null;
  }): Promise<ApiResponse<GiftCardTemplate>> {
    return apiClient.post('/v2/gift-card/create-template', data);
  },

  /**
   * Update template (admin)
   */
  async updateTemplate(id: number, data: Partial<GiftCardTemplate>): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/gift-card/update-template', { id, ...data });
  },

  /**
   * Delete template (admin)
   */
  async deleteTemplate(id: number): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/gift-card/delete-template', { id });
  },

  /**
   * Get codes (admin)
   */
  async getCodes(params: {
    page?: number;
    page_size?: number;
    template_id?: number;
    status?: number;
  }): Promise<ApiResponse<PaginatedResponse<GiftCardCode>>> {
    return apiClient.get('/v2/gift-card/codes', { params });
  },

  /**
   * Generate codes (admin)
   */
  async generateCodes(data: {
    template_id: number;
    count: number;
  }): Promise<ApiResponse<string[]>> {
    return apiClient.post('/v2/gift-card/generate-codes', data);
  },

  /**
   * Toggle code status (admin)
   */
  async toggleCodeStatus(id: number, status: number): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/gift-card/toggle-code', { id, status });
  },

  /**
   * Update code (admin)
   */
  async updateCode(id: number, data: any): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/gift-card/update-code', { id, ...data });
  },

  /**
   * Delete code (admin)
   */
  async deleteCode(id: number): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/gift-card/delete-code', { id });
  },

  /**
   * Get usage records (admin)
   */
  async getUsages(params?: any): Promise<ApiResponse<any>> {
    return apiClient.get('/v2/gift-card/usages', { params });
  },

  /**
   * Get statistics (admin)
   */
  async getStatistics(): Promise<ApiResponse<any>> {
    return apiClient.get('/v2/gift-card/statistics');
  },

  /**
   * Get admin types (admin)
   */
  async getAdminTypes(): Promise<ApiResponse<any[]>> {
    return apiClient.get('/v2/gift-card/types');
  },

  /**
   * Export codes (admin)
   */
  async exportCodes(params?: any): Promise<ApiResponse<any>> {
    return apiClient.get('/v2/gift-card/export-codes', { params });
  },
};
