/**
 * Coupon API Service
 * Handles all coupon-related API calls
 */

import type { ApiResponse, PaginatedResponse } from '../types';
import type { Coupon } from '../types/coupon';
import apiClient from './client';

export interface CouponFilters {
  search?: string;
  show?: number;
}

export interface CreateCouponData {
  code: string;
  name: string;
  type: number;
  value: number;
  limit_use?: number | null;
  limit_use_with_user?: number | null;
  limit_plan_ids?: number[] | null;
  started_at: number;
  ended_at: number;
  show: number;
}

export const couponApi = {
  /**
   * Fetch paginated coupons with filters (admin)
   */
  async getCoupons(params: {
    page?: number;
    page_size?: number;
    filters?: CouponFilters;
  }): Promise<ApiResponse<PaginatedResponse<Coupon>>> {
    return apiClient.get('/v2/coupon/fetch', { 
      params: { ...params, ...params.filters } 
    });
  },

  /**
   * Get coupon by ID (admin)
   */
  async getCouponById(id: number): Promise<ApiResponse<Coupon>> {
    return apiClient.get(`/admin/coupon/detail`, { params: { id } });
  },

  /**
   * Create new coupon (admin)
   */
  async createCoupon(data: CreateCouponData): Promise<ApiResponse<Coupon>> {
    return apiClient.post('/v2/coupon/save', data);
  },

  /**
   * Update coupon (admin)
   */
  async updateCoupon(id: number, data: Partial<CreateCouponData>): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/coupon/update', { id, ...data });
  },

  /**
   * Delete coupon (admin)
   */
  async deleteCoupon(id: number): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/coupon/drop', { id });
  },

  /**
   * Toggle coupon visibility (admin)
   */
  async toggleVisibility(id: number, show: number): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/coupon/show', { id, show });
  },

  /**
   * Generate multiple coupons (admin)
   */
  async generateCoupons(data: {
    generate_count: number;
    name: string;
    type: number;
    value: number;
    limit_use?: number | null;
    limit_use_with_user?: number | null;
    limit_plan_ids?: number[] | null;
    started_at: number;
    ended_at: number;
  }): Promise<ApiResponse<string[]>> {
    return apiClient.post('/v2/coupon/generate', data);
  },

  /**
   * Check coupon validity (user-facing)
   */
  async checkCoupon(code: string): Promise<ApiResponse<{ data: Coupon | null }>> {
    return apiClient.post('/v1/user/coupon/check', { code });
  },
};
