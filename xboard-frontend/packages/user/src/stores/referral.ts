/**
 * Referral Store
 * Manages referral and commission state for user frontend
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { referralApi } from '@xboard/shared';
import type {
  CommissionLog,
  InviteCode,
} from '@xboard/shared';

export const useReferralStore = defineStore('referral', () => {
  // State
  const stats = ref<any | null>(null);
  const inviteCodes = ref<InviteCode[]>([]);
  const commissionLogs = ref<CommissionLog[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Pagination
  const commissionPage = ref(1);
  const commissionTotal = ref(0);
  const commissionPageSize = ref(10);

  const referredUsersPage = ref(1);
  const referredUsersTotal = ref(0);
  const referredUsersPageSize = ref(10);

  // Getters
  const hasCommissions = computed(() => (stats.value?.confirmed_commission ?? 0) > 0);
  const hasReferrals = computed(() => (stats.value?.registered_user_count ?? 0) > 0);

  // Actions
  async function fetchOverview() {
    try {
      loading.value = true;
      error.value = null;
      const response = await referralApi.getInviteOverview();
      stats.value = response.data?.stat ?? null;
      inviteCodes.value = response.data?.codes ?? [];
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch referral statistics';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCommissionLogs(page = 1) {
    try {
      loading.value = true;
      error.value = null;
      commissionPage.value = page;
      const response = await referralApi.getCommissionLogs({
        page,
        page_size: commissionPageSize.value,
      });
      commissionLogs.value = response.data.data;
      commissionTotal.value = response.data.total;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch commission logs';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchInvitedUsers(page: number = 1) {
    try {
      loading.value = true;
      error.value = null;
      referredUsersPage.value = page;
      await referralApi.getInvitedUsers({
        page,
        page_size: referredUsersPageSize.value,
      });
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch referred users';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function generateInviteCode() {
    try {
      loading.value = true;
      error.value = null;
      const response = await referralApi.generateInviteCode();
      if (response.data) {
        inviteCodes.value = [response.data, ...inviteCodes.value];
      }
      return response.data;
    } catch (err: any) {
      error.value = err.message || 'Failed to generate invite code';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearError() {
    error.value = null;
  }

  return {
    // State
    stats,
    inviteCodes,
    commissionLogs,
    loading,
    error,
    commissionPage,
    commissionTotal,
    commissionPageSize,
    referredUsersPage,
    referredUsersTotal,
    referredUsersPageSize,

    // Getters
    hasCommissions,
    hasReferrals,

    // Actions
    fetchOverview,
    fetchCommissionLogs,
    fetchInvitedUsers,
    generateInviteCode,
    clearError,
  };
});
