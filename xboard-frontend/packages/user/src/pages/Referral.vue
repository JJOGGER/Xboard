<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('referral.title') }}</h1>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {{ t('referral.subtitle') }}
      </p>
    </div>

    <!-- Invite Code Management -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('referral.inviteCodeManagement') }}</h2>
        <div class="flex items-center gap-2">
          <n-button @click="copyFirstRegisterLink" :disabled="!inviteCodes?.length">
            <template #icon>
              <n-icon :component="CopyOutline" />
            </template>
            {{ t('referral.copyLink') }}
          </n-button>
          <n-button type="primary" @click="generateCode" :loading="loading">
            <template #icon>
              <n-icon :component="AddOutline" />
            </template>
            {{ t('referral.generateCode') }}
          </n-button>
        </div>
      </div>

      <n-data-table
        :columns="inviteCodeColumns"
        :data="inviteCodes"
        :loading="loading"
      />
    </div>

    <!-- Statistics Cards (match screenshot fields) -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div class="text-center">
          <div class="text-3xl font-bold text-green-600 dark:text-green-400">
            {{ stats?.registered_user_count ?? 0 }}
          </div>
          <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">{{ t('referral.registeredUserCount') }}</div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div class="text-center">
          <div class="text-3xl font-bold text-green-600 dark:text-green-400">
            {{ stats?.per_invite_reward_traffic_gb ?? 0 }} GB
          </div>
          <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">{{ t('referral.perInviteRewardTraffic') }}</div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div class="text-center">
          <div class="text-3xl font-bold text-green-600 dark:text-green-400">
            {{ stats?.total_reward_traffic_gb ?? 0 }} GB
          </div>
          <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">{{ t('referral.totalRewardTraffic') }}</div>
        </div>
      </div>
    </div>

    <!-- Invite Details -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('referral.inviteDetails') }}</h2>
      <n-data-table
        :columns="inviteDetailColumns"
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, h } from 'vue';
import { useI18n } from 'vue-i18n'
import { NButton, NIcon, NDataTable, NTag, useMessage } from 'naive-ui';
import {
  CopyOutline,
  AddOutline,
} from '@vicons/ionicons5';
import { useReferralStore } from '../stores/referral';
import { formatDate } from '@xboard/shared';
import type { DataTableColumns } from 'naive-ui';
import type { InviteCode, CommissionLog } from '@xboard/shared';

const { t } = useI18n()
const message = useMessage()
const referralStore = useReferralStore()

// Computed properties from store
const stats = computed(() => referralStore.stats);
const inviteCodes = computed(() => referralStore.inviteCodes);
const commissionLogs = computed(() => referralStore.commissionLogs);
const loading = computed(() => referralStore.loading);

const commissionPage = computed(() => referralStore.commissionPage);
const commissionPageSize = computed(() => referralStore.commissionPageSize);
const commissionTotal = computed(() => referralStore.commissionTotal);

// referredUsers pagination is reserved for future use

// Invite code table columns
const inviteCodeColumns: DataTableColumns<InviteCode> = [
  {
    title: t('referral.inviteCode'),
    key: 'code',
  },
  {
    title: t('referral.createdAt'),
    key: 'created_at',
    render: (row) => formatDate(row.created_at as any),
  },
  {
    title: t('referral.actions'),
    key: 'actions',
    render: (row) => {
      return h(
        NButton,
        {
          size: 'small',
          type: 'primary',
          secondary: true,
          onClick: () => copyRegisterLink(row.code),
        } as any,
        {
          default: () => t('referral.copyRegisterLink'),
          icon: () => h(NIcon, { component: CopyOutline }),
        }
      )
    },
  },
]

// Invite details table columns
const inviteDetailColumns: DataTableColumns<CommissionLog> = [
  {
    title: '#',
    key: 'id',
    width: 80,
  },
  {
    title: t('referral.completedAt'),
    key: 'created_at',
    render: (row) => formatDate((row as any).created_at),
  },
  {
    title: t('referral.inviteeUser'),
    key: 'invitee_email',
    render: (row) => (row as any).invitee_email || '-',
  },
  {
    title: t('referral.traffic'),
    key: 'get_amount',
    render: (row) => `${((row as any).get_amount ?? 0)}`,
  },
  {
    title: t('referral.status'),
    key: 'status',
    render: (row) => {
      const statusMap = {
        0: { label: t('referral.pending'), type: 'warning' },
        1: { label: t('referral.confirmed'), type: 'success' },
        2: { label: t('referral.paid'), type: 'info' },
      };
      const raw = (row as any).commission_status ?? 2;
      const status = statusMap[raw as keyof typeof statusMap] || statusMap[2];
      return h(NTag, { type: status.type as any }, { default: () => status.label });
    },
  },
]

// Methods
async function copyFirstRegisterLink() {
  const firstCode = inviteCodes.value?.[0]?.code || ''
  if (!firstCode) return
  await copyRegisterLink(firstCode)
}

async function copyRegisterLink(code: string) {
  try {
    const baseUrl = window.location.origin
    await navigator.clipboard.writeText(`${baseUrl}/register?code=${code}`)
    message.success(t('referral.linkCopied'))
  } catch (err) {
    message.error(t('referral.copyFailed'))
  }
}

async function generateCode() {
  try {
    await referralStore.generateInviteCode();
    message.success(t('referral.generateSuccess'));
  } catch (err: any) {
    message.error(err.message || t('referral.generateFailed'));
  }
}

function handleCommissionPageChange(page: number) {
  referralStore.fetchCommissionLogs(page);
}

// Lifecycle
onMounted(async () => {
  try {
    await Promise.all([
      referralStore.fetchOverview(),
      referralStore.fetchCommissionLogs(),
    ]);
  } catch (err: any) {
    message.error(err.message || 'Failed to load referral data');
  }
});
</script>
