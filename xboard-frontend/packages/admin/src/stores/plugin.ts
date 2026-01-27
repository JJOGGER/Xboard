/**
 * Plugin Store
 * Manages plugin state
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { pluginApi } from '@xboard/shared';
import type { Plugin, UploadPluginData, UpdatePluginData } from '@xboard/shared/src/types/plugin';
import { ElMessage } from 'element-plus';

export const usePluginStore = defineStore('plugin', () => {
  // State
  const plugins = ref<Plugin[]>([]);
  const loading = ref(false);
  const uploading = ref(false);
  const currentPlugin = ref<Plugin | null>(null);

  // Actions
  /**
   * Fetch all plugins
   */
  async function fetchPlugins(): Promise<void> {
    loading.value = true;
    try {
      plugins.value = await pluginApi.fetchAll();
    } catch (error: any) {
      // 如果API未实现（404），静默失败
      if (error.status === 404) {
        console.warn('Plugin API not implemented yet');
        plugins.value = [];
        ElMessage.warning('插件功能暂未启用');
        return;
      }
      ElMessage.error(error.message || 'Failed to fetch plugins');
      throw error;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Upload new plugin
   */
  async function uploadPlugin(data: UploadPluginData): Promise<void> {
    uploading.value = true;
    try {
      const newPlugin = await pluginApi.upload(data);
      plugins.value.push(newPlugin);
      ElMessage.success('Plugin uploaded successfully');
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to upload plugin');
      throw error;
    } finally {
      uploading.value = false;
    }
  }

  /**
   * Install plugin
   */
  async function installPlugin(id: number): Promise<void> {
    try {
      await pluginApi.install(id);
      const plugin = plugins.value.find((p) => p.id === id);
      if (plugin) {
        plugin.enabled = true;
      }
      ElMessage.success('Plugin installed successfully');
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to install plugin');
      throw error;
    }
  }

  /**
   * Update plugin
   */
  async function updatePlugin(id: number, data: UpdatePluginData): Promise<void> {
    try {
      await pluginApi.update(id, data);
      const index = plugins.value.findIndex((p) => p.id === id);
      if (index !== -1) {
        plugins.value[index] = { ...plugins.value[index], ...data };
      }
      ElMessage.success('Plugin updated successfully');
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to update plugin');
      throw error;
    }
  }

  /**
   * Uninstall plugin
   */
  async function uninstallPlugin(id: number): Promise<void> {
    try {
      await pluginApi.uninstall(id);
      plugins.value = plugins.value.filter((p) => p.id !== id);
      ElMessage.success('Plugin uninstalled successfully');
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to uninstall plugin');
      throw error;
    }
  }

  /**
   * Upgrade plugin
   */
  async function upgradePlugin(id: number): Promise<void> {
    try {
      await pluginApi.upgrade(id);
      ElMessage.success('Plugin upgraded successfully');
      // Refresh plugins list
      await fetchPlugins();
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to upgrade plugin');
      throw error;
    }
  }

  return {
    // State
    plugins,
    loading,
    uploading,
    currentPlugin,

    // Actions
    fetchPlugins,
    uploadPlugin,
    installPlugin,
    updatePlugin,
    uninstallPlugin,
    upgradePlugin,
  };
});
