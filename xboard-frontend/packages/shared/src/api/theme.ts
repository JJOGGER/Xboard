/**
 * Theme API Service
 */

import apiClient from './client';
import type { Theme, ThemeConfig, UploadThemeData } from '../types/theme';

export const themeApi = {
  /**
   * Fetch all themes
   */
  async fetchAll(): Promise<Theme[]> {
    const response = await apiClient.get<Theme[]>('/v2/theme/fetch');
    return response.data;
  },

  /**
   * Upload new theme
   */
  async upload(data: UploadThemeData): Promise<Theme> {
    const formData = new FormData();
    formData.append('file', data.file);
    
    const response = await apiClient.post<Theme>('/v2/theme/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Delete theme
   */
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/v2/theme/${id}`);
  },

  /**
   * Update theme configuration
   */
  async updateConfig(id: number, config: ThemeConfig): Promise<void> {
    await apiClient.put(`/v2/theme/${id}/config`, { config });
  },

  /**
   * Activate theme
   */
  async activate(id: number): Promise<void> {
    await apiClient.post(`/v2/theme/${id}/activate`);
  },
};
