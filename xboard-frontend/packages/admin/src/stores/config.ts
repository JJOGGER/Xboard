/**
 * Configuration Store
 * Manages system configuration state
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { configApi } from '@xboard/shared';
import type { SystemConfig, TestEmailData, TestEmailResponse } from '@xboard/shared/types/config';
import { ElMessage } from 'element-plus';

export const useConfigStore = defineStore('config', () => {
  // State
  const config = ref<SystemConfig>({});
  const loading = ref(false);
  const saving = ref(false);
  const testingEmail = ref(false);

  // Actions
  /**
   * Fetch system configuration
   */
  async function fetchConfig(): Promise<void> {
    loading.value = true;
    try {
      config.value = await configApi.fetch();
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to fetch configuration');
      throw error;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Save system configuration
   */
  async function saveConfig(data: Partial<SystemConfig>): Promise<void> {
    saving.value = true;
    try {
      await configApi.save(data);
      // Update local config
      config.value = { ...config.value, ...data };
      ElMessage.success('Configuration saved successfully');
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to save configuration');
      throw error;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Test email configuration
   */
  async function testEmail(data: TestEmailData): Promise<TestEmailResponse> {
    testingEmail.value = true;
    try {
      const response = await configApi.testEmail(data);
      if (response.success) {
        ElMessage.success(response.message || 'Test email sent successfully');
      } else {
        ElMessage.error(response.message || 'Failed to send test email');
      }
      return response;
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to test email');
      throw error;
    } finally {
      testingEmail.value = false;
    }
  }

  return {
    // State
    config,
    loading,
    saving,
    testingEmail,

    // Actions
    fetchConfig,
    saveConfig,
    testEmail,
  };
});
