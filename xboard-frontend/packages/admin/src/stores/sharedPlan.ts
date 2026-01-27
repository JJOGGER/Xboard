/**
 * Shared Plan Store
 * Manages state for third-party subscription imports and shared plans
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import sharedPlanService from '@xboard/shared/api/sharedPlan';
import type {
  SharedPlan,
  PlanSlot,
  SubscriptionSyncLog,
  ImportSubscriptionRequest,
  UpdateSharedPlanRequest,
  ParsePreviewResponse,
} from '@xboard/shared/api/sharedPlan';

export const useSharedPlanStore = defineStore('sharedPlan', () => {
  // State
  const plans = ref<SharedPlan[]>([]);
  const currentPlan = ref<SharedPlan | null>(null);
  const currentSlots = ref<PlanSlot[]>([]);
  const syncLogs = ref<SubscriptionSyncLog[]>([]);
  const previewData = ref<ParsePreviewResponse | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Computed
  const activePlans = computed(() => 
    plans.value.filter((p: SharedPlan) => p.sync_status === 'active')
  );

  const failedPlans = computed(() => 
    plans.value.filter((p: SharedPlan) => p.sync_status === 'failed')
  );

  const expiredPlans = computed(() => 
    plans.value.filter((p: SharedPlan) => p.sync_status === 'expired')
  );

  // Actions
  const fetchPlans = async (params?: {
    page?: number;
    per_page?: number;
    sync_status?: string;
  }) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await sharedPlanService.getAdminPlans(params);
      
      if (response.data) {
        plans.value = response.data.data || [];
        pagination.value = {
          current: response.data.current_page || 1,
          pageSize: response.data.per_page || 20,
          total: response.data.total || 0,
        };
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch shared plans';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchPlanDetails = async (id: number) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await sharedPlanService.getAdminPlanDetails(id);
      
      if (response.data) {
        currentPlan.value = response.data.plan;
        currentSlots.value = response.data.slots || [];
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch plan details';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const previewSubscription = async (subscriptionUrl: string) => {
    console.log('[Store] previewSubscription called');
    console.log('[Store] URL:', subscriptionUrl);
    
    loading.value = true;
    error.value = null;
    previewData.value = null; // Clear previous data

    try {
      console.log('[Store] Calling sharedPlanService.previewSubscription...');
      const response = await sharedPlanService.previewSubscription(subscriptionUrl);
      console.log('[Store] Full API response:', JSON.stringify(response, null, 2));
      console.log('[Store] response.data:', response.data);
      console.log('[Store] response.data type:', typeof response.data);
      
      // API client already unwraps response.data, so response is the backend's JSON directly
      // Backend returns: { status: "success", message: "...", data: {...} }
      if (response.data) {
        previewData.value = response.data;
        console.log('[Store] previewData set successfully');
        console.log('[Store] previewData.value:', JSON.stringify(previewData.value, null, 2));
        console.log('[Store] Nodes count:', previewData.value.nodes?.length);
        console.log('[Store] Format:', previewData.value.format);
      } else {
        console.warn('[Store] No data in response');
        console.warn('[Store] response object keys:', Object.keys(response));
        error.value = '服务器返回的数据格式不正确';
      }
      
      return response.data;
    } catch (err: any) {
      console.error('[Store] Error:', err);
      console.error('[Store] Error message:', err.message);
      
      error.value = err.message || 'Failed to preview subscription';
      throw err;
    } finally {
      loading.value = false;
      console.log('[Store] Preview completed');
      console.log('[Store] Final state - loading:', loading.value, 'error:', error.value, 'hasData:', !!previewData.value);
    }
  };

  const importSubscription = async (data: ImportSubscriptionRequest) => {
    loading.value = true;
    error.value = null;

    try {
      console.log('[Store] importSubscription called with data:', data);
      const response = await sharedPlanService.importSubscription(data);
      console.log('[Store] importSubscription response:', response);
      console.log('[Store] response.data:', response.data);
      console.log('[Store] response.status:', response.status);
      
      if (response.data) {
        // Add new plan to the list
        plans.value.unshift(response.data);
        console.log('[Store] Plan added to list successfully');
        return response.data;
      } else {
        console.error('[Store] No data in response, but status is:', response.status);
        // If status is success but no data, something is wrong
        if (response.status === 'success') {
          console.warn('[Store] Response status is success but data is missing');
        }
        throw new Error('No data returned from server');
      }
    } catch (err: any) {
      console.error('[Store] importSubscription error:', err);
      error.value = err.message || 'Failed to import subscription';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updatePlan = async (id: number, data: UpdateSharedPlanRequest) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await sharedPlanService.updatePlan(id, data);
      
      if (response.data) {
        // Update plan in the list
        const index = plans.value.findIndex((p: SharedPlan) => p.id === id);
        if (index !== -1) {
          plans.value[index] = response.data;
        }
        
        // Update current plan if it's the same
        if (currentPlan.value?.id === id) {
          currentPlan.value = response.data;
        }
      }
      
      return response.data;
    } catch (err: any) {
      error.value = err.message || 'Failed to update plan';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const syncSubscription = async (id: number) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await sharedPlanService.syncSubscription(id);
      
      // Refresh plan details after sync
      await fetchPlanDetails(id);
      
      return response.data;
    } catch (err: any) {
      error.value = err.message || 'Failed to sync subscription';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchSyncLogs = async (id: number, params?: {
    page?: number;
    per_page?: number;
  }) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await sharedPlanService.getSyncLogs(id, params);
      
      if (response.data) {
        syncLogs.value = response.data.data || [];
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch sync logs';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deletePlan = async (id: number) => {
    loading.value = true;
    error.value = null;

    try {
      await sharedPlanService.deletePlan(id);
      
      // Refresh the plans list after deletion
      await fetchPlans({
        page: pagination.value.current,
        per_page: pagination.value.pageSize,
      });
      
      // Clear current plan if it's the same
      if (currentPlan.value?.id === id) {
        currentPlan.value = null;
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to delete plan';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearPreview = () => {
    previewData.value = null;
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    // State
    plans,
    currentPlan,
    currentSlots,
    syncLogs,
    previewData,
    loading,
    error,
    pagination,
    
    // Computed
    activePlans,
    failedPlans,
    expiredPlans,
    
    // Actions
    fetchPlans,
    fetchPlanDetails,
    previewSubscription,
    importSubscription,
    updatePlan,
    syncSubscription,
    fetchSyncLogs,
    deletePlan,
    clearPreview,
    clearError,
  };
});
