/**
 * Payment Store
 * Manages payment methods state
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { paymentApi } from '@xboard/shared';
import type { PaymentMethod } from '@xboard/shared/types/payment';
import { ElMessage } from 'element-plus';

export const usePaymentStore = defineStore('payment', () => {
  // State
  const payments = ref<PaymentMethod[]>([]);
  const loading = ref(false);
  const currentPayment = ref<PaymentMethod | null>(null);

  // Actions
  /**
   * Fetch all payment methods
   */
  async function fetchPayments(): Promise<void> {
    loading.value = true;
    try {
      payments.value = await paymentApi.fetchAll();
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to fetch payment methods');
      throw error;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create payment method
   */
  async function createPayment(data: Partial<PaymentMethod>): Promise<void> {
    try {
      const newPayment = await paymentApi.create(data);
      payments.value.push(newPayment);
      ElMessage.success('Payment method created successfully');
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to create payment method');
      throw error;
    }
  }

  /**
   * Update payment method
   */
  async function updatePayment(id: number, data: Partial<PaymentMethod>): Promise<void> {
    try {
      await paymentApi.update(id, data);
      const index = payments.value.findIndex((p) => p.id === id);
      if (index !== -1) {
        payments.value[index] = { ...payments.value[index], ...data };
      }
      ElMessage.success('Payment method updated successfully');
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to update payment method');
      throw error;
    }
  }

  /**
   * Delete payment method
   */
  async function deletePayment(id: number): Promise<void> {
    try {
      await paymentApi.delete(id);
      payments.value = payments.value.filter((p) => p.id !== id);
      ElMessage.success('Payment method deleted successfully');
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to delete payment method');
      throw error;
    }
  }

  /**
   * Update payment methods sort order
   */
  async function updateSort(sortData: { id: number; sort: number }[]): Promise<void> {
    try {
      await paymentApi.updateSort(sortData);
      // Update local state
      sortData.forEach(({ id, sort }) => {
        const payment = payments.value.find((p) => p.id === id);
        if (payment) {
          payment.sort = sort;
        }
      });
      // Re-sort the array
      payments.value.sort((a, b) => a.sort - b.sort);
      ElMessage.success('Sort order updated successfully');
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to update sort order');
      throw error;
    }
  }

  /**
   * Toggle payment method visibility
   */
  async function toggleShow(id: number): Promise<void> {
    try {
      await paymentApi.toggleShow(id);
      const payment = payments.value.find((p) => p.id === id);
      if (payment) {
        payment.show = payment.show === 1 ? 0 : 1;
      }
      ElMessage.success('Visibility updated successfully');
    } catch (error: any) {
      ElMessage.error(error.message || 'Failed to update visibility');
      throw error;
    }
  }

  return {
    // State
    payments,
    loading,
    currentPayment,

    // Actions
    fetchPayments,
    createPayment,
    updatePayment,
    deletePayment,
    updateSort,
    toggleShow,
  };
});
