/**
 * User Shared Plan Store
 * Manages state for user-facing shared plan browsing and purchasing
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import sharedPlanService from '@xboard/shared/api/sharedPlan';
import type { SharedPlan, PlanSlot } from '@xboard/shared/api/sharedPlan';

export const useSharedPlanStore = defineStore('userSharedPlan', () => {
  // State
  const availablePlans = ref<SharedPlan[]>([]);
  const userSubscriptions = ref<{
    plan: SharedPlan;
    slot: PlanSlot;
    subscription_url: string;
  }[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const hasAvailablePlans = computed(() => availablePlans.value.length > 0);
  const hasSubscriptions = computed(() => userSubscriptions.value.length > 0);

  // Actions
  const fetchAvailablePlans = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await sharedPlanService.getUserPlans();
      
      if (response.data?.data) {
        availablePlans.value = response.data.data;
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch available plans';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchUserSubscriptions = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await sharedPlanService.getUserSubscriptions();
      
      if (response.data?.data) {
        userSubscriptions.value = response.data.data;
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch user subscriptions';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    // State
    availablePlans,
    userSubscriptions,
    loading,
    error,
    
    // Computed
    hasAvailablePlans,
    hasSubscriptions,
    
    // Actions
    fetchAvailablePlans,
    fetchUserSubscriptions,
    clearError,
  };
});
