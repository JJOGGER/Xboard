<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('orders.assignOrder')"
    width="500px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
    >
      <el-form-item :label="t('orders.orderId')" prop="order_id">
        <el-input v-model.number="formData.order_id" disabled />
      </el-form-item>

      <el-form-item :label="t('orders.userId')" prop="user_id">
        <el-input
          v-model.number="formData.user_id"
          type="number"
          :placeholder="t('orders.userId')"
        />
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
          {{ t('common.confirm') }}
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

interface Props {
  visible: boolean;
  orderId: number | null;
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
  order_id: 0,
  user_id: 0,
});

const rules: FormRules = {
  user_id: [
    {
      required: true,
      message: t('orders.userId') + ' is required',
      trigger: 'blur',
    },
    {
      type: 'number',
      min: 1,
      message: 'User ID must be greater than 0',
      trigger: 'blur',
    },
  ],
};

// Watch for order ID changes
watch(
  () => props.orderId,
  (newId) => {
    if (newId) {
      formData.order_id = newId;
    }
  },
  { immediate: true }
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

    await orderStore.assignOrder(formData.order_id, formData.user_id);
    
    ElMessage.success(t('orders.orderAssigned'));
    emit('success');
    handleClose();
  } catch (error: any) {
    if (error.message) {
      ElMessage.error(error.message || t('orders.assignOrderFailed'));
    }
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
