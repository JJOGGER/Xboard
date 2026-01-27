/**
 * Payment API Service
 */

import apiClient from './client';
import type { PaymentMethod } from '../types/payment';

export const paymentApi = {
  /**
   * Fetch all payment methods
   */
  async fetchAll(): Promise<PaymentMethod[]> {
    const response = await apiClient.get<PaymentMethod[]>('/v2/payment/fetch');
    return response.data;
  },

  /**
   * Create payment method
   */
  async create(data: Partial<PaymentMethod>): Promise<PaymentMethod> {
    const response = await apiClient.post<PaymentMethod>('/v2/payment/save', data);
    return response.data;
  },

  /**
   * Update payment method
   */
  async update(id: number, data: Partial<PaymentMethod>): Promise<void> {
    await apiClient.post(`/payment/update`, { id, ...data });
  },

  /**
   * Delete payment method
   */
  async delete(id: number): Promise<void> {
    await apiClient.post('/v2/payment/drop', { id });
  },

  /**
   * Update payment method sort order
   */
  async updateSort(sortData: { id: number; sort: number }[]): Promise<void> {
    await apiClient.post('/v2/payment/sort', { sort_data: sortData });
  },

  /**
   * Toggle payment method visibility
   */
  async toggleShow(id: number, show: number): Promise<void> {
    await apiClient.post('/v2/payment/show', { id, show });
  },
};
