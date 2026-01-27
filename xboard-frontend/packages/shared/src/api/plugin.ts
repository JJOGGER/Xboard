/**
 * Plugin API Service
 */

import apiClient from './client';
import type { Plugin, UploadPluginData, UpdatePluginData } from '../types/plugin';

export const pluginApi = {
  /**
   * Fetch all plugins
   */
  async fetchAll(): Promise<Plugin[]> {
    const response = await apiClient.get<Plugin[]>('/v2/plugin/fetch');
    return response.data;
  },

  /**
   * Upload new plugin
   */
  async upload(data: UploadPluginData): Promise<Plugin> {
    const formData = new FormData();
    formData.append('file', data.file);
    
    const response = await apiClient.post<Plugin>('/v2/plugin/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Install plugin
   */
  async install(id: number): Promise<void> {
    await apiClient.post(`/admin/plugin/${id}/install`);
  },

  /**
   * Update plugin
   */
  async update(id: number, data: UpdatePluginData): Promise<void> {
    await apiClient.put(`/admin/plugin/${id}`, data);
  },

  /**
   * Uninstall plugin
   */
  async uninstall(id: number): Promise<void> {
    await apiClient.delete(`/admin/plugin/${id}`);
  },

  /**
   * Upgrade plugin
   */
  async upgrade(id: number): Promise<void> {
    await apiClient.post(`/admin/plugin/${id}/upgrade`);
  },
};
