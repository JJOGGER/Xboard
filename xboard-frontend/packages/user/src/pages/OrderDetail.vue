<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto">
      <div class="mb-8">
        <button
          @click="router.back()"
          class="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          {{ t('checkout.buttons.back') }}
        </button>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white mt-4">
          {{ t('orders.detail.title') }}
        </h1>
      </div>

      <div v-if="loading" class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
        <div class="flex justify-center mb-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
        <p class="text-slate-600 dark:text-slate-400">{{ t('orders.loading') }}</p>
      </div>

      <div v-else-if="error" class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
        <p class="text-slate-600 dark:text-slate-400">{{ error }}</p>
      </div>

      <div v-else-if="orderInfo" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-6">
              {{ t('checkout.orderSummary.title') }}
            </h2>

            <div class="space-y-4">
              <div class="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-700">
                <span class="text-slate-600 dark:text-slate-400">{{ t('orders.detail.tradeNo') }}</span>
                <span class="font-semibold text-slate-900 dark:text-white">{{ orderInfo.trade_no }}</span>
              </div>

              <div class="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-700">
                <span class="text-slate-600 dark:text-slate-400">{{ t('checkout.orderSummary.plan') }}</span>
                <span class="font-semibold text-slate-900 dark:text-white">{{ planName }}</span>
              </div>

              <div class="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-700">
                <span class="text-slate-600 dark:text-slate-400">{{ t('checkout.orderSummary.period') }}</span>
                <span class="font-semibold text-slate-900 dark:text-white">{{ t(`plans.periods.${displayPeriodKey}`) }}</span>
              </div>

              <div class="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-700">
                <span class="text-slate-600 dark:text-slate-400">{{ t('checkout.orderSummary.price') }}</span>
                <span class="font-semibold text-slate-900 dark:text-white">¥{{ (originalPrice / 100).toFixed(2) }}</span>
              </div>

              <div v-if="discountAmount > 0" class="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-700">
                <span class="text-slate-600 dark:text-slate-400">{{ t('checkout.orderSummary.discount') }}</span>
                <span class="font-semibold text-green-600 dark:text-green-400">-¥{{ (discountAmount / 100).toFixed(2) }}</span>
              </div>

              <div v-if="balanceAmount > 0" class="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-700">
                <span class="text-slate-600 dark:text-slate-400">{{ t('orders.detail.balanceAmount') }}</span>
                <span class="font-semibold text-green-600 dark:text-green-400">-¥{{ (balanceAmount / 100).toFixed(2) }}</span>
              </div>

              <div v-if="surplusAmount > 0" class="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-700">
                <span class="text-slate-600 dark:text-slate-400">{{ t('orders.detail.surplusAmount') }}</span>
                <span class="font-semibold text-green-600 dark:text-green-400">-¥{{ (surplusAmount / 100).toFixed(2) }}</span>
              </div>

              <div v-if="handlingFeeAmount > 0" class="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-700">
                <span class="text-slate-600 dark:text-slate-400">{{ t('orders.detail.handlingAmount') }}</span>
                <span class="font-semibold text-slate-900 dark:text-white">¥{{ (handlingFeeAmount / 100).toFixed(2) }}</span>
              </div>

              <div class="flex justify-between items-center py-4">
                <span class="text-lg font-semibold text-slate-900 dark:text-white">{{ t('checkout.orderSummary.total') }}</span>
                <span class="text-2xl font-bold text-primary-600">¥{{ (grandTotalAmount / 100).toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <div v-if="showSharedTokenCard" class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              订阅导入
            </h2>

            <div class="text-sm text-slate-600 dark:text-slate-400 mb-4">
              复制下方加密 Token，在客户端导入即可使用。
            </div>

            <div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="font-mono text-xs text-slate-800 dark:text-slate-200 break-all leading-relaxed">
                  {{ sharedTokenDisplay }}
                </div>
                <button
                  @click="copySharedToken"
                  class="shrink-0 inline-flex items-center px-4 py-2 rounded-lg font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-colors"
                >
                  复制 Token
                </button>
              </div>

              <div class="mt-3">
                <button
                  @click="sharedTokenExpanded = !sharedTokenExpanded"
                  class="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  {{ sharedTokenExpanded ? '收起' : '展开完整 Token' }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="orderInfo.status === 0" class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-6">
              {{ t('checkout.payment.title') }}
            </h2>

            <div v-if="loadingPaymentMethods" class="flex justify-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>

            <div v-else-if="finalBaseAmount === 0" class="text-sm text-slate-600 dark:text-slate-400">
              余额已全额抵扣，无需选择支付方式。
            </div>

            <div v-else-if="paymentMethods.length > 0" class="space-y-3">
              <button
                v-for="method in paymentMethods"
                :key="method.id"
                @click="selectedPaymentMethod = method.id"
                :class="[
                  'w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer',
                  selectedPaymentMethod === method.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                ]"
              >
                <div class="flex items-center">
                  <div v-if="method.icon" class="w-10 h-10 rounded-lg overflow-hidden mr-3">
                    <img :src="method.icon" :alt="method.name" class="w-full h-full object-cover" />
                  </div>
                  <div v-else class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center mr-3">
                    <svg class="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div class="text-left">
                    <span class="font-medium text-slate-900 dark:text-white block">{{ method.name }}</span>
                    <span v-if="method.handling_fee_percent || method.handling_fee_fixed" class="text-xs text-slate-500 dark:text-slate-400">
                      Fee: {{ method.handling_fee_percent ? `${method.handling_fee_percent}%` : '' }}
                      {{ method.handling_fee_fixed ? `¥${(method.handling_fee_fixed / 100).toFixed(2)}` : '' }}
                    </span>
                  </div>
                </div>
                <div
                  :class="[
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    selectedPaymentMethod === method.id
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-slate-300 dark:border-slate-600'
                  ]"
                >
                  <svg v-if="selectedPaymentMethod === method.id" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </div>
              </button>
            </div>

            <div v-else class="text-center py-8">
              <p class="text-slate-600 dark:text-slate-400">No payment methods available</p>
            </div>
          </div>
        </div>

        <div class="lg:col-span-1">
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 sticky top-6">
            <div class="flex justify-between items-center">
              <span
                :class="[
                  'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
                  statusClass
                ]"
              >
                {{ statusText }}
              </span>
            </div>

            <div v-if="orderInfo.status === 0" class="mt-6 space-y-3">
              <button
                @click="startPayment"
                :disabled="(finalBaseAmount > 0 && selectedPaymentMethod === null) || processing"
                class="w-full py-3 px-6 rounded-xl font-semibold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                <span v-if="processing">{{ t('checkout.payment.processing') }}</span>
                <span v-else>{{ t('checkout.buttons.pay') }}</span>
              </button>

              <button
                @click="cancelOrder"
                :disabled="processing"
                class="w-full py-3 px-6 rounded-xl font-semibold bg-slate-200 hover:bg-slate-300 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {{ t('orders.actions.cancel') }}
              </button>
            </div>

            <div v-if="polling" class="mt-4 text-sm text-slate-600 dark:text-slate-400">
              {{ pollingMessage }}
            </div>
          </div>
        </div>
      </div>

      <div v-else class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
        <p class="text-slate-600 dark:text-slate-400">{{ t('orders.error') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useMessage, useDialog } from 'naive-ui';
import apiClient from '@xboard/shared/api/client';
import type { PaymentMethod } from '@xboard/shared/types';
import { useOrderStore } from '../stores/order';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const orderStore = useOrderStore();

const tradeNo = computed(() => String(route.params.trade_no || ''));

const loading = ref(true);
const error = ref<string | null>(null);
const orderInfo = ref<any>(null);

const paymentMethods = ref<PaymentMethod[]>([]);
const loadingPaymentMethods = ref(false);
const selectedPaymentMethod = ref<number | null>(null);

const processing = ref(false);
const polling = ref(false);
const pollingMessage = ref('');
let pollingTimer: any = null;
let pollingAttempts = 0;

const sharedTokenExpanded = ref(false);

const planName = computed(() => orderInfo.value?.shared_plan?.name || orderInfo.value?.plan?.name || '-');

const sharedToken = computed(() => {
  const info: any = orderInfo.value;
  const token = info?.subscription_url;
  return typeof token === 'string' ? token.trim() : '';
});

const showSharedTokenCard = computed(() => {
  return (orderInfo.value?.plan_type === 'shared') && sharedToken.value.length > 0;
});

const sharedTokenDisplay = computed(() => {
  if (sharedTokenExpanded.value) return sharedToken.value;
  const token = sharedToken.value;
  if (!token) return '';
  if (token.length <= 32) return token;
  return `${token.slice(0, 16)}...${token.slice(-12)}`;
});

async function copySharedToken() {
  const token = sharedToken.value;
  if (!token) return;
  try {
    await navigator.clipboard.writeText(token);
    message.success('已复制');
    return;
  } catch {
    // fallback
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = token;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    message.success('已复制');
  } catch (e: any) {
    message.error(e?.message || '复制失败');
  }
}

const displayPeriodKey = computed(() => {
  const period = orderInfo.value?.period;
  const mapping: Record<string, string> = {
    monthly: 'month',
    quarterly: 'quarter',
    half_yearly: 'half_year',
    yearly: 'year',
    two_yearly: 'two_year',
    three_yearly: 'three_year',
    onetime: 'onetime',
    reset_traffic: 'reset',
    reset: 'reset',
    month_price: 'month',
    quarter_price: 'quarter',
    half_year_price: 'half_year',
    year_price: 'year',
    two_year_price: 'two_year',
    three_year_price: 'three_year',
    onetime_price: 'onetime',
    reset_price: 'reset',
  };
  return mapping[period] || period;
});

const statusText = computed(() => {
  const status = Number(orderInfo.value?.status);
  if (status === 0) return '待支付';
  if (status === 1) return '开通中';
  if (status === 2) return '已取消';
  if (status === 3) return '已完成';
  if (status === 4) return '已折抵';
  return '未知';
});

const statusClass = computed(() => {
  const status = Number(orderInfo.value?.status);
  if (status === 0) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
  if (status === 1) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
  if (status === 2) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
  if (status === 3) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
  if (status === 4) return 'bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200';
  return 'bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200';
});

const discountAmount = computed(() => Number(orderInfo.value?.discount_amount || 0));
const balanceAmount = computed(() => Number(orderInfo.value?.balance_amount || 0));
const surplusAmount = computed(() => Number(orderInfo.value?.surplus_amount || 0));

const originalPrice = computed(() => {
  const info: any = orderInfo.value;
  if (!info) return 0;
  const plan: any = info.plan || info.shared_plan;

  if (info.plan_type === 'shared' && plan?.pricing_tiers) {
    const legacyToShared: Record<string, string> = {
      month_price: 'monthly',
      quarter_price: 'quarterly',
      half_year_price: 'half_yearly',
      year_price: 'yearly',
      two_year_price: 'two_yearly',
      three_year_price: 'three_yearly',
      onetime_price: 'onetime',
    };
    const sharedPeriod = legacyToShared[String(info.period)] || String(info.period);
    const price = plan.pricing_tiers?.[sharedPeriod]?.price;
    if (typeof price === 'number') return price;
  }

  // Fallback: restore original price from payable + deductions
  return Number(info.total_amount || 0) + discountAmount.value + balanceAmount.value + surplusAmount.value;
});

const finalBaseAmount = computed(() => {
  // Backend total_amount is base payable after deductions
  return Math.max(0, Number(orderInfo.value?.total_amount || 0));
});

const handlingFeeAmount = computed(() => {
  if (finalBaseAmount.value <= 0) return 0;
  const method = paymentMethods.value.find((m: any) => Number(m?.id) === Number(selectedPaymentMethod.value));
  if (!method) return 0;
  const percent = Number((method as any).handling_fee_percent || 0);
  const fixed = Number((method as any).handling_fee_fixed || 0);
  const percentFee = percent > 0 ? Math.round(finalBaseAmount.value * (percent / 100)) : 0;
  return fixed + percentFee;
});

const grandTotalAmount = computed(() => {
  return Math.max(0, finalBaseAmount.value + handlingFeeAmount.value);
});

async function fetchOrderDetail() {
  loading.value = true;
  error.value = null;
  try {
    // Try traditional first
    try {
      const resp = await apiClient.get('/v1/user/order/detail', { params: { trade_no: tradeNo.value } });
      const payload: any = (resp as any).data;
      if (payload?.status === 'success' && payload?.data) {
        orderInfo.value = { ...payload.data, plan_type: 'traditional' };
      } else {
        throw new Error('not traditional');
      }
    } catch {
      const resp = await apiClient.get('/v1/user/share-order/detail', { params: { trade_no: tradeNo.value } });
      const payload: any = (resp as any).data;
      const data = payload?.data ?? payload;
      orderInfo.value = { ...data, plan_type: 'shared' };
    }

    if (orderInfo.value?.status === 0 && finalBaseAmount.value > 0) {
      await fetchPaymentMethods();
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

async function fetchPaymentMethods() {
  loadingPaymentMethods.value = true;
  try {
    const resp = await apiClient.get('/v1/user/order/getPaymentMethod');
    const payload: any = (resp as any).data;
    const methods = payload?.data ?? payload;
    paymentMethods.value = (Array.isArray(methods) ? methods : []).filter((m: any) => Number(m?.id) !== 0);
    if (selectedPaymentMethod.value === null && paymentMethods.value.length > 0) {
      selectedPaymentMethod.value = (paymentMethods.value[0] as any).id ?? null;
    }
  } finally {
    loadingPaymentMethods.value = false;
  }
}

function stopPolling() {
  polling.value = false;
  pollingMessage.value = '';
  pollingAttempts = 0;
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

function startPolling() {
  if (polling.value) return;
  polling.value = true;
  pollingAttempts = 0;
  pollingMessage.value = '支付中...';

  const orderType = orderInfo.value?.plan_type || 'traditional';

  pollingTimer = setInterval(async () => {
    pollingAttempts += 1;
    if (pollingAttempts > 120) {
      stopPolling();
      return;
    }

    try {
      if (orderType === 'shared') {
        const resp = await apiClient.get('/v1/user/share-order/check', {
          params: { trade_no: tradeNo.value, t: Date.now() },
        });
        const payload: any = (resp as any).data;
        const status = typeof payload?.data?.status === 'number' ? payload.data.status : payload?.data?.status;
        const s = typeof status === 'number' ? status : Number(payload?.data?.status ?? payload?.data ?? payload);
        if ([1, 3, 4, -1].includes(s)) {
          stopPolling();
          await fetchOrderDetail();
        }
        return;
      }

      const resp = await apiClient.get('/v1/user/order/check', {
        params: { trade_no: tradeNo.value, t: Date.now() },
      });
      const payload: any = (resp as any).data;
      const s = typeof payload?.data === 'number' ? payload.data : Number(payload?.data ?? payload);
      if ([1, 3, 4, -1].includes(s)) {
        stopPolling();
        await fetchOrderDetail();
      }
    } catch {
      // ignore polling errors
    }
  }, 2000);
}

async function startPayment() {
  if (!orderInfo.value || orderInfo.value.status !== 0) return;
  if (finalBaseAmount.value > 0 && selectedPaymentMethod.value === null) return;

  processing.value = true;
  try {
    const orderType = orderInfo.value?.plan_type || 'traditional';
    const methodId = finalBaseAmount.value === 0 ? 0 : selectedPaymentMethod.value!;

    const result = await orderStore.checkout(tradeNo.value, methodId, undefined, orderType);

    if (result?.type === 1 && result?.data) {
      window.location.href = result.data as string;
      startPolling();
      return;
    }

    if (result?.type === -1) {
      message.success(t('checkout.payment.success'));
      await fetchOrderDetail();
      return;
    }

    message.success(t('checkout.payment.success'));
    await fetchOrderDetail();
  } catch (e: any) {
    message.error(e?.response?.data?.message || e?.message || t('checkout.payment.error'));
  } finally {
    processing.value = false;
  }
}

async function cancelOrder() {
  if (!orderInfo.value || orderInfo.value.status !== 0) return;

  dialog.warning({
    title: 'Warning',
    content: t('orders.cancel.confirm'),
    positiveText: 'OK',
    negativeText: 'Cancel',
    onPositiveClick: async () => {
      try {
        const orderType = orderInfo.value?.plan_type || 'traditional';
        if (orderType === 'shared') {
          await orderStore.cancelShareOrder(tradeNo.value);
        } else {
          await orderStore.cancelOrder(tradeNo.value);
        }
        message.success(t('orders.cancel.success'));
        await fetchOrderDetail();
      } catch (e: any) {
        message.error(e?.response?.data?.message || e?.message || t('orders.cancel.error'));
      }
    },
  });
}

onMounted(async () => {
  await fetchOrderDetail();
});

onBeforeUnmount(() => {
  stopPolling();
});
</script>
