<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white">
          {{ t('orders.title') }}
        </h1>
        <p class="text-slate-600 dark:text-slate-400 mt-2">
          {{ t('orders.subtitle') }}
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <span class="ml-3 text-slate-600 dark:text-slate-400">{{ t('orders.loading') }}</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-20">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
          <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-slate-600 dark:text-slate-400">{{ t('orders.error') }}</p>
      </div>

      <!-- Orders List (MaClash-aligned cards) -->
      <div v-else-if="orders.length > 0" class="space-y-4">
        <div
          v-for="order in orders"
          :key="order.id"
          class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 cursor-pointer transition-transform hover:scale-[1.01]"
          @click="goToOrderDetail(order)"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="text-lg font-semibold text-slate-900 dark:text-white truncate">
                {{ getOrderPlanName(order) }}
              </div>
              <div class="text-3xl font-bold text-primary-600 mt-2">
                ¥{{ (getOrderOriginalPrice(order) / 100).toFixed(2) }}
              </div>
            </div>

            <span
              :class="[
                'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0',
                getStatusClass(order.status)
              ]"
            >
              {{ getStatusText(order.status) }}
            </span>
          </div>

          <div class="mt-4 space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <div>
              {{ t('orders.detail.tradeNo') }}：{{ (order as any).trade_no }}
            </div>
            <div>
              {{ t('orders.detail.period') }}：{{ t(`plans.periods.${getPeriodKey((order as any).period)}`) }}
            </div>
            <div>
              {{ t('orders.detail.createdAt') }}：{{ formatDate((order as any).created_at) }}
            </div>
          </div>
        </div>
      </div>

      <!-- No Orders -->
      <div v-else class="text-center py-20">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
          <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p class="text-slate-600 dark:text-slate-400 mb-4">{{ t('orders.noOrders') }}</p>
        <button
          @click="router.push('/plans')"
          class="px-6 py-3 rounded-xl font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-all"
        >
          {{ t('orders.viewPlans') }}
        </button>
      </div>
    </div>

    
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useOrderStore } from '../stores/order';
import type { Order } from '@xboard/shared/types';
import dayjs from 'dayjs';

const { t } = useI18n();
const router = useRouter();
const orderStore = useOrderStore();

// Computed
const loading = computed(() => orderStore.loading);
const error = computed(() => orderStore.error);
const orders = computed(() => orderStore.orders);

// Methods
function getStatusText(status: number): string {
  switch (status) {
    case 0:
      return '待支付';
    case 1:
      return '开通中';
    case 2:
      return '已取消';
    case 3:
      return '已完成';
    case 4:
      return '已折抵';
    default:
      return '未知';
  }
}

function getStatusClass(status: number): string {
  const classMap: Record<number, string> = {
    0: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    1: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    2: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    3: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    4: 'bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200',
  };
  return classMap[status] || classMap[0];
}

function formatDate(date: string): string {
  // Backend may return unix seconds (number) or numeric string
  const raw: any = date as any;
  if (typeof raw === 'number') {
    return dayjs.unix(raw).format('YYYY-MM-DD HH:mm');
  }
  if (typeof raw === 'string' && /^\d+$/.test(raw)) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) {
      // Heuristic: 10-digit seconds vs 13-digit ms
      return raw.length <= 10
        ? dayjs.unix(n).format('YYYY-MM-DD HH:mm')
        : dayjs(n).format('YYYY-MM-DD HH:mm');
    }
  }
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}

function getOrderPlanName(order: any): string {
  return order?.shared_plan?.name || order?.plan?.name || 'N/A';
}

function getOrderOriginalPrice(order: any): number {
  // User-side: this page is shared-orders only, show payable amount.
  // Backend amounts are in cents.
  const total = Number(order?.total_amount || 0);
  return Number.isFinite(total) ? total : 0;
}

function getPeriodKey(period: string): string {
  const mapping: Record<string, string> = {
    month_price: 'month',
    quarter_price: 'quarter',
    half_year_price: 'half_year',
    year_price: 'year',
    two_year_price: 'two_year',
    three_year_price: 'three_year',
    onetime_price: 'onetime',
    reset_price: 'reset',
    monthly: 'month',
    quarterly: 'quarter',
    half_yearly: 'half_year',
    yearly: 'year',
    two_yearly: 'two_year',
    three_yearly: 'three_year',
    onetime: 'onetime',
    reset_traffic: 'reset',
    reset: 'reset',
  };
  return mapping[period] || period;
}

function goToOrderDetail(order: Order): void {
  router.push({
    name: 'OrderDetail',
    params: {
      trade_no: String((order as any).trade_no),
    },
  });
}

// Lifecycle
onMounted(async () => {
  try {
    await orderStore.fetchOrders({
      order_kind: 'shared',
    } as any);
  } catch (err) {
    console.error('Failed to fetch orders:', err);
  }
});
</script>
