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

      <!-- Orders Table -->
      <div v-else-if="orders.length > 0" class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  {{ t('orders.table.orderNo') }}
                </th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  {{ t('orders.table.plan') }}
                </th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  {{ t('orders.table.period') }}
                </th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  {{ t('orders.table.amount') }}
                </th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  {{ t('orders.table.status') }}
                </th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  {{ t('orders.table.date') }}
                </th>
                <th class="px-6 py-4 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  {{ t('orders.table.actions') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
              <tr
                v-for="order in orders"
                :key="order.id"
                class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-slate-900 dark:text-white">
                    #{{ order.trade_no }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-slate-900 dark:text-white">
                    {{ getOrderPlanName(order) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-slate-600 dark:text-slate-400">
                    {{ t(`plans.periods.${getPeriodKey(order.period)}`) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-semibold text-slate-900 dark:text-white">
                    ${{ (getOrderPaidAmount(order) / 100).toFixed(2) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    :class="[
                      'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
                      getStatusClass(order.status)
                    ]"
                  >
                    {{ t(`orders.status.${getStatusKey(order.status)}`) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-slate-600 dark:text-slate-400">
                    {{ formatDate(order.created_at) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      @click="viewOrderDetail(order)"
                      class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium transition-colors"
                    >
                      {{ t('orders.actions.view') }}
                    </button>
                    <button
                      v-if="order.status === 0"
                      @click="handlePayment(order)"
                      class="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 text-sm font-medium transition-colors"
                    >
                      {{ t('orders.actions.pay') }}
                    </button>
                    <button
                      v-if="order.status === 0"
                      @click="handleCancelOrder(order)"
                      class="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium transition-colors"
                    >
                      {{ t('orders.actions.cancel') }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
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
import { ref, computed, onMounted, h } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useOrderStore } from '../stores/order';
import type { Order } from '@xboard/shared/types';
import { useDialog, useMessage } from 'naive-ui';
import dayjs from 'dayjs';

const { t } = useI18n();
const router = useRouter();
const orderStore = useOrderStore();
const dialog = useDialog();
const message = useMessage();

// State
const selectedOrder = ref<Order | null>(null);

// Computed
const loading = computed(() => orderStore.loading);
const error = computed(() => orderStore.error);
const orders = computed(() => orderStore.orders);

// Methods
function getStatusKey(status: number): string {
  const statusMap: Record<number, string> = {
    0: 'pending',
    1: 'processing',
    2: 'cancelled',
    3: 'completed',
    4: 'discounted',
  };
  return statusMap[status] || 'pending';
}

function getStatusClass(status: number): string {
  const classMap: Record<number, string> = {
    0: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    1: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    2: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    3: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    4: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
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

function getOrderPaidAmount(order: any): number {
  const total = typeof order?.total_amount === 'number' ? order.total_amount : Number(order?.total_amount || 0);
  const balance = typeof order?.balance_amount === 'number' ? order.balance_amount : Number(order?.balance_amount || 0);
  const safeTotal = Number.isFinite(total) ? total : 0;
  const safeBalance = Number.isFinite(balance) ? balance : 0;
  return safeTotal + safeBalance;
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

function viewOrderDetail(order: Order): void {
  selectedOrder.value = order;

  // Only pending orders should enter Checkout.
  // Cancelled/completed orders should show details instead of triggering payment flow.
  if (order.status === 0) {
    router.push({
      name: 'Checkout',
      query: {
        trade_no: (order as any).trade_no,
      },
    });
    return;
  }

  dialog.info({
    title: t('orders.detail.title'),
    content: () =>
      h('div', { class: 'space-y-2' }, [
        h('div', [h('span', { class: 'text-slate-500 mr-2' }, t('orders.detail.tradeNo')), h('span', String((order as any).trade_no ?? ''))]),
        h('div', [h('span', { class: 'text-slate-500 mr-2' }, t('orders.detail.plan')), h('span', getOrderPlanName(order))]),
        h('div', [h('span', { class: 'text-slate-500 mr-2' }, t('orders.detail.period')), h('span', t(`plans.periods.${getPeriodKey((order as any).period)}`))]),
        h('div', [h('span', { class: 'text-slate-500 mr-2' }, t('orders.detail.totalAmount')), h('span', `$${(getOrderPaidAmount(order) / 100).toFixed(2)}`)]),
        h('div', [h('span', { class: 'text-slate-500 mr-2' }, t('orders.detail.status')), h('span', t(`orders.status.${getStatusKey(order.status)}`))]),
        h('div', [h('span', { class: 'text-slate-500 mr-2' }, t('orders.detail.createdAt')), h('span', formatDate((order as any).created_at))]),
      ]),
    positiveText: t('orders.detail.close'),
  });
}

async function handlePayment(order: Order): Promise<void> {
  if (order.status !== 0) {
    message.warning(t('orders.payment.notPending'));
    return;
  }

  router.push({
    name: 'Checkout',
    query: {
      trade_no: (order as any).trade_no,
    },
  });
}

async function handleCancelOrder(order: Order): Promise<void> {
  dialog.warning({
    title: 'Warning',
    content: t('orders.cancel.confirm'),
    positiveText: 'OK',
    negativeText: 'Cancel',
    onPositiveClick: async () => {
      try {
        const planType = (order as any).plan_type;
        if (planType === 'shared' || (order as any).shared_plan_id || (order as any).shared_plan) {
          await orderStore.cancelShareOrder((order as any).trade_no);
        } else {
          await orderStore.cancelOrder((order as any).trade_no, order.id);
        }
        message.success(t('orders.cancel.success'));
      } catch (err: any) {
        console.error('Failed to cancel order:', err);
        message.error(err.message || t('orders.cancel.error'));
      }
    }
  });
}

// Lifecycle
onMounted(async () => {
  try {
    await orderStore.fetchOrders();
  } catch (err) {
    console.error('Failed to fetch orders:', err);
  }
});
</script>
