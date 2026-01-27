<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? t('payment.editPayment') : t('payment.addPayment')"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="160px"
    >
      <el-form-item :label="t('payment.name')" prop="name">
        <el-input v-model="formData.name" :placeholder="t('payment.namePlaceholder')" />
      </el-form-item>
      
      <el-form-item :label="t('payment.gateway')" prop="payment">
        <el-select v-model="formData.payment" :placeholder="t('payment.gatewayPlaceholder')">
          <el-option label="Stripe" value="stripe" />
          <el-option label="Alipay" value="alipay" />
          <el-option label="PayPal" value="paypal" />
          <el-option label="WeChat Pay" value="wechat" />
          <el-option label="Custom" value="custom" />
        </el-select>
      </el-form-item>
      
      <el-form-item :label="t('payment.icon')">
        <el-input v-model="formData.icon" :placeholder="t('payment.iconPlaceholder')" />
      </el-form-item>
      
      <el-form-item :label="t('payment.notifyDomain')">
        <el-input v-model="formData.notify_domain" :placeholder="t('payment.notifyDomainPlaceholder')" />
      </el-form-item>
      
      <el-form-item :label="t('payment.handlingFeeFixed')">
        <el-input-number v-model="formData.handling_fee_fixed" :min="0" :precision="2" />
      </el-form-item>
      
      <el-form-item :label="t('payment.handlingFeePercent')">
        <el-input-number v-model="formData.handling_fee_percent" :min="0" :max="100" :precision="2" />
        <span class="ml-2 text-gray-500">%</span>
      </el-form-item>
      
      <el-form-item :label="t('payment.sort')">
        <el-input-number v-model="formData.sort" :min="0" />
      </el-form-item>
      
      <el-form-item :label="t('payment.show')">
        <el-switch v-model="showSwitch" />
      </el-form-item>
      
      <el-form-item :label="t('payment.config')">
        <el-input
          v-model="configJson"
          type="textarea"
          :rows="6"
          :placeholder="t('payment.configPlaceholder')"
        />
        <div class="text-xs text-gray-500 mt-1">{{ t('payment.configHint') }}</div>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">
        {{ t('common.save') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { usePaymentStore } from '../../stores/payment';
import type { PaymentMethod } from '@xboard/shared/src/types/payment';

const { t } = useI18n();
const paymentStore = usePaymentStore();

// Props
interface Props {
  modelValue: boolean;
  payment?: PaymentMethod | null;
}

const props = withDefaults(defineProps<Props>(), {
  payment: null,
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  success: [];
}>();

// State
const formRef = ref<FormInstance>();
const loading = ref(false);
const configJson = ref('{}');
const showSwitch = ref(true);

const formData = ref<Partial<PaymentMethod>>({
  name: '',
  payment: '',
  icon: null,
  config: {},
  notify_domain: null,
  handling_fee_fixed: null,
  handling_fee_percent: null,
  show: 1,
  sort: 0,
});

// Computed
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const isEdit = computed(() => !!props.payment);

// Rules
const rules: FormRules = {
  name: [
    { required: true, message: t('payment.nameRequired'), trigger: 'blur' },
  ],
  payment: [
    { required: true, message: t('payment.gatewayRequired'), trigger: 'change' },
  ],
};

// Methods
function resetForm() {
  formData.value = {
    name: '',
    payment: '',
    icon: null,
    config: {},
    notify_domain: null,
    handling_fee_fixed: null,
    handling_fee_percent: null,
    show: 1,
    sort: 0,
  };
  configJson.value = '{}';
  showSwitch.value = true;
  formRef.value?.clearValidate();
}

function loadPaymentData() {
  if (props.payment) {
    formData.value = { ...props.payment };
    configJson.value = JSON.stringify(props.payment.config || {}, null, 2);
    showSwitch.value = props.payment.show === 1;
  } else {
    resetForm();
  }
}

async function handleSubmit() {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    
    loading.value = true;
    try {
      // Parse config JSON
      let config = {};
      try {
        config = JSON.parse(configJson.value);
      } catch (error) {
        ElMessage.error(t('payment.invalidJson'));
        loading.value = false;
        return;
      }
      
      const data = {
        ...formData.value,
        config,
        show: showSwitch.value ? 1 : 0,
      };
      
      if (isEdit.value && props.payment) {
        await paymentStore.updatePayment(props.payment.id, data);
      } else {
        await paymentStore.createPayment(data);
      }
      
      emit('success');
      handleClose();
    } catch (error) {
      // Error handled by store
    } finally {
      loading.value = false;
    }
  });
}

function handleClose() {
  visible.value = false;
  resetForm();
}

// Watch
watch(() => props.modelValue, (value) => {
  if (value) {
    loadPaymentData();
  }
});
</script>

<style scoped lang="scss">
:deep(.el-input),
:deep(.el-select),
:deep(.el-textarea) {
  width: 100%;
}

:deep(.el-input-number) {
  width: 200px;
}
</style>
