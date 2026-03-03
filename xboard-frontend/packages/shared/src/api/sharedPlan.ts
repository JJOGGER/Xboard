/**
 * Shared Plan Service
 * Handles third-party subscription import and shared plan management
 */

import apiClient from './client';
import type { ApiResponse, PaginatedResponse } from '../types';

// Types
export interface ServerGroup {
  id: number;
  name: string;
  server_count: number;
}

export interface AdminSharedPlanUserSlot {
  slot_id: number;
  user_id: number;
  user_email: string;
  subscription_token: string;
  status: 'active' | 'expired' | 'cancelled';
  allocated_at: string | null;
  expire_at: string | null;
  released_at: string | null;
  shared_subscribe_link: string;
  subscription_content_url: string;
}

export interface SharedPlan {
  id: number;
  name: string;
  description: string | null;
  subscription_url: string;
  subscription_format: 'clash' | 'v2ray' | 'shadowsocks' | 'trojan' | 'hysteria' | 'hysteria2';
  
  // NEW FIELDS
  group_id: number | null;
  group_ids?: number[];
  tags: string[] | null;
  prices: {
    monthly?: number;
    quarterly?: number;
    half_yearly?: number;
    yearly?: number;
    two_yearly?: number;
    three_yearly?: number;
  } | null;
  device_limit?: number | null;
  
  // 后端返回的定价层级数据
  pricing_tiers?: {
    [key: string]: {
      period: {
        name: string;
        days: number;
      };
      price: number;
      average_monthly: number;
    };
  };
  
  // EXISTING FIELDS
  max_slots: number;
  used_slots: number;
  nodes_config: any;
  nodes_count: number;
  total_traffic: number | null;
  used_traffic: number | null;
  expire_at: string | null;
  last_sync_at: string | null;
  sync_status: 'active' | 'failed' | 'expired';
  sync_error: string | null;
  sync_fail_count: number;
  
  // OLD FIELDS (for backward compatibility)
  price: number;
  duration_days: number;
  
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  
  // RELATIONSHIPS
  group?: ServerGroup;
  groups?: Array<{ id: number; name: string }>;

  // Admin list/details may include allocated user slots
  users?: AdminSharedPlanUserSlot[];
}

export interface PlanSlot {
  id: number;
  shared_plan_id: number;
  user_id: number;
  order_id: number | null;
  subscription_token: string;
  allocated_at: string;
  expire_at: string;
  released_at: string | null;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    email: string;
  };

  // Optional fields when slot is represented in admin responses
  shared_subscribe_link?: string;
  subscription_content_url?: string;
}

export interface SubscriptionSyncLog {
  id: number;
  shared_plan_id: number;
  sync_status: 'success' | 'failed';
  nodes_count: number | null;
  traffic_info: any;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface ImportSubscriptionRequest {
  subscription_url: string;
  name: string;
  description?: string;
  group_ids?: number[];
  device_limit?: number | null;
  max_slots: number;
  prices: {
    monthly?: number;
    quarterly?: number;
    half_yearly?: number;
    yearly?: number;
    two_yearly?: number;
    three_yearly?: number;
  };
}

export interface UpdateSharedPlanRequest {
  subscription_url?: string;
  name?: string;
  description?: string;
  group_id?: number | null;
  group_ids?: number[] | null;
  device_limit?: number | null;
  tags?: string[] | null;
  prices?: {
    monthly?: number;
    quarterly?: number;
    half_yearly?: number;
    yearly?: number;
    two_yearly?: number;
    three_yearly?: number;
  } | null;
  max_slots?: number;
}

export interface ParsePreviewResponse {
  format: string;
  nodes_count: number;
  nodes: any[];
  traffic_info: {
    total: number | null;
    used: number | null;
    expire_at: string | null;
  } | null;
}

class SharedPlanService {
  /**
   * Admin: Import subscription and create shared plan
   */
  async importSubscription(data: ImportSubscriptionRequest): Promise<ApiResponse<SharedPlan>> {
    return apiClient.post<SharedPlan>('/v2/shared-plans/import', data);
  }

  /**
   * Admin: Preview subscription before importing
   */
  async previewSubscription(subscriptionUrl: string): Promise<ApiResponse<ParsePreviewResponse>> {
    return apiClient.post<ParsePreviewResponse>('/v2/shared-plans/preview', {
      subscription_url: subscriptionUrl,
    });
  }

  /**
   * Admin: Get all shared plans
   */
  async getAdminPlans(params?: {
    page?: number;
    per_page?: number;
    sync_status?: string;
  }): Promise<ApiResponse<PaginatedResponse<SharedPlan>>> {
    return apiClient.get<PaginatedResponse<SharedPlan>>('/v2/shared-plans', { params });
  }

  /**
   * Admin: Get shared plan details
   */
  async getAdminPlanDetails(id: number): Promise<ApiResponse<{
    plan: SharedPlan;
    slots: PlanSlot[];
  }>> {
    return apiClient.get<{
      plan: SharedPlan;
      slots: PlanSlot[];
    }>(`/v2/shared-plans/${id}`);
  }

  /**
   * Admin: Update shared plan
   */
  async updatePlan(id: number, data: UpdateSharedPlanRequest): Promise<ApiResponse<SharedPlan>> {
    return apiClient.put<SharedPlan>(`/v2/shared-plans/${id}`, data);
  }

  /**
   * Admin: Manually sync subscription
   */
  async syncSubscription(id: number): Promise<ApiResponse<{
    success: boolean;
    message: string;
    nodes_count?: number;
  }>> {
    return apiClient.post<{
      success: boolean;
      message: string;
      nodes_count?: number;
    }>(`/v2/shared-plans/${id}/sync`);
  }

  /**
   * Admin: Get sync logs
   */
  async getSyncLogs(id: number, params?: {
    page?: number;
    per_page?: number;
  }): Promise<ApiResponse<PaginatedResponse<SubscriptionSyncLog>>> {
    return apiClient.get<PaginatedResponse<SubscriptionSyncLog>>(
      `/v2/shared-plans/${id}/sync-logs`,
      { params }
    );
  }

  /**
   * Admin: Delete shared plan
   */
  async deletePlan(id: number): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>(`/v2/shared-plans/${id}`);
  }

  /**
   * User: Get available shared plans
   */
  async getUserPlans(): Promise<ApiResponse<SharedPlan[]>> {
    return apiClient.get<SharedPlan[]>('/v1/user/shared-plans');
  }

  /**
   * User: Get user's purchased shared plans
   */
  async getUserSubscriptions(): Promise<ApiResponse<{
    plan: SharedPlan;
    slot: PlanSlot;
    subscription_url: string;
  }[]>> {
    return apiClient.get<{
      plan: SharedPlan;
      slot: PlanSlot;
      subscription_url: string;
    }[]>('/v1/user/shared-plans/subscriptions');
  }
}

// Create and export singleton instance
const sharedPlanService = new SharedPlanService();

export default sharedPlanService;
export { SharedPlanService };
