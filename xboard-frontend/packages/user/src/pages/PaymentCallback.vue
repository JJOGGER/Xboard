<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-4">
    <div class="max-w-md w-full">
      <!-- Processing State -->
      <div v-if="status === 'processing'" class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {{ t('paymentCallback.processing.title') }}
        </h2>
        <p class="text-slate-600 dark:text-slate-400">
          {{ t('paymentCallback.processing.message') }}
        </p>
      </div>

      <!-- Success State -->
      <div v-else-if="status === 'success'" class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
          <svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {{ t('paymentCallback.success.title') }}
        </h2>
        <p class="text-slate-600 dark:text-slate-400 mb-6">
          {{ t('paymentCallback.success.message') }}
        </p>
        <div class="space-y-3">
          <button
            @click="router.push('/subscription')"
            class="w-full py-3 px-6 rounded-xl font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-all shadow-lg hover:shadow-xl"
          >
            {{ t('paymentCallback.success.viewSubscription') }}
          </button>
          <button
            @click="router.push('/orders')"
            class="w-full py-3 px-6 rounded-xl font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white transition-all"
          >
            {{ t('paymentCallback.success.viewOrders') }}
          </button>
        </div>
      </div>

      <!-- Failed State -->
      <div v-else-if="status === 'failed'" class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
          <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {{ t('paymentCallback.failed.title') }}
        </h2>
        <p class="text-slate-600 dark:text-slate-400 mb-2">
          {{ t('paymentCallback.failed.message') }}
        </p>
        <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400 mb-6">
          {{ errorMessage }}
        </p>
        <div class="space-y-3">
          <button
            @click="handleRetry"
            class="w-full py-3 px-6 rounded-xl font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-all shadow-lg hover:shadow-xl"
          >
            {{ t('paymentCallback.failed.retry') }}
          </button>
          <button
            @click="router.push('/orders')"
            class="w-full py-3 px-6 rounded-xl font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white transition-all"
          >
            {{ t('paymentCallback.failed.viewOrders') }}
          </button>
        </div>
      </div>

      <!-- Cancelled State -->
      <div v-else-if="status === 'cancelled'" class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-4">
          <svg class="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {{ t('paymentCallback.cancelled.title') }}
        </h2>
        <p class="text-slate-600 dark:text-slate-400 mb-6">
          {{ t('paymentCallback.cancelled.message') }}
        </p>
        <div class="space-y-3">
          <button
            @click="router.push('/plans')"
            class="w-full py-3 px-6 rounded-xl font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-all shadow-lg hover:shadow-xl"
          >
            {{ t('paymentCallback.cancelled.browsePlans') }}
          </button>
          <button
            @click="router.push('/orders')"
            class="w-full py-3 px-6 rounded-xl font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white transition-all"
          >
            {{ t('paymentCallback.cancelled.viewOrders') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useOrderStore } from '../stores/order';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const orderStore = useOrderStore();

// State
const status = ref<'processing' | 'success' | 'failed' | 'cancelled'>('processing');
const errorMessage = ref<string>('');
const orderId = ref<number | null>(null);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Methods
async function checkPaymentStatus(): Promise<void> {
  const tradeNo = route.query.trade_no as string;

  if (!tradeNo) {
    status.value = 'failed';
    errorMessage.value = 'Invalid payment callback';
    return;
  }

  try {
    // Poll order status from backend (non-balance payments may take time to confirm)
    // status mapping (backend): 0 pending, 1 processing, 2 cancelled, 3 completed
    const maxAttempts = 60 * 10; // ~30min
    const intervalMs = 3000;

    for (let i = 0; i < maxAttempts; i += 1) {
      const order = await orderStore.checkOrderStatus(tradeNo);
      const s = Number(order?.status);

      if (s === 3) {
        status.value = 'success';
        return;
      }
      if (s === 2) {
        status.value = 'cancelled';
        return;
      }

      // still pending/processing
      if (s === 0 || s === 1) {
        await sleep(intervalMs);
        continue;
      }

      status.value = 'failed';
      errorMessage.value = 'Unknown order status';
      return;
    }

    status.value = 'failed';
    errorMessage.value = 'Payment confirmation timeout';
  } catch (err: any) {
    console.error('Failed to check payment status:', err);
    status.value = 'failed';
    errorMessage.value = err.message || 'Failed to verify payment status';
  }
}

async function handleRetry(): Promise<void> {
  if (orderId.value) {
    router.push({
      name: 'Orders',
      query: { retry: orderId.value.toString() }
    });
  } else {
    router.push('/plans');
  }
}

// Lifecycle
onMounted(async () => {
  await checkPaymentStatus();
});
</script>
