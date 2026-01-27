<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('orders.orderDetail')"
    width="800px"
    @close="handleClose"
  >
    <div v-loading="orderStore.loading" class="order-detail">
      <template v-if="orderStore.currentOrder">
        <!-- Order Information -->
        <el-descriptions :title="t('orders.orderDetail')" :column="2" border>
          <el-descriptions-item :label="t('orders.orderId')">
            {{ orderStore.currentOrder.id }}
          </el-descriptions-item>
          
          <el-descriptions-item :label="t('orders.tradeNo')">
            {{ orderStore.currentOrder.trade_no }}
          </el-descriptions-item>
          
          <el-descriptions-item :label="t('common.status')">
            <el-tag :type="getStatusType(orderStore.currentOrder.status)">
              {{ getStatusLabel(orderStore.currentOrder.status) }}
            </el-tag>
          </el-descriptions-item>
          
          <el-descriptions-item :label="t('orders.callbackNo')">
            {{ orderStore.currentOrder.callback_no || '-' }}
          </el-descriptions-item>
          
          <el-descriptions-item :label="t('common.createdAt')">
            {{ formatDate(orderStore.currentOrder.created_at) }}
          </el-descriptions-item>
          
          <el-descriptions-item :label="t('common.updatedAt')">
            {{ formatDate(orderStore.currentOrder.updated_at) }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- User Information -->
        <el-descriptions
          :title="t('orders.user')"
          :column="2"
          border
          class="mt-4"
        >
          <el-descriptions-item :label="t('orders.userId')">
            {{ orderStore.currentOrder.user_id }}
          </el-descriptions-item>
          
          <el-descriptions-item :label="t('orders.userEmail')">
            {{ orderStore.currentOrder.user?.email || '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- Plan Information -->
        <el-descriptions
          :title="t('orders.plan')"
          :column="2"
          border
          class="mt-4"
        >
          <el-descriptions-item :label="t('orders.planId')">
            {{ orderStore.currentOrder.plan_id }}
          </el-descriptions-item>
          
          <el-descriptions-item :label="t('orders.planName')">
            {{ orderStore.currentOrder.plan?.name || '-' }}
          </el-descriptions-item>
          
          <el-descriptions-item :label="t('orders.period')">
            {{ getPeriodLabel(orderStore.currentOrder.period) }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- Payment Information -->
        <el-descriptions
          :title="t('orders.paymentMethod')"
          :column="2"
          border
          class="mt-4"
        >
          <el-descriptions-item :label="t('orders.totalAmount')">
            <span class="amount-text">
              ¥{{ formatCurrency(orderStore.currentOrder.total_amount) }}
            </span>
          </el-descriptions-item>
          
          <el-descriptions-item :label="t('orders.discountAmount')">
            <span class="amount-text discount">
              -¥{{ formatCurrency(orderStore.currentOrder.discount_amount) }}
            </span>
          </el-descriptions-item>
          
          <el-descriptions-item :label="t('orders.balanceAmount')">
            <span class="amount-text">
              ¥{{ formatCurrency(orderStore.currentOrder.balance_amount) }}
            </span>
          </el-descriptions-item>
          
          <el-descriptions-item :label="t('orders.surplusAmount')">
            <span class="amount-text">
              ¥{{ formatCurrency(orderStore.currentOrder.surplus_amount) }}
            </span>
          </el-descriptions-item>
          
          <el-descriptions-item :label="t('orders.refundAmount')">
            <span class="amount-text refund">
              ¥{{ formatCurrency(orderStore.currentOrder.refund_amount) }}
            </span>
          </el-descriptions-item>
        </el-descriptions>

        <!-- Commission Information -->
        <el-descriptions
          :title="t('orders.commissionStatus')"
          :column="2"
          border
          class="mt-4"
        >
          <el-descriptions-item :label="t('orders.commissionStatus')">
            {{ orderStore.currentOrder.commission_status }}
          </el-descriptions-item>
          
          <el-descriptions-item :label="t('orders.commissionBalance')">
            <span class="amount-text">
              ¥{{ formatCurrency(orderStore.currentOrder.commission_balance) }}
            </span>
          </el-descriptions-item>
          
          <el-descriptions-item :label="t('orders.actualCommissionBalance')">
            <span class="amount-text">
              ¥{{ formatCurrency(orderStore.currentOrder.actual_commission_balance) }}
            </span>
          </el-descriptions-item>
        </el-descriptions>
      </template>

      <el-empty v-else :description="t('orders.noOrders')" />
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
        
        <el-button
          type="primary"
          @click="handleAssignOrder"
        >
          {{ t('orders.assignOrder') }}
        </el-button>
        
        <el-button
          type="primary"
          @click="handleUpdateOrder"
        >
          {{ t('orders.updateOrder') }}
        </el-button>
        
        <el-button
          v-if="orderStore.currentOrder?.status === 0"
          type="success"
          @click="handleConfirmPayment"
        >
          {{ t('orders.confirmPayment') }}
        </el-button>
        
        <el-button
          v-if="orderStore.currentOrder?.status === 0 || orderStore.currentOrder?.status === 1"
          type="danger"
          @click="handleCancelOrder"
        >
          {{ t('orders.cancelOrder') }}
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- Assign Order Modal -->
  <AssignOrderModal
    v-model:visible="assignModalVisible"
    :order-id="orderStore.currentOrder?.id || null"
    @success="handleOperationSuccess"
  />

  <!-- Update Order Modal -->
  <UpdateOrderModal
    v-model:visible="updateModalVisible"
    :order="orderStore.currentOrder"
    @success="handleOperationSuccess"
  />
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useOrderStore } from '@/stores/order';
import { formatDate, formatCurrency } from '@xboard/shared';
import AssignOrderModal from './AssignOrderModal.vue';
import UpdateOrderModal from './UpdateOrderModal.vue';

interface Props {
  visible: boolean;
  orderId: number | null;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useI18n();
const orderStore = useOrderStore();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

const assignModalVisible = ref(false);
const updateModalVisible = ref(false);

// Watch for order ID changes and fetch order details
watch(
  () => props.orderId,
  async (newId) => {
    if (newId && props.visible) {
      try {
        await orderStore.fetchOrderById(newId);
      } catch (error: any) {
        ElMessage.error(error.message || t('orders.fetchDetailFailed'));
      }
    }
  },
  { immediate: true }
);

// Methods
const handleClose = () => {
  dialogVisible.value = false;
  orderStore.currentOrder = null;
};

const handleConfirmPayment = async () => {
  if (!orderStore.currentOrder) return;

  try {
    await ElMessageBox.confirm(
      t('orders.confirmPaymentMessage', { tradeNo: orderStore.currentOrder.trade_no }),
      t('orders.confirmPaymentTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await orderStore.confirmPayment(orderStore.currentOrder.id);
    ElMessage.success(t('orders.paymentConfirmed'));
    handleClose();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || t('orders.confirmPaymentFailed'));
    }
  }
};

const handleCancelOrder = async () => {
  if (!orderStore.currentOrder) return;

  try {
    await ElMessageBox.confirm(
      t('orders.confirmCancelMessage', { tradeNo: orderStore.currentOrder.trade_no }),
      t('orders.confirmCancelTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await orderStore.cancelOrder(orderStore.currentOrder.id);
    ElMessage.success(t('orders.orderCancelled'));
    handleClose();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || t('orders.cancelOrderFailed'));
    }
  }
};

const handleAssignOrder = () => {
  assignModalVisible.value = true;
};

const handleUpdateOrder = () => {
  updateModalVisible.value = true;
};

const handleOperationSuccess = async () => {
  if (orderStore.currentOrder) {
    await orderStore.fetchOrderById(orderStore.currentOrder.id);
  }
};

const getStatusLabel = (status: number): string => {
  const statusMap: Record<number, string> = {
    0: t('orders.pending'),
    1: t('orders.processing'),
    2: t('orders.cancelled'),
    3: t('orders.completed'),
    4: t('orders.discounted'),
  };
  return statusMap[status] || '';
};

const getStatusType = (status: number): string => {
  const typeMap: Record<number, string> = {
    0: 'warning',
    1: 'info',
    2: 'danger',
    3: 'success',
    4: 'success',
  };
  return typeMap[status] || '';
};

const getPeriodLabel = (period: string): string => {
  const periodMap: Record<string, string> = {
    month_price: t('orders.monthly'),
    quarter_price: t('orders.quarterly'),
    half_year_price: t('orders.halfYearly'),
    year_price: t('orders.yearly'),
    two_year_price: t('orders.twoYears'),
    three_year_price: t('orders.threeYears'),
    onetime_price: t('orders.onetime'),
    reset_price: t('orders.reset'),
  };
  return periodMap[period] || period;
};
</script>

<style scoped>
.order-detail {
  min-height: 200px;
}

.mt-4 {
  margin-top: 24px;
}

.amount-text {
  font-weight: 600;
  font-size: 16px;
}

.amount-text.discount {
  color: var(--el-color-success);
}

.amount-text.refund {
  color: var(--el-color-danger);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
