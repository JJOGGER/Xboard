<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('referral.title') }}</h1>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {{ t('referral.subtitle') }}
      </p>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Earnings</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              ${{ (stats?.commission_balance || 0).toFixed(2) }}
            </p>
          </div>
          <div class="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <n-icon :component="CashOutline" size="24" class="text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              ${{ (stats?.commission_pending || 0).toFixed(2) }}
            </p>
          </div>
          <div class="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
            <n-icon :component="TimeOutline" size="24" class="text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Referrals</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {{ stats?.invite_count || 0 }}
            </p>
          </div>
          <div class="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <n-icon :component="PeopleOutline" size="24" class="text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Commission Rate</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {{ stats?.commission_rate || 0 }}%
            </p>
          </div>
          <div class="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
            <n-icon :component="TrendingUpOutline" size="24" class="text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>
    </div>

    <!-- Referral Link Section -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Referral Link</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Referral Link
          </label>
          <div class="flex gap-2">
            <n-input
              :value="referralLink"
              readonly
              placeholder="Loading..."
              class="flex-1"
            />
            <n-button type="primary" @click="copyLink">
              <template #icon>
                <n-icon :component="CopyOutline" />
              </template>
              Copy
            </n-button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Referral Code
          </label>
          <div class="flex gap-2">
            <n-input
              :value="referralCode"
              readonly
              placeholder="Loading..."
              class="flex-1"
            />
            <n-button type="primary" @click="copyCode">
              <template #icon>
                <n-icon :component="CopyOutline" />
              </template>
              Copy
            </n-button>
          </div>
        </div>

        <div class="flex gap-2">
          <n-button @click="generateCode" :loading="loading">
            <template #icon>
              <n-icon :component="AddOutline" />
            </template>
            Generate New Code
          </n-button>
        </div>
      </div>
    </div>

    <!-- Tabs for Referrals and Commissions -->
    <n-tabs type="line" animated>
      <n-tab-pane name="referrals" tab="Referred Users">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
          <n-data-table
            :columns="referralColumns"
            :data="referredUsers"
            :loading="loading"
            :pagination="{
              page: referredUsersPage,
              pageSize: referredUsersPageSize,
              itemCount: referredUsersTotal,
              onChange: handleReferralPageChange,
            }"
          />
        </div>
      </n-tab-pane>

      <n-tab-pane name="commissions" tab="Commission Logs">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
          <n-data-table
            :columns="commissionColumns"
            :data="commissionLogs"
            :loading="loading"
            :pagination="{
              page: commissionPage,
              pageSize: commissionPageSize,
              itemCount: commissionTotal,
              onChange: handleCommissionPageChange,
            }"
          />
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue';
import { NButton, NIcon, NInput, NTabs, NTabPane, NDataTable, NTag, useMessage } from 'naive-ui';
import {
  CashOutline,
  TimeOutline,
  PeopleOutline,
  TrendingUpOutline,
  CopyOutline,
  AddOutline,
} from '@vicons/ionicons5';
import { useReferralStore } from '../stores/referral';
import { formatDate } from '@xboard/shared';
import type { DataTableColumns } from 'naive-ui';
import type { ReferredUser, CommissionLog } from '@xboard/shared';

const message = useMessage();
const referralStore = useReferralStore();

// Computed properties from store
const stats = computed(() => referralStore.stats);
const referralLink = computed(() => referralStore.referralLink);
const referralCode = computed(() => referralStore.referralCode);
const referredUsers = computed(() => referralStore.referredUsers);
const commissionLogs = computed(() => referralStore.commissionLogs);
const loading = computed(() => referralStore.loading);

const commissionPage = computed(() => referralStore.commissionPage);
const commissionPageSize = computed(() => referralStore.commissionPageSize);
const commissionTotal = computed(() => referralStore.commissionTotal);

const referredUsersPage = computed(() => referralStore.referredUsersPage);
const referredUsersPageSize = computed(() => referralStore.referredUsersPageSize);
const referredUsersTotal = computed(() => referralStore.referredUsersTotal);

// Table columns
const referralColumns: DataTableColumns<ReferredUser> = [
  {
    title: 'Email',
    key: 'email',
  },
  {
    title: 'Registered',
    key: 'created_at',
    render: (row) => formatDate(row.created_at),
  },
  {
    title: 'Commission Earned',
    key: 'commission_balance',
    render: (row) => `$${row.commission_balance.toFixed(2)}`,
  },
];

const commissionColumns: DataTableColumns<CommissionLog> = [
  {
    title: 'User',
    key: 'invite_user',
    render: (row) => row.invite_user?.email || 'N/A',
  },
  {
    title: 'Order',
    key: 'trade_no',
  },
  {
    title: 'Amount',
    key: 'commission_balance',
    render: (row) => `$${row.commission_balance.toFixed(2)}`,
  },
  {
    title: 'Status',
    key: 'commission_status',
    render: (row) => {
      const statusMap = {
        0: { label: 'Pending', type: 'warning' },
        1: { label: 'Confirmed', type: 'success' },
        2: { label: 'Paid', type: 'info' },
      };
      const status = statusMap[row.commission_status as keyof typeof statusMap] || statusMap[0];
      return h(NTag, { type: status.type as any }, { default: () => status.label });
    },
  },
  {
    title: 'Date',
    key: 'created_at',
    render: (row) => formatDate(row.created_at),
  },
];

// Methods
async function copyLink() {
  try {
    await navigator.clipboard.writeText(referralLink.value);
    message.success('Referral link copied to clipboard');
  } catch (err) {
    message.error('Failed to copy link');
  }
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(referralCode.value);
    message.success('Referral code copied to clipboard');
  } catch (err) {
    message.error('Failed to copy code');
  }
}

async function generateCode() {
  try {
    await referralStore.generateInviteCode();
    message.success('New invite code generated successfully');
  } catch (err: any) {
    message.error(err.message || 'Failed to generate invite code');
  }
}

function handleReferralPageChange(page: number) {
  referralStore.fetchReferredUsers(page);
}

function handleCommissionPageChange(page: number) {
  referralStore.fetchCommissionLogs(page);
}

// Lifecycle
onMounted(async () => {
  try {
    await Promise.all([
      referralStore.fetchStats(),
      referralStore.fetchReferralLink(),
      referralStore.fetchReferredUsers(),
      referralStore.fetchCommissionLogs(),
    ]);
  } catch (err: any) {
    message.error(err.message || 'Failed to load referral data');
  }
});
</script>
