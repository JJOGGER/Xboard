/**
 * Server API Service
 * Handles all server-related API calls
 */

import type { ApiResponse } from '../types';
import type { ServerNode, ServerGroup, ServerRoute } from '../types/server';
import apiClient from './client';

export const serverApi = {
  // ========== User Methods ==========
  /**
   * Fetch servers (user)
   */
  async getUserServers(): Promise<ApiResponse<ServerNode[]>> {
    return apiClient.get('/v1/user/server/fetch');
  },

  /**
   * Fetch servers by group (user)
   */
  async getUserServersByGroup(): Promise<ApiResponse<any>> {
    return apiClient.get('/v1/user/server/fetchByGroup');
  },

  // ========== Admin Methods ==========
  /**
   * Get all server nodes (admin)
   */
  async getNodes(): Promise<ApiResponse<ServerNode[]>> {
    return apiClient.get('/v2/server/manage/getNodes');
  },

  /**
   * Save server node (admin)
   */
  async saveNode(data: Partial<ServerNode>): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/server/manage/save', data);
  },

  /**
   * Update server node (admin)
   */
  async updateNode(id: number, data: { show: boolean }): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/server/manage/update', { id, ...data });
  },

  /**
   * Delete server node (admin)
   */
  async deleteNode(id: number): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/server/manage/drop', { id });
  },

  /**
   * Copy server node (admin)
   */
  async copyNode(id: number): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/server/manage/copy', { id });
  },

  /**
   * Sort server nodes (admin)
   */
  async sortNodes(items: Array<{ id: number; order: number }>): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/server/manage/sort', items);
  },

  // Server Groups
  /**
   * Get server groups (admin)
   */
  async getGroups(): Promise<ApiResponse<ServerGroup[]>> {
    return apiClient.get('/v2/server/group/fetch');
  },

  /**
   * Save server group (admin)
   */
  async saveGroup(data: { id?: number; name: string }): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/server/group/save', data);
  },

  /**
   * Delete server group (admin)
   */
  async deleteGroup(id: number): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/server/group/drop', { id });
  },

  // Server Routes
  /**
   * Get server routes (admin)
   */
  async getRoutes(): Promise<ApiResponse<ServerRoute[]>> {
    return apiClient.get('/v2/server/route/fetch');
  },

  /**
   * Save server route (admin)
   */
  async saveRoute(data: Partial<ServerRoute>): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/server/route/save', data);
  },

  /**
   * Delete server route (admin)
   */
  async deleteRoute(id: number): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/server/route/drop', { id });
  },
};
