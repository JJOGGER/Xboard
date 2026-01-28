/**
 * System Store
 * Manages system monitoring state
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { systemApi } from '@xboard/shared';
import type {
  SystemStatus,
  QueueStats,
  QueueWorkload,
  SystemLog,
  LogFilters,
  FailedJob,
  TrafficResetLog,
  TrafficResetStats,
  TrafficResetFilters,
  ManualResetData,
} from '@xboard/shared/types/system';
import type { PaginationParams } from '@xboard/shared/types/api';
import { ElMessage } from 'element-plus';

export const useSystemStore = defineStore('system', () => {
  // State
  const systemStatus = ref<SystemStatus | null>(null);
  const queueStats = ref<QueueStats | null>(null);
  const queueWorkload = ref<QueueWorkload[]>([]);
  const logs = ref<SystemLog[]>([]);
  const logsTotal = ref(0);
  const failedJobs = ref<FailedJob[]>([]);
  const failedJobsTotal = ref(0);
  const trafficResetLogs = ref<TrafficResetLog[]>([]);
  const trafficResetLogsTotal = ref(0);
  const trafficResetStats = ref<TrafficResetStats | null>(null);
  const loading = ref(false);

  // Actions
  /**
   * Fetch system status
   */
  async function fetchStatus(): Promise<void> {
    loading.value = true;
    try {
      systemStatus.value = await systemApi.fetchStatus();
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to fetch system status');
      throw error;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch queue statistics
   */
  async function fetchQueueStats(): Promise<void> {
    try {
      queueStats.value = await systemApi.fetchQueueStats();
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to fetch queue statistics');
      throw error;
    }
  }

  /**
   * Fetch queue workload
   */
  async function fetchQueueWorkload(): Promise<void> {
    try {
      queueWorkload.value = await systemApi.fetchQueueWorkload();
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to fetch queue workload');
      throw error;
    }
  }

  /**
   * Fetch system logs
   */
  async function fetchLogs(params: PaginationParams & LogFilters): Promise<void> {
    loading.value = true;
    try {
      const response = await systemApi.fetchLogs(params);
      logs.value = response.data;
      logsTotal.value = response.total;
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to fetch system logs');
      throw error;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Clear system logs
   */
  async function clearLogs(): Promise<void> {
    try {
      await systemApi.clearLogs();
      logs.value = [];
      logsTotal.value = 0;
      ElMessage.success('System logs cleared successfully');
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to clear system logs');
      throw error;
    }
  }

  /**
   * Fetch failed jobs
   */
  async function fetchFailedJobs(params: PaginationParams): Promise<void> {
    loading.value = true;
    try {
      const response = await systemApi.fetchFailedJobs(params);
      failedJobs.value = response.data;
      failedJobsTotal.value = response.total;
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to fetch failed jobs');
      throw error;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Retry failed job
   */
  async function retryFailedJob(id: number): Promise<void> {
    try {
      await systemApi.retryFailedJob(id);
      failedJobs.value = failedJobs.value.filter((job) => job.id !== id);
      failedJobsTotal.value--;
      ElMessage.success('Job retried successfully');
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to retry job');
      throw error;
    }
  }

  /**
   * Delete failed job
   */
  async function deleteFailedJob(id: number): Promise<void> {
    try {
      await systemApi.deleteFailedJob(id);
      failedJobs.value = failedJobs.value.filter((job) => job.id !== id);
      failedJobsTotal.value--;
      ElMessage.success('Job deleted successfully');
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to delete job');
      throw error;
    }
  }

  /**
   * Fetch traffic reset logs
   */
  async function fetchTrafficResetLogs(params: PaginationParams & TrafficResetFilters): Promise<void> {
    loading.value = true;
    try {
      const response = await systemApi.fetchTrafficResetLogs(params);
      trafficResetLogs.value = response.data;
      trafficResetLogsTotal.value = response.total;
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to fetch traffic reset logs');
      throw error;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch traffic reset statistics
   */
  async function fetchTrafficResetStats(): Promise<void> {
    try {
      trafficResetStats.value = await systemApi.fetchTrafficResetStats();
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to fetch traffic reset statistics');
      throw error;
    }
  }

  /**
   * Manual traffic reset
   */
  async function manualReset(data: ManualResetData): Promise<void> {
    try {
      await systemApi.manualReset(data);
      ElMessage.success('Traffic reset successfully');
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to reset traffic');
      throw error;
    }
  }

  return {
    // State
    systemStatus,
    queueStats,
    queueWorkload,
    logs,
    logsTotal,
    failedJobs,
    failedJobsTotal,
    trafficResetLogs,
    trafficResetLogsTotal,
    trafficResetStats,
    loading,

    // Actions
    fetchStatus,
    fetchQueueStats,
    fetchQueueWorkload,
    fetchLogs,
    clearLogs,
    fetchFailedJobs,
    retryFailedJob,
    deleteFailedJob,
    fetchTrafficResetLogs,
    fetchTrafficResetStats,
    manualReset,
  };
});
