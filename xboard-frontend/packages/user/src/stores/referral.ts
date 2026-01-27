/**
 * Referral Store
 * Manages referral and commission state for user frontend
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { referralApi } from '@xboard/shared';
import type {
  ReferralStats,
  CommissionLog,
  ReferredUser,
  InviteCode,
} from '@xboard/shared';

export const useReferralStore = defineStore('referral', () => {
  // State
  const stats = ref<ReferralStats | null>(null);
  const commissionLogs = ref<CommissionLog[]>([]);
  const referredUsers = ref<ReferredUser[]>([]);
  const inviteCodes = ref<InviteCode[]>([]);
  const referralLink = ref<string>('');
  const referralCode = ref<string>('');
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
  const hasCommissions = computed(() => (stats.value?.commission_balance ?? 0) > 0);
  const hasReferrals = computed(() => (stats.value?.invite_count ?? 0) > 0);

  // Actions
  async function fetchStats() {
    try {
      loading.value = true;
      error.value = null;
      const response = await referralApi.getStats();
      stats.value = response.data;
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

  async function fetchReferredUsers(page = 1) {
    try {
      loading.value = true;
      error.value = null;
      referredUsersPage.value = page;
      const response = await referralApi.getReferredUsers({
        page,
        page_size: referredUsersPageSize.value,
      });
      referredUsers.value = response.data.data;
      referredUsersTotal.value = response.data.total;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch referred users';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchInviteCodes() {
    try {
      loading.value = true;
      error.value = null;
      const response = await referralApi.getInviteCodes();
      inviteCodes.value = response.data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch invite codes';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchReferralLink() {
    try {
      loading.value = true;
      error.value = null;
      const response = await referralApi.getReferralLink();
      referralLink.value = response.data.link;
      referralCode.value = response.data.code;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch referral link';
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
      inviteCodes.value.unshift(response.data);
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
    commissionLogs,
    referredUsers,
    inviteCodes,
    referralLink,
    referralCode,
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
    fetchStats,
    fetchCommissionLogs,
    fetchReferredUsers,
    fetchInviteCodes,
    fetchReferralLink,
    generateInviteCode,
    clearError,
  };
});
