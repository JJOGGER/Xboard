<template>
  <el-dialog
    v-model="visible"
    :title="$t('purchase.title')"
    width="500px"
    @close="handleClose"
  >
    <!-- Plan Information -->
    <div class="plan-info">
      <!-- Traditional Plan -->
      <div v-if="planType === 'traditional' && plan" class="plan-details">
        <h3 class="plan-name">{{ plan.name }}</h3>
        <div class="plan-specs">
          <div class="spec-item">
            <span class="label">{{ $t('plan.traffic') }}:</span>
            <span class="value">{{ formatBytes(plan.transfer_enable) }}</span>
          </div>
          <div class="spec-item">
            <span class="label">{{ $t('plan.price') }}:</span>
            <span class="value price">¥{{ getPlanPrice() }}</span>
          </div>
        </div>
      </div>

      <!-- Shared Plan -->
      <div v-else-if="planType === 'shared' && sharedPlan" class="plan-details">
        <h3 class="plan-name">{{ sharedPlan.name }}</h3>
        <div class="plan-specs">
          <div class="spec-item">
            <span class="label">{{ $t('sharedPlan.source') }}:</span>
            <span class="value">{{ sharedPlan.source }}</span>
          </div>
          <div class="spec-item">
            <span class="label">{{ $t('sharedPlan.price') }}:</span>
            <span class="value price">¥{{ sharedPlan.price }}</span>
          </div>
          <div class="spec-item">
            <span class="label">{{ $t('sharedPlan.availableSlots') }}:</span>
            <span class="value">{{ sharedPlan.available_slots }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Method Selection -->
    <div class="payment-section">
      <h4>{{ $t('payment.selectMethod') }}</h4>
      <el-select
        v-model="selectedPaymentMethod"
        :placeholder="$t('payment.selectMethodPlaceholder')"
        class="payment-select"
      >
        <el-option
          v-for="method in paymentMethods"
          :key="method.id"
          :label="method.name"
          :value="method.id"
        />
      </el-select>
    </div>

    <!-- Coupon Code -->
    <div class="coupon-section">
      <el-input
        v-model="couponCode"
        :placeholder="$t('purchase.couponPlaceholder')"
        clearable
      >
        <template #prepend>
          <span>{{ $t('purchase.coupon') }}</span>
        </template>
      </el-input>
    </div>

    <!-- Footer Actions -->
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">
          {{ $t('common.cancel') }}
        </el-button>
        <el-button
          type="primary"
          :loading="loading"
          :disabled="!selectedPaymentMethod"
          @click="handlePurchase"
        >
          {{ $t('purchase.confirm') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { useOrderStore } from '../../stores/order';

interface Plan {
  id: number;
  name: string;
  transfer_enable: number;
  month_price?: number;
  quarter_price?: number;
  half_year_price?: number;
  year_price?: number;
  two_year_price?: number;
  three_year_price?: number;
}

interface SharedPlan {
  id: number;
  name: string;
  source: string;
  price: number;
  available_slots: number;
}

interface PaymentMethod {
  id: number;
  name: string;
}

const props = defineProps<{
  modelValue: boolean;
  planType: 'traditional' | 'shared';
  plan?: Plan;
  sharedPlan?: SharedPlan;
  period?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'success', tradeNo: string): void;
}>();

const { t } = useI18n();
const orderStore = useOrderStore();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const selectedPaymentMethod = ref<number>();
const couponCode = ref('');
const loading = ref(false);
const paymentMethods = ref<PaymentMethod[]>([]);

// 加载支付方式
const loadPaymentMethods = async () => {
  try {
    paymentMethods.value = await orderStore.getPaymentMethods();
  } catch (error) {
    console.error('Failed to load payment methods:', error);
    ElMessage.error(t('payment.loadFailed'));
  }
};

// 监听对话框打开，加载支付方式
watch(visible, (newValue) => {
  if (newValue) {
    loadPaymentMethods();
  }
});

const getPlanPrice = () => {
  if (!props.plan || !props.period) return 0;
  return props.plan[props.period as keyof Plan] || 0;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const handlePurchase = async () => {
  try {
    loading.value = true;

    // Step 1: 创建订单
    const orderData = props.planType === 'shared'
      ? {
          shared_plan_id: props.sharedPlan!.id,
          plan_type: 'shared' as const,
          coupon_code: couponCode.value || undefined,
        }
      : {
          plan_id: props.plan!.id,
          period: props.period!,
          coupon_code: couponCode.value || undefined,
        };

    const orderResponse = await orderStore.createOrder(orderData);

    // Step 2: 发起支付
    const checkoutResponse = await orderStore.checkout(
      orderResponse.trade_no,
      selectedPaymentMethod.value!,
      undefined,
      props.planType
    );

    // Step 3: 处理支付响应
    if (checkoutResponse.type === -1) {
      // 免费订单，直接完成
      ElMessage.success(t('purchase.success'));
      emit('success', orderResponse.trade_no);
      handleClose();
    } else if (checkoutResponse.type === 0) {
      // 跳转支付页面
      window.location.href = checkoutResponse.data as string;
    } else if (checkoutResponse.type === 1) {
      // 显示二维码
      ElMessage.info(t('payment.showQRCode'));
      // TODO: 实现二维码显示逻辑
      // 可以在这里打开一个新的对话框显示二维码
    }
    
  } catch (error: any) {
    console.error('Purchase failed:', error);
    ElMessage.error(error.message || t('purchase.failed'));
  } finally {
    loading.value = false;
  }
};

const handleClose = () => {
  visible.value = false;
  selectedPaymentMethod.value = undefined;
  couponCode.value = '';
};
</script>

<style scoped lang="scss">
.plan-info {
  margin-bottom: 24px;
}

.plan-details {
  padding: 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.plan-name {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.plan-specs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.spec-item {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .label {
    color: var(--el-text-color-secondary);
    font-size: 14px;
  }

  .value {
    color: var(--el-text-color-primary);
    font-size: 14px;
    font-weight: 500;

    &.price {
      color: var(--el-color-primary);
      font-size: 20px;
      font-weight: 600;
    }
  }
}

.payment-section {
  margin-bottom: 16px;

  h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .payment-select {
    width: 100%;
  }
}

.coupon-section {
  margin-bottom: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
