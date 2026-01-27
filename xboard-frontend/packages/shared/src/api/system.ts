/**
 * System Monitoring API Service
 */

import apiClient from './client';
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
} from '../types/system';
import type { PaginatedResponse, PaginationParams } from '../types/api';

export const systemApi = {
  /**
   * Fetch system status
   */
  async fetchStatus(): Promise<SystemStatus> {
    const response = await apiClient.get<SystemStatus>('/v2/system/getSystemStatus');
    return response.data;
  },

  /**
   * Fetch queue statistics
   */
  async fetchQueueStats(): Promise<QueueStats> {
    const response = await apiClient.get<QueueStats>('/v2/system/getQueueStats');
    return response.data;
  },

  /**
   * Fetch queue workload
   */
  async fetchQueueWorkload(): Promise<QueueWorkload[]> {
    const response = await apiClient.get<QueueWorkload[]>('/v2/system/getQueueWorkload');
    return response.data;
  },

  /**
   * Fetch system logs
   */
  async fetchLogs(params: PaginationParams & LogFilters): Promise<PaginatedResponse<SystemLog>> {
    const response = await apiClient.get<PaginatedResponse<SystemLog>>('/v2/system/getSystemLog', {
      params,
    });
    return response.data;
  },

  /**
   * Clear system logs
   */
  async clearLogs(): Promise<void> {
    await apiClient.post('/v2/system/clearSystemLog');
  },

  /**
   * Fetch failed jobs
   */
  async fetchFailedJobs(params: PaginationParams): Promise<PaginatedResponse<FailedJob>> {
    const response = await apiClient.get<PaginatedResponse<FailedJob>>('/v2/system/getHorizonFailedJobs', {
      params,
    });
    return response.data;
  },

  /**
   * Retry failed job
   */
  async retryFailedJob(id: number): Promise<void> {
    await apiClient.post(`/system/retryFailedJob`, { id });
  },

  /**
   * Delete failed job
   */
  async deleteFailedJob(id: number): Promise<void> {
    await apiClient.post('/v2/system/deleteFailedJob', { id });
  },

  /**
   * Fetch traffic reset logs
   */
  async fetchTrafficResetLogs(
    params: PaginationParams & TrafficResetFilters
  ): Promise<PaginatedResponse<TrafficResetLog>> {
    const response = await apiClient.get<PaginatedResponse<TrafficResetLog>>(
      '/v2/traffic-reset/logs',
      { params }
    );
    return response.data;
  },

  /**
   * Fetch traffic reset statistics
   */
  async fetchTrafficResetStats(): Promise<TrafficResetStats> {
    const response = await apiClient.get<TrafficResetStats>('/v2/traffic-reset/stats');
    return response.data;
  },

  /**
   * Manual traffic reset
   */
  async manualReset(data: ManualResetData): Promise<void> {
    await apiClient.post('/v2/traffic-reset/reset-user', data);
  },
};
