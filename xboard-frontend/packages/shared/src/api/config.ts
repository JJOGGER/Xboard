/**
 * Configuration API Service
 */

import apiClient from './client';
import type { SystemConfig, TestEmailData, TestEmailResponse } from '../types/config';

export const configApi = {
  /**
   * Fetch all system configuration
   */
  async fetch(): Promise<SystemConfig> {
    const response = await apiClient.get<SystemConfig>('/v2/config/fetch');
    return response.data;
  },

  /**
   * Save system configuration
   */
  async save(data: Partial<SystemConfig>): Promise<void> {
    await apiClient.post('/v2/config/save', data);
  },

  /**
   * Test email configuration
   */
  async testEmail(data: TestEmailData): Promise<TestEmailResponse> {
    const response = await apiClient.post<TestEmailResponse>('/v2/config/testSendMail', data);
    return response.data;
  },
};
