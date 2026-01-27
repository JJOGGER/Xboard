/**
 * Gift Card Store (User Frontend)
 * Manages gift card redemption state for end users
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { giftCardApi } from '@xboard/shared';
import type { GiftCardCode } from '@xboard/shared';

export interface GiftCardRedemption {
  id: number;
  code: string;
  type: number; // 1: balance, 2: traffic
  amount: number;
  redeemed_at: string;
}

export const useGiftCardStore = defineStore('giftCard', () => {
  // State
  const redemptionHistory = ref<GiftCardRedemption[]>([]);
  const currentCode = ref<GiftCardCode | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Pagination
  const page = ref(1);
  const total = ref(0);
  const pageSize = ref(10);

  // Actions
  async function validateCode(code: string) {
    try {
      loading.value = true;
      error.value = null;
      // Note: This endpoint might need to be adjusted based on actual API
      // For now, we'll use the getCodes endpoint with a filter
      const response = await giftCardApi.getCodes({
        page: 1,
        page_size: 1,
      });
      
      // In a real implementation, there would be a specific validate endpoint
      // This is a placeholder that should be replaced with actual API call
      currentCode.value = response.data.data[0] || null;
      return currentCode.value;
    } catch (err: any) {
      error.value = err.message || 'Failed to validate gift card code';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function redeemCode(code: string) {
    try {
      loading.value = true;
      error.value = null;
      
      // Note: This endpoint needs to be implemented in the API
      // For now, this is a placeholder
      // const response = await giftCardApi.redeemCode(code);
      
      // Refresh redemption history after successful redemption
      await fetchRedemptionHistory();
      
      return true;
    } catch (err: any) {
      error.value = err.message || 'Failed to redeem gift card';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchRedemptionHistory(pageNum = 1) {
    try {
      loading.value = true;
      error.value = null;
      page.value = pageNum;

      // Note: This endpoint needs to be implemented in the API
      // For now, we'll use the getCodes endpoint as a placeholder
      const response = await giftCardApi.getCodes({
        page: pageNum,
        page_size: pageSize.value,
        status: 1, // Only redeemed codes
      });

      // Transform the data to match our redemption history format
      redemptionHistory.value = response.data.data.map((code) => ({
        id: code.id,
        code: code.code,
        type: code.template?.type || 1,
        amount: code.template?.amount || 0,
        redeemed_at: code.used_at || code.updated_at,
      }));

      total.value = response.data.total;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch redemption history';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearCurrentCode() {
    currentCode.value = null;
  }

  function clearError() {
    error.value = null;
  }

  return {
    // State
    redemptionHistory,
    currentCode,
    loading,
    error,
    page,
    total,
    pageSize,

    // Actions
    validateCode,
    redeemCode,
    fetchRedemptionHistory,
    clearCurrentCode,
    clearError,
  };
});
