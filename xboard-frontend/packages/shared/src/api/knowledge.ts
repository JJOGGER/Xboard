/**
 * Knowledge API Service
 * Handles all knowledge base-related API calls
 */

import type { ApiResponse } from '../types';
import type { Knowledge } from '../types/knowledge';
import apiClient from './client';

export const knowledgeApi = {
  // ========== User Methods ==========
  /**
   * Fetch knowledge articles (user)
   */
  async getUserArticles(): Promise<ApiResponse<Knowledge[]>> {
    return apiClient.get('/v1/user/knowledge/fetch');
  },

  /**
   * Get knowledge categories (user)
   */
  async getCategories(): Promise<ApiResponse<string[]>> {
    return apiClient.get('/v1/user/knowledge/getCategory');
  },

  // ========== Admin Methods ==========
  /**
   * Fetch all articles (admin)
   */
  async getArticles(): Promise<ApiResponse<Knowledge[]>> {
    return apiClient.get('/v2/knowledge/fetch');
  },

  /**
   * Get categories (admin)
   */
  async getAdminCategories(): Promise<ApiResponse<string[]>> {
    return apiClient.get('/v2/knowledge/getCategory');
  },

  /**
   * Create article (admin)
   */
  async createArticle(data: {
    category: string;
    title: string;
    body: string;
    sort?: number;
    show?: number;
  }): Promise<ApiResponse<Knowledge>> {
    return apiClient.post('/v2/knowledge/save', data);
  },

  /**
   * Update article (admin)
   */
  async updateArticle(id: number, data: Partial<Knowledge>): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/knowledge/update', { id, ...data });
  },

  /**
   * Delete article (admin)
   */
  async deleteArticle(id: number): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/knowledge/drop', { id });
  },

  /**
   * Toggle visibility (admin)
   */
  async toggleVisibility(id: number, show: number): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/knowledge/show', { id, show });
  },

  /**
   * Update sort order (admin)
   */
  async updateSort(items: Array<{ id: number; sort: number }>): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/knowledge/sort', items);
  },
};
