/**
 * Theme Store
 * Manages theme state
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { themeApi } from '@xboard/shared';
import type { Theme, ThemeConfig, UploadThemeData } from '@xboard/shared/src/types/theme';
import { ElMessage } from 'element-plus';

export const useThemeStore = defineStore('theme', () => {
  // State
  const themes = ref<Theme[]>([]);
  const loading = ref(false);
  const uploading = ref(false);
  const currentTheme = ref<Theme | null>(null);

  // Actions
  /**
   * Fetch all themes
   */
  async function fetchThemes(): Promise<void> {
    loading.value = true;
    try {
      themes.value = await themeApi.fetchAll();
    } catch (error: any) {
      // 如果API未实现（404），静默失败
      if (error.status === 404) {
        console.warn('Theme API not implemented yet');
        themes.value = [];
        ElMessage.warning('主题功能暂未启用');
        return;
      }
      ElMessage.error(error.message || 'Failed to fetch themes');
      throw error;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Upload new theme
   */
  async function uploadTheme(data: UploadThemeData): Promise<void> {
    uploading.value = true;
    try {
      const newTheme = await themeApi.upload(data);
      themes.value.push(newTheme);
      ElMessage.success('Theme uploaded successfully');
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to upload theme');
      throw error;
    } finally {
      uploading.value = false;
    }
  }

  /**
   * Delete theme
   */
  async function deleteTheme(id: number): Promise<void> {
    try {
      await themeApi.delete(id);
      themes.value = themes.value.filter((t) => t.id !== id);
      ElMessage.success('Theme deleted successfully');
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to delete theme');
      throw error;
    }
  }

  /**
   * Update theme configuration
   */
  async function updateConfig(id: number, config: ThemeConfig): Promise<void> {
    try {
      await themeApi.updateConfig(id, config);
      const theme = themes.value.find((t) => t.id === id);
      if (theme) {
        theme.config = config;
      }
      ElMessage.success('Theme configuration updated successfully');
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to update theme configuration');
      throw error;
    }
  }

  /**
   * Activate theme
   */
  async function activateTheme(id: number): Promise<void> {
    try {
      await themeApi.activate(id);
      // Update active status
      themes.value.forEach((t) => {
        t.is_active = t.id === id;
      });
      ElMessage.success('Theme activated successfully');
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to activate theme');
      throw error;
    }
  }

  return {
    // State
    themes,
    loading,
    uploading,
    currentTheme,

    // Actions
    fetchThemes,
    uploadTheme,
    deleteTheme,
    updateConfig,
    activateTheme,
  };
});
