/**
 * Plan Store
 * Manages subscription plan state and operations
 * Implements CRUD operations and sorting functionality
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Plan } from '@xboard/shared/types';
import { apiClient } from '@xboard/shared/api';

interface PlanFormData {
  name: string;
  content: string;
  month_price: number;
  quarter_price: number;
  half_year_price: number;
  year_price: number;
  two_year_price: number;
  three_year_price: number;
  onetime_price: number;
  reset_price: number;
  transfer_enable: number;
  speed_limit: number | null;
  device_limit: number | null;
  group_id: number[];
  show: number;
}

export const usePlanStore = defineStore('plan', () => {
  // State
  const plans = ref<Plan[]>([]);
  const currentPlan = ref<Plan | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const visiblePlans = computed(() => 
    plans.value.filter(plan => plan.show === 1)
  );

  const hiddenPlans = computed(() => 
    plans.value.filter(plan => plan.show === 0)
  );

  const sortedPlans = computed(() => 
    [...plans.value].sort((a, b) => a.sort - b.sort)
  );

  // Actions
  
  /**
   * Fetch all plans from the API
   * Requirements: 4.1
   */
  async function fetchPlans(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get<{ data: Plan[] }>('/v2/plan/fetch');
      plans.value = response.data.data || [];
    } catch (err) {
      error.value = 'Failed to fetch plans';
      console.error('Failed to fetch plans:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch a single plan by ID
   * Requirements: 4.1
   */
  async function fetchPlanById(id: number): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get<{ data: Plan }>(`/v2/plan/${id}`);
      currentPlan.value = response.data.data;
    } catch (err) {
      error.value = 'Failed to fetch plan';
      console.error('Failed to fetch plan:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create a new plan
   * Requirements: 4.2
   */
  async function createPlan(data: PlanFormData): Promise<Plan> {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<{ data: Plan }>('/v2/plan/save', data);
      const newPlan = response.data.data;
      plans.value.push(newPlan);
      return newPlan;
    } catch (err) {
      error.value = 'Failed to create plan';
      console.error('Failed to create plan:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update an existing plan
   * Requirements: 4.3
   */
  async function updatePlan(id: number, data: Partial<PlanFormData>): Promise<Plan> {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<{ data: Plan }>(`/v2/plan/update`, { id, ...data });
      const updatedPlan = response.data.data;
      
      // Update plan in local state
      const index = plans.value.findIndex(p => p.id === id);
      if (index !== -1) {
        plans.value[index] = updatedPlan;
      }
      
      if (currentPlan.value?.id === id) {
        currentPlan.value = updatedPlan;
      }
      
      return updatedPlan;
    } catch (err) {
      error.value = 'Failed to update plan';
      console.error('Failed to update plan:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Delete a plan
   * Requirements: 4.4
   */
  async function deletePlan(id: number): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.post(`/v2/plan/drop`, { id });
      
      // Remove plan from local state
      plans.value = plans.value.filter(p => p.id !== id);
      
      if (currentPlan.value?.id === id) {
        currentPlan.value = null;
      }
    } catch (err) {
      error.value = 'Failed to delete plan';
      console.error('Failed to delete plan:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Toggle plan visibility
   * Requirements: 4.5
   */
  async function toggleVisibility(id: number): Promise<void> {
    const plan = plans.value.find(p => p.id === id);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const newShowValue = plan.show === 1 ? 0 : 1;
    await updatePlan(id, { show: newShowValue });
  }

  /**
   * Update plan sort order
   * Requirements: 4.5
   */
  async function updateSort(planIds: number[]): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      // Update sort order on backend
      await apiClient.post('/v2/plan/sort', { plan_ids: planIds });
      
      // Update local state
      planIds.forEach((id, index) => {
        const plan = plans.value.find(p => p.id === id);
        if (plan) {
          plan.sort = index;
        }
      });
      
      // Re-sort plans array
      plans.value.sort((a, b) => a.sort - b.sort);
    } catch (err) {
      error.value = 'Failed to update sort order';
      console.error('Failed to update sort order:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Copy an existing plan
   * Creates a duplicate with "(Copy)" appended to the name
   */
  async function copyPlan(id: number): Promise<Plan> {
    const plan = plans.value.find(p => p.id === id);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const copyData: PlanFormData = {
      name: `${plan.name} (Copy)`,
      content: plan.content,
      month_price: plan.month_price,
      quarter_price: plan.quarter_price,
      half_year_price: plan.half_year_price,
      year_price: plan.year_price,
      two_year_price: plan.two_year_price,
      three_year_price: plan.three_year_price,
      onetime_price: plan.onetime_price,
      reset_price: plan.reset_price,
      transfer_enable: plan.transfer_enable,
      speed_limit: plan.speed_limit,
      device_limit: plan.device_limit,
      group_id: [...plan.group_id],
      show: 0, // Hidden by default
    };

    return await createPlan(copyData);
  }

  /**
   * Clear current plan
   */
  function clearCurrentPlan(): void {
    currentPlan.value = null;
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
    currentPlan,
    loading,
    error,
    
    // Getters
    visiblePlans,
    hiddenPlans,
    sortedPlans,
    
    // Actions
    fetchPlans,
    fetchPlanById,
    createPlan,
    updatePlan,
    deletePlan,
    toggleVisibility,
    updateSort,
    copyPlan,
    clearCurrentPlan,
    clearError,
  };
});

