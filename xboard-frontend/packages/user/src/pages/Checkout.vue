<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
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
          {{ t('checkout.title') }}
        </h1>
        <p class="text-slate-600 dark:text-slate-400 mt-2">
          {{ t('checkout.subtitle') }}
        </p>
      </div>

      <!-- Loading Order -->
      <div v-if="!selectedPlan && loadingOrder" class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
        <div class="flex justify-center mb-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
        <p class="text-slate-600 dark:text-slate-400 mb-4">正在加载订单信息...</p>
      </div>

      <!-- No Plan Selected -->
      <div v-else-if="!selectedPlan" class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 mb-4">
          <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p class="text-slate-600 dark:text-slate-400 mb-4">订单信息加载失败</p>
        <button
          @click="router.back()"
          class="px-6 py-3 rounded-xl font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-all"
        >
          返回
        </button>
      </div>

      <!-- Checkout Content -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Order Summary -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Order Details -->
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-6">
              {{ t('checkout.orderSummary.title') }}
            </h2>
            
            <div class="space-y-4">
              <div class="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-700">
                <span class="text-slate-600 dark:text-slate-400">{{ t('checkout.orderSummary.plan') }}</span>
                <span class="font-semibold text-slate-900 dark:text-white">{{ selectedPlan.name }}</span>
              </div>
              
              <div class="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-700">
                <span class="text-slate-600 dark:text-slate-400">{{ t('checkout.orderSummary.period') }}</span>
                <span class="font-semibold text-slate-900 dark:text-white">{{ t(`plans.periods.${displayPeriodKey}`) }}</span>
              </div>
              
              <div class="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-700">
                <span class="text-slate-600 dark:text-slate-400">{{ t('checkout.orderSummary.price') }}</span>
                <span class="font-semibold text-slate-900 dark:text-white">¥{{ (selectedPlanPrice / 100).toFixed(2) }}</span>
              </div>
              
              <div v-if="discountAmount > 0" class="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-700">
                <span class="text-slate-600 dark:text-slate-400">{{ t('checkout.orderSummary.discount') }}</span>
                <span class="font-semibold text-green-600 dark:text-green-400">-¥{{ (discountAmount / 100).toFixed(2) }}</span>
              </div>
              
              <div class="flex justify-between items-center py-4">
                <span class="text-lg font-semibold text-slate-900 dark:text-white">{{ t('checkout.orderSummary.total') }}</span>
                <span class="text-2xl font-bold text-primary-600">¥{{ (finalAmount / 100).toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <!-- Payment Methods -->
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-6">
              {{ t('checkout.payment.title') }}
            </h2>

            <!-- Loading Payment Methods -->
            <div v-if="loadingPaymentMethods" class="flex justify-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>

            <!-- Payment Method List -->
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

            <!-- No Payment Methods -->
            <div v-else class="text-center py-8">
              <p class="text-slate-600 dark:text-slate-400">No payment methods available</p>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="lg:col-span-1">
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 sticky top-6">
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {{ t('checkout.planFeatures.title') }}
            </h3>
            <div class="space-y-3 mb-6">
              <div class="flex items-center text-sm text-slate-700 dark:text-slate-300">
                <svg class="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span>{{ formatBytes(selectedPlan.transfer_enable) }} {{ t('checkout.planFeatures.traffic') }}</span>
              </div>
              <div class="flex items-center text-sm text-slate-700 dark:text-slate-300">
                <svg class="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span>{{ selectedPlan.speed_limit ? `${selectedPlan.speed_limit} Mbps` : t('checkout.planFeatures.unlimited') }} {{ t('checkout.planFeatures.speed') }}</span>
              </div>
              <div class="flex items-center text-sm text-slate-700 dark:text-slate-300">
                <svg class="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span>{{ selectedPlan.device_limit ? `${selectedPlan.device_limit} ${t('checkout.planFeatures.devices')}` : t('checkout.planFeatures.unlimitedDevices') }}</span>
              </div>
            </div>

            <button
              @click="handleCheckout"
              :disabled="selectedPaymentMethod === null || processing"
              class="w-full py-3 px-6 rounded-xl font-semibold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
            >
              <span v-if="processing">{{ t('checkout.payment.processing') }}</span>
              <span v-else>{{ t('checkout.buttons.pay') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useMessage, useDialog } from 'naive-ui';
import { usePlanStore } from '../stores/plan';
import { useOrderStore } from '../stores/order';
import type { PaymentMethod } from '@xboard/shared/types';
import { formatBytes } from '@xboard/shared/utils';
import apiClient from '@xboard/shared/api/client';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const message = useMessage();
const dialog = useDialog();
const planStore = usePlanStore();
const orderStore = useOrderStore();

// State
const initialTradeNo = (route.query.trade_no as string) || '';
const tradeNo = ref<string>(initialTradeNo);
const orderInfo = ref<any>(null);
const paymentMethods = ref<PaymentMethod[]>([]);
const selectedPaymentMethod = ref<number | null>(null);
const loadingPaymentMethods = ref(false);
const loadingOrder = ref(!!initialTradeNo);
const processing = ref(false);
const discountAmount = ref(0);
const finalAmount = ref(0);

// Computed - 兼容两种模式
const selectedPlan = computed(() => {
  // 优先使用订单信息
  if (orderInfo.value) {
    return orderInfo.value.plan || orderInfo.value.shared_plan;
  }
  // 降级到 planStore（传统流程）
  return planStore.selectedPlan;
});

const selectedPeriod = computed(() => {
  if (orderInfo.value) {
    return orderInfo.value.period;
  }
  return planStore.selectedPeriod;
});

const displayPeriodKey = computed(() => {
  const period = selectedPeriod.value;
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
    // Legacy period keys returned by some endpoints
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

const selectedPlanPrice = computed(() => {
  if (orderInfo.value) {
    return orderInfo.value.total_amount; // 后端统一返回分
  }
  return planStore.selectedPlanPrice;
});

const couponCode = computed(() => planStore.couponCode);

// Calculate final amount with discount
const calculateFinalAmount = () => {
  if (orderInfo.value) {
    finalAmount.value = orderInfo.value.total_amount - discountAmount.value;
  } else {
    const basePrice = selectedPlanPrice.value;
    finalAmount.value = basePrice - discountAmount.value;
  }
};

// 获取订单信息
const fetchOrderInfo = async (trade_no: string) => {
  loadingOrder.value = true;
  try {
    console.log('[Checkout] Fetching order info for trade_no:', trade_no);

    // Prefer traditional order detail first.
    // Most pending orders are traditional; trying shared first can produce noisy 404/"No query results" responses.
    try {
      const resp = await apiClient.get(`/v1/user/order/detail`, {
        params: { trade_no },
      });
      const payload: any = (resp as any).data;
      if (!payload || payload.status !== 'success' || !payload.data) {
        throw new Error(payload?.message || 'Failed to load traditional order detail');
      }
      const data = payload.data;

      orderInfo.value = {
        ...data,
        plan_type: 'traditional',
      };
      finalAmount.value = orderInfo.value.total_amount;
      console.log('[Checkout] Loaded traditional order successfully');
      return;
    } catch (e) {
      // Fallback to shared order detail (V1 isolated shared flow)
    }

    const sharedResp = await apiClient.get(`/v1/user/share-order/detail`, {
      params: { trade_no },
    });
    const sharedPayload: any = (sharedResp as any).data;
    const sharedData = sharedPayload?.data ?? sharedPayload;

    orderInfo.value = {
      ...sharedData,
      plan_type: 'shared',
      shared_plan: sharedData.shared_plan,
    };
    finalAmount.value = orderInfo.value.total_amount;
    console.log('[Checkout] Loaded shared order successfully');
  } catch (error: any) {
    console.error('[Checkout] Failed to fetch order info:', error);
    throw error;
  } finally {
    loadingOrder.value = false;
  }
};

// Methods
async function fetchPaymentMethods(): Promise<void> {
  loadingPaymentMethods.value = true;
  try {
    // Old system payment methods endpoint
    const response = await apiClient.get(`/v1/user/order/getPaymentMethod`);
    const payload: any = (response as any).data;
    const methods = payload?.data ?? payload;

    paymentMethods.value = Array.isArray(methods) ? methods : [];
    
    // 如果没有支付方式，添加余额支付选项
    if (paymentMethods.value.length === 0) {
      paymentMethods.value = [{
        id: 0,
        name: '余额支付',
        payment: 'balance',
        icon: '',
        handling_fee_fixed: 0,
        handling_fee_percent: 0,
        show: 1,
        sort: 0,
      }];
    }
  } catch (err) {
    console.error('Failed to fetch payment methods:', err);
    // 即使获取失败，也提供余额支付选项
    paymentMethods.value = [{
      id: 0,
      name: '余额支付',
      payment: 'balance',
      icon: '',
      handling_fee_fixed: 0,
      handling_fee_percent: 0,
      show: 1,
      sort: 0,
    }];
  } finally {
    loadingPaymentMethods.value = false;
  }
}

async function handleCheckout(): Promise<void> {
  if (!selectedPlan.value || selectedPaymentMethod.value === null) return;

  // 如果没有 trade_no，说明是旧流程，需要先创建订单
  if (!tradeNo.value) {
    message.error('订单信息缺失，请返回重新选择');
    router.back();
    return;
  }

  // Confirm payment using Naive UI dialog
  dialog.info({
    title: t('checkout.payment.confirmTitle'),
    content: t('checkout.payment.confirmMessage', { 
      amount: (finalAmount.value / 100).toFixed(2) 
    }),
    positiveText: t('checkout.buttons.pay'),
    negativeText: t('checkout.buttons.cancel'),
    onPositiveClick: async () => {
      processing.value = true;
      try {
        console.log('[Checkout] Starting payment for trade_no:', tradeNo.value);
        console.log('[Checkout] Order type:', orderInfo.value?.plan_type);
        
        // 根据订单类型调用不同的支付接口
        const orderType = orderInfo.value?.plan_type || 'traditional';
        const paymentResult = await orderStore.checkout(
          tradeNo.value, 
          selectedPaymentMethod.value!,
          undefined,
          orderType
        );
        
        console.log('[Checkout] Payment result:', paymentResult);

        // Handle payment redirect or completion
        if (paymentResult.type === 1 && paymentResult.data) {
          // Redirect to payment gateway
          window.location.href = paymentResult.data as string;
        } else {
          // Payment completed without redirect (e.g., balance payment)
          message.success(t('checkout.payment.success'));
          
          // Redirect to payment callback with success status
          router.push({
            name: 'PaymentCallback',
            query: {
              trade_no: tradeNo.value,
              status: 'success'
            }
          });
        }
      } catch (err: any) {
        console.error('Checkout failed:', err);
        
        // Show detailed error message
        const errorMsg = err.response?.data?.message || err.message || t('checkout.payment.error');
        message.error(errorMsg);
      } finally {
        processing.value = false;
      }
    }
  });
}

// Lifecycle
onMounted(async () => {
  // 检查是否有 trade_no 参数（统一流程）
  const trade_no = route.query.trade_no as string;
  
  if (trade_no) {
    tradeNo.value = trade_no;
    try {
      await fetchOrderInfo(trade_no);
      await fetchPaymentMethods();
      calculateFinalAmount();
      return;
    } catch (error) {
      console.error('Failed to load order:', error);
      message.error('获取订单信息失败');
      router.push({ name: 'Orders' });
      return;
    }
  }
  
  // 传统流程：从 planStore 获取信息
  await fetchPaymentMethods();
  calculateFinalAmount();
  
  // Redirect if no plan selected (传统套餐流程)
  if (!selectedPlan.value) {
    message.warning('订单信息缺失，请返回重新选择');
    router.back();
  }
});
</script>
