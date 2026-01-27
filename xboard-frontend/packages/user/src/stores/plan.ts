/**
 * Plan Store (User Frontend)
 * Manages subscription plan state for end users
 * Requirements: 20.1
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Plan } from '@xboard/shared/types';
import { planApi } from '@xboard/shared/api';

export const usePlanStore = defineStore('plan', () => {
  // State
  const plans = ref<Plan[]>([]);
  const selectedPlan = ref<Plan | null>(null);
  const selectedPeriod = ref<string>('month');
  const couponCode = ref<string>('');
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const visiblePlans = computed(() => 
    plans.value.filter(plan => plan.show === 1).sort((a, b) => a.sort - b.sort)
  );

  const selectedPlanPrice = computed(() => {
    if (!selectedPlan.value) return 0;
    
    const periodMap: Record<string, keyof Plan> = {
      month: 'month_price',
      quarter: 'quarter_price',
      half_year: 'half_year_price',
      year: 'year_price',
      two_year: 'two_year_price',
      three_year: 'three_year_price',
      onetime: 'onetime_price',
      reset: 'reset_price',
    };
    
    const priceKey = periodMap[selectedPeriod.value];
    return priceKey ? (selectedPlan.value[priceKey] as number) : 0;
  });

  // Actions
  
  /**
   * Fetch all visible plans
   * Requirements: 20.1
   */
  async function fetchPlans(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const response = await planApi.getPlans();
      plans.value = response.data.data;
    } catch (err) {
      error.value = 'Failed to fetch plans';
      console.error('Failed to fetch plans:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Select a plan for purchase
   * Requirements: 20.3
   */
  function selectPlan(plan: Plan, period: string = 'month'): void {
    selectedPlan.value = plan;
    selectedPeriod.value = period;
  }

  /**
   * Clear selected plan
   */
  function clearSelection(): void {
    selectedPlan.value = null;
    selectedPeriod.value = 'month';
    couponCode.value = '';
  }

  /**
   * Set coupon code
   * Requirements: 20.4
   */
  function setCouponCode(code: string): void {
    couponCode.value = code;
  }

  /**
   * Clear coupon code
   */
  function clearCouponCode(): void {
    couponCode.value = '';
  }

  /**
   * Clear error state
   */
  function clearError(): void {
    error.value = null;
  }

  return {
    // State
    plans,
    selectedPlan,
    selectedPeriod,
    couponCode,
    loading,
    error,
    
    // Getters
    visiblePlans,
    selectedPlanPrice,
    
    // Actions
    fetchPlans,
    selectPlan,
    clearSelection,
    setCouponCode,
    clearCouponCode,
    clearError,
  };
});
