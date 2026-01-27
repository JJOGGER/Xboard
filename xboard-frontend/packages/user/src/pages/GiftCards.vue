<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('giftCards.title') }}</h1>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {{ t('giftCards.subtitle') }}
      </p>
    </div>

    <!-- Redemption Form -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('giftCards.redeemTitle') }}</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ t('giftCards.codeLabel') }}
          </label>
          <div class="flex gap-2">
            <n-input
              v-model:value="giftCardCode"
              placeholder="Enter your gift card code"
              size="large"
              :disabled="loading"
              @keyup.enter="handleValidate"
            >
              <template #prefix>
                <n-icon :component="CardOutline" />
              </template>
            </n-input>
            <n-button
              type="primary"
              size="large"
              @click="handleValidate"
              :loading="loading"
              :disabled="!giftCardCode.trim()"
            >
              Validate
            </n-button>
          </div>
        </div>

        <!-- Gift Card Details (after validation) -->
        <div v-if="currentCode" class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Gift Card Details</h3>
            <n-tag :type="currentCode.status === 0 ? 'success' : 'default'">
              {{ currentCode.status === 0 ? 'Available' : 'Used' }}
            </n-tag>
          </div>

          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">{{ t('giftCards.type') }}:</span>
              <span class="font-medium text-gray-900 dark:text-white">
                {{ currentCode.template?.type === 1 ? t('giftCards.typeBalance') : t('giftCards.typeTraffic') }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Amount:</span>
              <span class="font-medium text-gray-900 dark:text-white">
                {{ currentCode.template?.type === 1 
                  ? `$${currentCode.template?.amount.toFixed(2)}` 
                  : `${formatBytes(currentCode.template?.amount || 0)}` 
                }}
              </span>
            </div>
            <div v-if="currentCode.template?.validity_period" class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Validity:</span>
              <span class="font-medium text-gray-900 dark:text-white">
                {{ currentCode.template.validity_period }} days
              </span>
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <n-button
              type="primary"
              block
              size="large"
              @click="handleRedeem"
              :loading="loading"
              :disabled="currentCode.status !== 0"
            >
              {{ currentCode.status === 0 ? 'Redeem Now' : 'Already Redeemed' }}
            </n-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Redemption History -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Redemption History</h2>
      </div>
      
      <div class="p-6">
        <n-data-table
          :columns="columns"
          :data="redemptionHistory"
          :loading="loading"
          :pagination="{
            page,
            pageSize,
            itemCount: total,
            onChange: handlePageChange,
          }"
        />
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="!loading && redemptionHistory.length === 0"
      class="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center"
    >
      <n-icon :component="CardOutline" size="64" class="text-gray-300 dark:text-gray-600 mb-4" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No Redemptions Yet</h3>
      <p class="text-gray-600 dark:text-gray-400">
        You haven't redeemed any gift cards yet. Enter a code above to get started.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import { NButton, NIcon, NInput, NTag, NDataTable, useMessage } from 'naive-ui';
import { CardOutline, CheckmarkCircleOutline } from '@vicons/ionicons5';
import { useGiftCardStore } from '../stores/gift-card';
import { formatDate, formatBytes } from '@xboard/shared';
import type { DataTableColumns } from 'naive-ui';
import type { GiftCardRedemption } from '../stores/gift-card';

const message = useMessage();
const giftCardStore = useGiftCardStore();

// Computed properties from store
const redemptionHistory = computed(() => giftCardStore.redemptionHistory);
const currentCode = computed(() => giftCardStore.currentCode);
const loading = computed(() => giftCardStore.loading);
const page = computed(() => giftCardStore.page);
const pageSize = computed(() => giftCardStore.pageSize);
const total = computed(() => giftCardStore.total);

// Local state
const giftCardCode = ref('');

// Table columns
const columns: DataTableColumns<GiftCardRedemption> = [
  {
    title: 'Code',
    key: 'code',
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: 'Type',
    key: 'type',
    width: 120,
    render: (row) => {
      const typeMap = {
        1: { label: t('giftCards.typeBalance'), type: 'success' },
        2: { label: t('giftCards.typeTraffic'), type: 'info' },
      };
      const type = typeMap[row.type as keyof typeof typeMap] || typeMap[1];
      return h(NTag, { type: type.type as any, size: 'small' }, { default: () => type.label });
    },
  },
  {
    title: 'Amount',
    key: 'amount',
    width: 150,
    render: (row) => {
      if (row.type === 1) {
        return `$${row.amount.toFixed(2)}`;
      } else {
        return formatBytes(row.amount);
      }
    },
  },
  {
    title: 'Redeemed At',
    key: 'redeemed_at',
    width: 180,
    render: (row) => formatDate(row.redeemed_at),
  },
  {
    title: 'Status',
    key: 'status',
    width: 100,
    render: () =>
      h(
        NTag,
        { type: 'success', size: 'small' },
        {
          default: () => 'Redeemed',
          icon: () => h(NIcon, { component: CheckmarkCircleOutline }),
        }
      ),
  },
];

// Methods
async function handleValidate() {
  if (!giftCardCode.value.trim()) {
    message.warning('Please enter a gift card code');
    return;
  }

  try {
    await giftCardStore.validateCode(giftCardCode.value);
    if (currentCode.value) {
      message.success('Gift card validated successfully');
    } else {
      message.error('Invalid gift card code');
    }
  } catch (err: any) {
    message.error(err.message || 'Failed to validate gift card');
  }
}

async function handleRedeem() {
  if (!currentCode.value) return;

  try {
    await giftCardStore.redeemCode(giftCardCode.value);
    message.success('Gift card redeemed successfully!');
    giftCardCode.value = '';
    giftCardStore.clearCurrentCode();
    
    // Refresh history
    await giftCardStore.fetchRedemptionHistory();
  } catch (err: any) {
    message.error(err.message || 'Failed to redeem gift card');
  }
}

function handlePageChange(newPage: number) {
  giftCardStore.fetchRedemptionHistory(newPage);
}

// Lifecycle
onMounted(async () => {
  try {
    await giftCardStore.fetchRedemptionHistory();
  } catch (err: any) {
    message.error(err.message || 'Failed to load redemption history');
  }
});
</script>
