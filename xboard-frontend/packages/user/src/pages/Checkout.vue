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

          <!-- Coupon (MaClash-aligned: enter/verify at checkout) -->
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              {{ t('plans.coupon.title') }}
            </h2>

            <div v-if="tradeNo && canRecreateForBalance" class="mb-4 p-3 rounded-lg bg-slate-100/60 dark:bg-slate-900/40 text-sm text-slate-700 dark:text-slate-300">
              <div class="flex items-center justify-between gap-3">
                <div>
                  余额充足，但该订单未应用余额抵扣。
                </div>
                <button
                  class="px-3 py-1.5 rounded-lg font-semibold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
                  :disabled="couponChecking"
                  @click="recreateOrderToApplyBalance"
                >
                  使用余额重建
                </button>
              </div>
            </div>

            <div v-if="tradeNo" class="text-sm text-slate-600 dark:text-slate-400">
              <div v-if="orderInfo?.coupon_id" class="flex items-center justify-between">
                <span>{{ t('plans.coupon.applied') }}</span>
              </div>

              <div v-else class="space-y-3">
                <div class="flex gap-3">
                  <input
                    v-model="couponInput"
                    class="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    :placeholder="t('plans.coupon.placeholder')"
                  />
                  <button
                    class="px-4 py-2 rounded-lg font-semibold bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50"
                    :disabled="couponChecking || couponInput.trim().length === 0"
                    @click="recreateOrderWithCoupon"
                  >
                    <span v-if="couponChecking">{{ t('plans.coupon.validating') }}</span>
                    <span v-else>{{ t('plans.coupon.apply') }}</span>
                  </button>
                </div>

                <div v-if="couponError" class="text-sm text-red-600">
                  {{ couponError }}
                </div>
                <div v-else-if="couponInfo" class="text-sm text-green-600">
                  {{ t('plans.coupon.applied') }}
                </div>

                <div class="text-xs text-slate-500 dark:text-slate-400">
                  {{ t('plans.coupon.appliedMessage', { discount: `¥${(couponComputedDiscount / 100).toFixed(2)}` }) }}
                </div>
                <div class="text-xs text-slate-500 dark:text-slate-400">
                  {{ t('checkout.orderSummary.discount') }}: {{ couponInfo ? `-¥${(couponComputedDiscount / 100).toFixed(2)}` : '-' }}
                </div>
              </div>
            </div>

            <div v-else class="space-y-3">
              <div class="flex gap-3">
                <input
                  v-model="couponInput"
                  class="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  :placeholder="t('plans.coupon.placeholder')"
                />
                <button
                  class="px-4 py-2 rounded-lg font-semibold bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50"
                  :disabled="couponChecking || couponInput.trim().length === 0"
                  @click="checkCoupon"
                >
                  <span v-if="couponChecking">{{ t('plans.coupon.validating') }}</span>
                  <span v-else>{{ t('plans.coupon.apply') }}</span>
                </button>
              </div>

              <div v-if="couponError" class="text-sm text-red-600">
                {{ couponError }}
              </div>
              <div v-else-if="couponInfo" class="text-sm text-green-600">
                {{ t('plans.coupon.applied') }}
              </div>

              <div class="text-xs text-slate-500 dark:text-slate-400">
                {{ t('checkout.orderSummary.discount') }}: {{ couponInfo ? `-¥${(couponComputedDiscount / 100).toFixed(2)}` : '-' }}
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
            <div v-else-if="paymentMethods.length > 0 && finalAmount > 0" class="space-y-3">
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

            <div v-else-if="finalAmount === 0" class="text-sm text-slate-600 dark:text-slate-400">
              余额已全额抵扣，无需选择支付方式。
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
                <span>{{ trafficDisplayText }} {{ t('checkout.planFeatures.traffic') }}</span>
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
              :disabled="(finalAmount > 0 && selectedPaymentMethod === null) || processing"
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
import { useAuthStore } from '../stores/auth';
import { useSharedPlanStore } from '../stores/sharedPlan';
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
const authStore = useAuthStore();
const sharedPlanStore = useSharedPlanStore();

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
const balanceAmount = ref(0);
const surplusAmount = ref(0);

const pendingPlan = ref<any>(null);
const pendingPlanType = ref<'traditional' | 'shared'>('traditional');

const couponInput = ref('');
const couponInfo = ref<any>(null);
const couponChecking = ref(false);
const couponError = ref<string | null>(null);

const handlingFeeAmount = computed(() => {
  // MaClash: fee is calculated on baseAmount (after discount/balance/surplus), only when baseAmount>0.
  if (finalAmount.value <= 0) return 0;
  const method = paymentMethods.value.find((m: any) => Number(m?.id) === Number(selectedPaymentMethod.value));
  if (!method) return 0;
  const percent = Number((method as any).handling_fee_percent || 0);
  const fixed = Number((method as any).handling_fee_fixed || 0);
  const percentFee = percent > 0 ? Math.round(finalAmount.value * (percent / 100)) : 0;
  return fixed + percentFee;
});

const grandTotalAmount = computed(() => {
  // MaClash: final = baseAmount + handlingFee.
  return Math.max(0, finalAmount.value + handlingFeeAmount.value);
});

const UNLIMITED_GB_SENTINEL = 2147483647;
const GB_BYTES = 1024 * 1024 * 1024;

// Computed - 兼容两种模式
const selectedPlan = computed(() => {
  // 优先使用订单信息
  if (orderInfo.value) {
    return orderInfo.value.plan || orderInfo.value.shared_plan;
  }
  // Checkout 创建订单前：从 query 或 store 获取
  return pendingPlan.value || planStore.selectedPlan;
});

const canRecreateForBalance = computed(() => {
  // If order was created before backend balance deduction logic, balance_amount will be 0.
  // When user balance can cover the original price, MaClash would show payable=0.
  if (!tradeNo.value || !orderInfo.value) return false;
  const info: any = orderInfo.value;
  if (Number(info.status) !== 0) return false;
  if ((info.balance_amount || 0) > 0) return false;
  const base = originalPrice.value || 0;
  return base > 0 && (userBalance.value || 0) >= base;
});

const recreateOrderToApplyBalance = async () => {
  if (!tradeNo.value || !orderInfo.value) return;

  dialog.warning({
    title: '使用余额抵扣',
    content: '将取消当前订单并重新创建订单以应用余额抵扣，是否继续？',
    positiveText: '继续',
    negativeText: '取消',
    onPositiveClick: async () => {
      couponChecking.value = true;
      try {
        const info: any = orderInfo.value;
        const orderType = info.plan_type as 'traditional' | 'shared';

        if (orderType === 'shared') {
          await orderStore.cancelShareOrder(tradeNo.value);
        } else {
          await orderStore.cancelOrder(tradeNo.value);
        }

        const planId = orderType === 'shared' ? info.shared_plan_id : info.plan_id;
        const period = orderType === 'shared' ? legacyToSharedPeriod(info.period) : info.period;

        const result = await orderStore.createOrder({
          plan_type: orderType,
          plan_id: orderType === 'traditional' ? planId : undefined,
          shared_plan_id: orderType === 'shared' ? planId : undefined,
          period,
        });

        tradeNo.value = result.trade_no;
        await fetchOrderInfo(tradeNo.value);
        calculateFinalAmount();
        await fetchPaymentMethods();
      } catch (e: any) {
        message.error(e?.response?.data?.message || e?.message || '操作失败');
      } finally {
        couponChecking.value = false;
      }
    },
  });
};

const legacyToSharedPeriod = (legacy: string): string => {
  const mapping: Record<string, string> = {
    month_price: 'monthly',
    quarter_price: 'quarterly',
    half_year_price: 'half_yearly',
    year_price: 'yearly',
    two_year_price: 'two_yearly',
    three_year_price: 'three_yearly',
    onetime_price: 'onetime',
  };
  return mapping[legacy] || legacy;
};

const estimatedBalanceDeduction = computed(() => {
  if (tradeNo.value) return balanceAmount.value || 0;

  const base = originalPrice.value || 0;
  const afterDiscount = Math.max(0, base - (couponInfo.value ? couponComputedDiscount.value : 0));
  return Math.min(userBalance.value || 0, afterDiscount);
});

const selectedPeriod = computed(() => {
  if (orderInfo.value) {
    return orderInfo.value.period;
  }
  return (route.query.period as string) || planStore.selectedPeriod;
});

const toLegacyPeriodKey = (period: string): string => {
  const mapping: Record<string, string> = {
    month: 'month_price',
    quarter: 'quarter_price',
    half_year: 'half_year_price',
    year: 'year_price',
    two_year: 'two_year_price',
    three_year: 'three_year_price',
    onetime: 'onetime_price',
    reset: 'reset_price',
    // already legacy
    month_price: 'month_price',
    quarter_price: 'quarter_price',
    half_year_price: 'half_year_price',
    year_price: 'year_price',
    two_year_price: 'two_year_price',
    three_year_price: 'three_year_price',
    onetime_price: 'onetime_price',
    reset_price: 'reset_price',
  };

  return mapping[period] || period;
};

const recreateOrderWithCoupon = async () => {
  couponError.value = null;
  couponInfo.value = null;

  const code = couponInput.value.trim();
  if (!code) return;
  if (!tradeNo.value || !orderInfo.value) return;

  couponChecking.value = true;
  try {
    // Validate first
    await checkCoupon();
    if (!couponInfo.value) return;

    const info: any = orderInfo.value;
    const orderType = info.plan_type as 'traditional' | 'shared';

    // Cancel old pending order then create new one with coupon
    if (orderType === 'shared') {
      await orderStore.cancelShareOrder(tradeNo.value);
    } else {
      await orderStore.cancelOrder(tradeNo.value);
    }

    const planId = orderType === 'shared' ? info.shared_plan_id : info.plan_id;
    const period = orderType === 'shared' ? legacyToSharedPeriod(info.period) : info.period;

    const result = await orderStore.createOrder({
      plan_type: orderType,
      plan_id: orderType === 'traditional' ? planId : undefined,
      shared_plan_id: orderType === 'shared' ? planId : undefined,
      period,
      coupon_code: code,
    });

    tradeNo.value = result.trade_no;
    await fetchOrderInfo(tradeNo.value);
    calculateFinalAmount();
    await fetchPaymentMethods();
  } catch (e: any) {
    couponError.value = e?.response?.data?.message || e?.message || 'Coupon failed';
  } finally {
    couponChecking.value = false;
  }
};

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
    return 0;
  }
  // Pre-order shared plan: compute from pricing tiers (cents)
  if (pendingPlanType.value === 'shared' && pendingPlan.value) {
    const p: any = pendingPlan.value;
    const tiers = p.pricing_tiers || p.pricingTiers;
    const period = selectedPeriod.value;
    const tier = tiers?.[period];
    const price = tier?.price;
    return typeof price === 'number' ? price : 0;
  }

  return planStore.selectedPlanPrice;
});

const originalPrice = computed(() => {
  // For existing orders, compute original price from plan pricing (MaClash uses plan price, not payable total).
  if (orderInfo.value) {
    const info: any = orderInfo.value;
    const plan: any = info.plan || info.shared_plan;
    if (!plan) return info.total_amount || 0;

    if (info.plan_type === 'shared') {
      const sharedPeriod = legacyToSharedPeriod(info.period);
      const tiers = plan.pricing_tiers || {};
      const price = tiers?.[sharedPeriod]?.price;
      return typeof price === 'number' ? price : (info.total_amount || 0);
    }

    // Traditional order: original price can be approximated as payable + discount + balance + surplus
    // (Because order detail may not include full plan pricing fields).
    const discount = info.discount_amount || 0;
    const balance = info.balance_amount || 0;
    const surplus = info.surplus_amount || 0;
    return (info.total_amount || 0) + discount + balance + surplus;
  }

  // Pre-order flow
  return selectedPlanPrice.value || 0;
});

const couponCode = computed(() => planStore.couponCode);

const userBalance = computed(() => authStore.user?.balance || 0);

const couponComputedDiscount = computed(() => {
  // CouponService returns coupon info, but discount depends on order amount.
  // We display an estimation based on current selectedPlanPrice (cents).
  const c = couponInfo.value;
  if (!c) return 0;
  const base = originalPrice.value || 0;
  const type = Number(c.type);
  const value = Number(c.value);
  if (!base || !type || !value) return 0;
  if (type === 1) return Math.min(value, base);
  if (type === 2) return Math.min(Math.round(base * (value / 100)), base);
  return 0;
});

const checkCoupon = async () => {
  couponError.value = null;
  couponInfo.value = null;

  const code = couponInput.value.trim();
  if (!code) return;

  // When an order already exists, coupon check must use order context (plan_id/period).
  let planType: 'traditional' | 'shared' = pendingPlanType.value;
  let planId: number | null = null;
  let period: string | null = null;

  if (orderInfo.value && tradeNo.value) {
    const info: any = orderInfo.value;
    planType = (info.plan_type as any) || 'traditional';
    planId = planType === 'shared' ? Number(info.shared_plan_id || info.plan_id) : Number(info.plan_id);
    period = planType === 'shared' ? legacyToSharedPeriod(info.period) : String(info.period);
  } else {
    const plan: any = selectedPlan.value as any;
    if (!plan) {
      couponError.value = '订单信息缺失';
      return;
    }

    planId = Number(plan.id);
    period = planType === 'traditional'
      ? toLegacyPeriodKey(selectedPeriod.value)
      : String(selectedPeriod.value);
  }

  if (!planId || !period) {
    couponError.value = '订单信息缺失';
    return;
  }

  couponChecking.value = true;
  try {
    const resp = await apiClient.post('/v1/user/coupon/check', {
      code,
      plan_id: planId,
      period,
    });
    const payload: any = (resp as any).data;
    if (!payload || payload.status !== 'success') {
      throw new Error(payload?.message || 'Coupon failed');
    }
    couponInfo.value = payload.data;
    calculateFinalAmount();
  } catch (e: any) {
    couponError.value = e?.response?.data?.message || e?.message || 'Coupon failed';
  } finally {
    couponChecking.value = false;
  }
};

const trafficDisplayText = computed(() => {
  const plan: any = selectedPlan.value as any;
  if (!plan) return '-';

  const orderType = orderInfo.value?.plan_type;

  // Shared plan: prefer bytes fields; fallback to unlimited sentinel.
  if (orderType === 'shared') {
    const totalTraffic = plan.total_traffic ?? plan.totalTraffic ?? null;
    if (typeof totalTraffic === 'number' && totalTraffic > 0) {
      return formatBytes(totalTraffic);
    }

    const te = plan.transfer_enable ?? plan.transferEnable ?? null;
    if (typeof te === 'number' && te >= UNLIMITED_GB_SENTINEL) {
      return t('checkout.planFeatures.unlimited');
    }
  }

  // Traditional plan: backend plan.transfer_enable is typically GB count, but some endpoints may return bytes.
  const te = plan.transfer_enable ?? 0;
  const bytes = te > 0 && te < UNLIMITED_GB_SENTINEL ? (te < 10_000_000 ? te * GB_BYTES : te) : 0;
  return bytes > 0 ? formatBytes(bytes) : '-';
});

// Calculate final amount with discount
const calculateFinalAmount = () => {
  if (orderInfo.value) {
    // orderInfo.total_amount is the payable amount after applying discount/balance/etc.
    // Keep finalAmount aligned with backend payable amount.
    finalAmount.value = orderInfo.value.total_amount;
    discountAmount.value = orderInfo.value.discount_amount || 0;
    balanceAmount.value = orderInfo.value.balance_amount || 0;
    surplusAmount.value = orderInfo.value.surplus_amount || 0;
  } else {
    const basePrice = selectedPlanPrice.value;
    const estimatedDiscount = couponInfo.value ? couponComputedDiscount.value : 0;
    const afterDiscount = Math.max(0, basePrice - estimatedDiscount);
    const estimatedBalance = Math.min(userBalance.value || 0, afterDiscount);

    discountAmount.value = estimatedDiscount;
    balanceAmount.value = estimatedBalance;
    surplusAmount.value = 0;
    finalAmount.value = Math.max(0, afterDiscount - estimatedBalance);
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
      discountAmount.value = orderInfo.value.discount_amount || 0;
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
    discountAmount.value = orderInfo.value.discount_amount || 0;
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

    // Balance is a deduction (handled at order creation), not a payment method.
    // Filter out backend-returned balance method if any.
    paymentMethods.value = (Array.isArray(methods) ? methods : []).filter((m: any) => Number(m?.id) !== 0);

    if (selectedPaymentMethod.value === null && paymentMethods.value.length > 0 && finalAmount.value > 0) {
      selectedPaymentMethod.value = (paymentMethods.value[0] as any).id ?? null;
    }
  } catch (err) {
    console.error('Failed to fetch payment methods:', err);
    paymentMethods.value = [];
  } finally {
    loadingPaymentMethods.value = false;
  }
}

async function handleCheckout(): Promise<void> {
  if (!selectedPlan.value) return;
  if (finalAmount.value > 0 && selectedPaymentMethod.value === null) return;

  processing.value = true;
  try {
    // If no trade_no, create order here (MaClash-aligned: coupon input happens at checkout).
    if (!tradeNo.value) {
      const plan: any = selectedPlan.value as any;
      const period = pendingPlanType.value === 'traditional'
        ? toLegacyPeriodKey(selectedPeriod.value)
        : selectedPeriod.value;
      const coupon = couponInfo.value ? couponInput.value.trim() : '';

      try {
        const result = await orderStore.createOrder({
          plan_type: pendingPlanType.value,
          plan_id: pendingPlanType.value === 'traditional' ? plan.id : undefined,
          shared_plan_id: pendingPlanType.value === 'shared' ? plan.id : undefined,
          period,
          coupon_code: coupon.length > 0 ? coupon : undefined,
        });

        tradeNo.value = result.trade_no;
        await fetchOrderInfo(tradeNo.value);
        calculateFinalAmount();
        await fetchPaymentMethods();
      } catch (err: any) {
        const errorData = err?.response?.data;
        if (errorData?.has_pending_order) {
          const pendingOrder = errorData.pending_order;
          dialog.warning({
            title: '有未完成的订单',
            content: `您有一个未支付的订单 ${pendingOrder.trade_no}。请选择继续支付或取消订单。`,
            positiveText: '去支付',
            negativeText: '取消订单',
            onPositiveClick: () => {
              router.push({ name: 'Checkout', query: { trade_no: pendingOrder.trade_no } });
            },
            onNegativeClick: async () => {
              try {
                await orderStore.cancelShareOrder(pendingOrder.trade_no);
                message.success('订单已取消，请重新提交');
              } catch (cancelErr: any) {
                message.error(cancelErr?.message || '取消订单失败');
              }
            },
          });
          return;
        }

        throw err;
      }
    }

    console.log('[Checkout] Starting payment for trade_no:', tradeNo.value);
    console.log('[Checkout] Order type:', orderInfo.value?.plan_type);
    
    // 根据订单类型调用不同的支付接口
    const orderType = orderInfo.value?.plan_type || 'traditional';
    const methodId = finalAmount.value === 0 ? 0 : selectedPaymentMethod.value!;
    const paymentResult = await orderStore.checkout(
      tradeNo.value, 
      methodId,
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
onMounted(async () => {
  // 检查是否有 trade_no 参数（统一流程）
  const trade_no = route.query.trade_no as string;
  const sharedPlanId = route.query.shared_plan_id ? Number(route.query.shared_plan_id) : null;
  const planId = route.query.plan_id ? Number(route.query.plan_id) : null;

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

  // Preload shared plan when coming from SharedPlans page without creating an order.
  if (sharedPlanId) {
    pendingPlanType.value = 'shared';
    if (sharedPlanStore.availablePlans.length === 0) {
      await sharedPlanStore.fetchAvailablePlans();
    }
    pendingPlan.value = sharedPlanStore.availablePlans.find((p: any) => Number(p.id) === sharedPlanId) || null;
  }

  // Preload traditional plan when coming from Plans page without creating an order.
  if (planId) {
    pendingPlanType.value = 'traditional';
    try {
      const resp = await apiClient.get('/v1/user/plan/fetch', { params: { id: planId } });
      const payload: any = (resp as any).data;
      pendingPlan.value = payload?.data ?? payload;
    } catch (e) {
      pendingPlan.value = null;
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
