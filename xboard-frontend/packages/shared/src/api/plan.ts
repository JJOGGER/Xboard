/**
 * Plan API Service
 * Handles all plan-related API calls
 */

import type { ApiResponse } from '../types';
import type { Plan } from '../types/plan';
import apiClient from './client';

export const planApi = {
  /**
   * Fetch all visible plans (user-facing)
   * Uses guest endpoint so unauthenticated users can view plans
   */
  async getPlans(): Promise<ApiResponse<{ data: Plan[] }>> {
    return apiClient.get('/v1/guest/plan/fetch');
  },

  /**
   * Fetch all plans (admin)
   */
  async getAllPlans(): Promise<ApiResponse<{ data: Plan[] }>> {
    return apiClient.get('/v2/plan/fetch');
  },

  /**
   * Get plan by ID
   */
  async getPlanById(id: number): Promise<ApiResponse<{ data: Plan }>> {
    return apiClient.get(`/v2/plan/${id}`);
  },

  /**
   * Create new plan (admin)
   */
  async createPlan(data: Partial<Plan>): Promise<ApiResponse<{ data: Plan }>> {
    return apiClient.post('/v2/plan/save', data);
  },

  /**
   * Update plan (admin)
   */
  async updatePlan(id: number, data: Partial<Plan>): Promise<ApiResponse<{ data: Plan }>> {
    return apiClient.post(`/v2/plan/update`, { id, ...data });
  },

  /**
   * Delete plan (admin)
   */
  async deletePlan(id: number): Promise<ApiResponse<boolean>> {
    return apiClient.post(`/v2/plan/drop`, { id });
  },

  /**
   * Update plan sort order (admin)
   */
  async updateSort(planIds: number[]): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/plan/sort', { plan_ids: planIds });
  },
};

export default planApi;
