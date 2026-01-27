/**
 * User Store
 * Manages user data, CRUD operations, filtering, and pagination
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, UserFilters, GenerateUserData } from '@xboard/shared/types';
import { apiClient } from '@xboard/shared/api';

interface FetchUsersParams {
  page?: number;
  page_size?: number;
  search?: string;
  plan_id?: number;
  banned?: number;
  date_start?: string;
  date_end?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

interface PaginatedUsersResponse {
  data: User[];
  total: number;
  current_page: number;
  per_page: number;
  last_page: number;
}

export const useUserStore = defineStore('user', () => {
  // State
  const users = ref<User[]>([]);
  const currentUser = ref<User | null>(null);
  const total = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(20);
  const loading = ref(false);
  const filters = ref<UserFilters>({});
  const sortBy = ref('id');
  const sortOrder = ref<'asc' | 'desc'>('desc');

  // Getters
  const hasUsers = computed(() => users.value.length > 0);
  const totalPages = computed(() => Math.ceil(total.value / pageSize.value));
  const isLoading = computed(() => loading.value);

  function extractUserFromResponse(payload: any): User | null {
    if (!payload) return null;
    // Common shapes:
    // 1) { data: user }
    // 2) { status: 'success', data: user, message: '...', error: null }
    // 3) { data: { data: user } }
    const candidate = payload?.data?.data ?? payload?.data ?? payload;
    if (candidate && typeof candidate === 'object' && 'id' in candidate) {
      return candidate as User;
    }
    return null;
  }

  function normalizeUserFromDetail(user: User): User {
    const rawBalance = (user as any).balance;
    const rawCommissionBalance = (user as any).commission_balance;

    const balanceCents =
      typeof rawBalance === 'number'
        ? rawBalance
        : typeof rawBalance === 'string'
          ? Number(rawBalance)
          : 0;

    const commissionCents =
      typeof rawCommissionBalance === 'number'
        ? rawCommissionBalance
        : typeof rawCommissionBalance === 'string'
          ? Number(rawCommissionBalance)
          : 0;

    const safeBalanceCents = Number.isFinite(balanceCents) ? balanceCents : 0;
    const safeCommissionCents = Number.isFinite(commissionCents) ? commissionCents : 0;
    return {
      ...user,
      balance: safeBalanceCents / 100,
      commission_balance: safeCommissionCents / 100,
    };
  }

  function syncUserInList(user: User): void {
    const index = users.value.findIndex((u) => u.id === user.id);
    if (index !== -1) {
      users.value[index] = user;
    }
  }

  // Actions
  async function fetchUsers(params?: FetchUsersParams): Promise<void> {
    loading.value = true;
    try {
      const response = await apiClient.get<PaginatedUsersResponse>('/v2/user/fetch', {
        params: {
          page: params?.page || currentPage.value,
          page_size: params?.page_size || pageSize.value,
          search: params?.search || filters.value.search,
          plan_id: params?.plan_id || filters.value.plan_id,
          banned: params?.banned !== undefined ? params.banned : filters.value.banned,
          date_start: params?.date_start || filters.value.date_start,
          date_end: params?.date_end || filters.value.date_end,
          sort_by: params?.sort_by || sortBy.value,
          sort_order: params?.sort_order || sortOrder.value,
        },
      });

      console.log('[UserStore] fetchUsers response:', response);
      console.log('[UserStore] response.data:', response.data);
      console.log('[UserStore] response.data type:', typeof response.data);
      console.log('[UserStore] response.data keys:', Object.keys(response.data || {}));
      
      // apiClient.get returns ApiResponse<T>, so response.data is PaginatedUsersResponse
      if (response.data) {
        // Check if response.data is the pagination object or if it's wrapped
        const paginationData = response.data;
        
        // Handle both possible structures
        if (Array.isArray(paginationData.data)) {
          users.value = paginationData.data;
          total.value = paginationData.total || 0;
          currentPage.value = paginationData.current_page || 1;
          pageSize.value = paginationData.per_page || 20;
        } else if (Array.isArray(paginationData)) {
          // If response.data is directly an array
          users.value = paginationData;
          total.value = paginationData.length;
        } else {
          // Try to extract from object keys (in case it's {0: user, 1: user, ...})
          const values = Object.values(paginationData);
          if (values.length > 0 && values[0] && typeof values[0] === 'object') {
            users.value = values as User[];
            total.value = values.length;
          } else {
            console.warn('[UserStore] Unexpected data structure:', paginationData);
            users.value = [];
            total.value = 0;
          }
        }
        
        console.log('[UserStore] Users loaded:', users.value.length);
        console.log('[UserStore] First user:', users.value[0]);
      } else {
        console.warn('[UserStore] No data in response');
        users.value = [];
        total.value = 0;
      }
    } catch (error) {
      console.error('[UserStore] Failed to fetch users:', error);
      users.value = [];
      total.value = 0;
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUserById(id: number): Promise<void> {
    loading.value = true;
    try {
      const response = await apiClient.get(`/v2/user/getUserInfoById?id=${id}`);
      const user = extractUserFromResponse((response as any).data);
      if (!user) {
        throw new Error('Unexpected user detail response shape');
      }
      currentUser.value = normalizeUserFromDetail(user);
      syncUserInList(currentUser.value);
    } catch (error) {
      console.error(`Failed to fetch user ${id}:`, error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function updateUser(id: number, data: Partial<User>): Promise<void> {
    loading.value = true;
    try {
      const payload: Record<string, any> = { id, ...data };

      // Old backend persists balance in cents; admin UI edits in yuan
      if (payload.balance !== undefined && payload.balance !== null) {
        payload.balance = (typeof payload.balance === 'string' ? Number(payload.balance) : payload.balance);
        payload.balance = Number.isFinite(payload.balance) ? Math.round(payload.balance * 100) : 0;
      }
      if (payload.commission_balance !== undefined && payload.commission_balance !== null) {
        payload.commission_balance = (typeof payload.commission_balance === 'string'
          ? Number(payload.commission_balance)
          : payload.commission_balance);
        payload.commission_balance = Number.isFinite(payload.commission_balance)
          ? Math.round(payload.commission_balance * 100)
          : 0;
      }

      await apiClient.post(`/v2/user/update`, payload);

      // Old backend returns boolean; refetch to sync state
      await fetchUserById(id);
    } catch (error) {
      console.error(`Failed to update user ${id}:`, error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function banUser(id: number): Promise<void> {
    loading.value = true;
    try {
      await apiClient.post(`/v2/user/ban`, { id });
      
      // Update user banned status in list
      const user = users.value.find((u) => u.id === id);
      if (user) {
        user.banned = 1;
      }
      
      // Update current user if it's the same
      if (currentUser.value?.id === id) {
        currentUser.value.banned = 1;
      }
    } catch (error) {
      console.error(`Failed to ban user ${id}:`, error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function unbanUser(id: number): Promise<void> {
    loading.value = true;
    try {
      await apiClient.post(`/v2/user/ban`, { id, banned: 0 });
      
      // Update user banned status in list
      const user = users.value.find((u) => u.id === id);
      if (user) {
        user.banned = 0;
      }
      
      // Update current user if it's the same
      if (currentUser.value?.id === id) {
        currentUser.value.banned = 0;
      }
    } catch (error) {
      console.error(`Failed to unban user ${id}:`, error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function adjustBalance(id: number, amount: number): Promise<void> {
    loading.value = true;
    try {
      // Get current balance first
      const user = currentUser.value?.id === id ? currentUser.value : users.value.find(u => u.id === id);
      if (!user) {
        throw new Error('User not found');
      }

      const newBalanceYuan = Math.max(0, amount);
      const newBalanceCents = Math.round(newBalanceYuan * 100);
      
      await apiClient.post(`/v2/user/update`, {
        id,
        balance: newBalanceCents,
      });

      // Old backend returns boolean; refetch to sync state
      await fetchUserById(id);
    } catch (error) {
      console.error(`Failed to adjust balance for user ${id}:`, error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function adjustTraffic(id: number, transfer_enable: number): Promise<void> {
    loading.value = true;
    try {
      await apiClient.post(`/v2/user/update`, {
        id,
        transfer_enable,
      });

      // Old backend may return boolean; refetch to sync state
      await fetchUserById(id);
    } catch (error) {
      console.error(`Failed to adjust traffic for user ${id}:`, error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function resetSecret(id: number): Promise<string> {
    loading.value = true;
    try {
      const response = await apiClient.post<{ data: { token: string } }>(
        `/v2/user/resetSecret`, { id }
      );
      return response.data.data.token;
    } catch (error) {
      console.error(`Failed to reset secret for user ${id}:`, error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function updateReferral(id: number, invite_user_id: number | null): Promise<void> {
    loading.value = true;
    try {
      const response = await apiClient.post<{ data: User }>(`/v2/user/setInviteUser`, {
        id,
        invite_user_id,
      });
      
      // Update user in list
      const index = users.value.findIndex((u) => u.id === id);
      if (index !== -1) {
        users.value[index] = response.data.data;
      }
      
      // Update current user if it's the same
      if (currentUser.value?.id === id) {
        currentUser.value = response.data.data;
      }
    } catch (error) {
      console.error(`Failed to update referral for user ${id}:`, error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function generateUsers(data: GenerateUserData): Promise<User[]> {
    loading.value = true;
    try {
      const response = await apiClient.post<{ data: User[] }>('/v2/user/generate', data);
      return response.data.data;
    } catch (error) {
      console.error('Failed to generate users:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function exportUsers(exportFilters?: UserFilters): Promise<Blob> {
    loading.value = true;
    try {
      const response = await apiClient.post<Blob>(
        '/v2/user/dumpCSV',
        {
          params: exportFilters || filters.value,
        },
        {
          responseType: 'blob',
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to export users:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function sendBulkEmail(userIds: number[], subject: string, content: string): Promise<void> {
    loading.value = true;
    try {
      await apiClient.post('/v2/user/sendMail', {
        user_ids: userIds,
        subject,
        content,
      });
    } catch (error) {
      console.error('Failed to send bulk email:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  function setFilters(newFilters: UserFilters): void {
    filters.value = { ...filters.value, ...newFilters };
  }

  function clearFilters(): void {
    filters.value = {};
  }

  function setSort(field: string, order: 'asc' | 'desc'): void {
    sortBy.value = field;
    sortOrder.value = order;
  }

  function setPage(page: number): void {
    currentPage.value = page;
  }

  function setPageSize(size: number): void {
    pageSize.value = size;
  }

  function clearCurrentUser(): void {
    currentUser.value = null;
  }

  function $reset(): void {
    users.value = [];
    currentUser.value = null;
    total.value = 0;
    currentPage.value = 1;
    pageSize.value = 20;
    loading.value = false;
    filters.value = {};
    sortBy.value = 'id';
    sortOrder.value = 'desc';
  }

  return {
    // State
    users,
    currentUser,
    total,
    currentPage,
    pageSize,
    loading,
    filters,
    sortBy,
    sortOrder,

    // Getters
    hasUsers,
    totalPages,
    isLoading,

    // Actions
    fetchUsers,
    fetchUserById,
    updateUser,
    banUser,
    unbanUser,
    adjustBalance,
    adjustTraffic,
    resetSecret,
    updateReferral,
    generateUsers,
    exportUsers,
    sendBulkEmail,
    setFilters,
    clearFilters,
    setSort,
    setPage,
    setPageSize,
    clearCurrentUser,
    $reset,
  };
});

