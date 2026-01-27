<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('orders.updateOrder')"
    width="600px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="150px"
    >
      <el-form-item :label="t('orders.orderId')">
        <el-input v-model.number="formData.id" disabled />
      </el-form-item>

      <el-form-item :label="t('orders.totalAmount')" prop="total_amount">
        <el-input-number
          v-model="formData.total_amount"
          :min="0"
          :precision="2"
          :step="1"
        />
      </el-form-item>

      <el-form-item :label="t('orders.discountAmount')" prop="discount_amount">
        <el-input-number
          v-model="formData.discount_amount"
          :min="0"
          :precision="2"
          :step="1"
        />
      </el-form-item>

      <el-form-item :label="t('orders.balanceAmount')" prop="balance_amount">
        <el-input-number
          v-model="formData.balance_amount"
          :min="0"
          :precision="2"
          :step="1"
        />
      </el-form-item>

      <el-form-item :label="t('orders.refundAmount')" prop="refund_amount">
        <el-input-number
          v-model="formData.refund_amount"
          :min="0"
          :precision="2"
          :step="1"
        />
      </el-form-item>

      <el-form-item :label="t('common.status')" prop="status">
        <el-select v-model="formData.status" :placeholder="t('common.status')">
          <el-option :label="t('orders.pending')" :value="0" />
          <el-option :label="t('orders.processing')" :value="1" />
          <el-option :label="t('orders.cancelled')" :value="2" />
          <el-option :label="t('orders.completed')" :value="3" />
          <el-option :label="t('orders.discounted')" :value="4" />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
        <el-button
          type="primary"
          :loading="loading"
          @click="handleSubmit"
        >
          {{ t('common.save') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { useOrderStore } from '@/stores/order';
import type { Order } from '@xboard/shared';

interface Props {
  visible: boolean;
  order: Order | null;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'success'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useI18n();
const orderStore = useOrderStore();

const formRef = ref<FormInstance>();
const loading = ref(false);

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

const formData = reactive({
  id: 0,
  total_amount: 0,
  discount_amount: 0,
  balance_amount: 0,
  refund_amount: 0,
  status: 0,
});

const rules: FormRules = {
  total_amount: [
    {
      required: true,
      message: t('orders.totalAmount') + ' is required',
      trigger: 'blur',
    },
  ],
  status: [
    {
      required: true,
      message: t('common.status') + ' is required',
      trigger: 'change',
    },
  ],
};

// Watch for order changes
watch(
  () => props.order,
  (newOrder) => {
    if (newOrder) {
      formData.id = newOrder.id;
      formData.total_amount = newOrder.total_amount;
      formData.discount_amount = newOrder.discount_amount;
      formData.balance_amount = newOrder.balance_amount;
      formData.refund_amount = newOrder.refund_amount;
      formData.status = newOrder.status;
    }
  },
  { immediate: true, deep: true }
);

const handleClose = () => {
  dialogVisible.value = false;
  formRef.value?.resetFields();
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    loading.value = true;

    const updateData = {
      total_amount: formData.total_amount,
      discount_amount: formData.discount_amount,
      balance_amount: formData.balance_amount,
      refund_amount: formData.refund_amount,
      status: formData.status,
    };

    await orderStore.updateOrder(formData.id, updateData);
    
    ElMessage.success(t('orders.orderUpdated'));
    emit('success');
    handleClose();
  } catch (error: any) {
    ElMessage.error(error.message || t('orders.updateOrderFailed'));
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
