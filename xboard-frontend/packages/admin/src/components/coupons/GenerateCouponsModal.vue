<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('coupons.generate.title')"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="140px"
      @submit.prevent="handleSubmit"
    >
      <el-form-item :label="t('coupons.generate.count')" prop="generate_count">
        <el-input-number
          v-model="form.generate_count"
          :min="1"
          :max="100"
          style="width: 100%"
        />
        <span class="form-hint">{{ t('coupons.generate.countHint') }}</span>
      </el-form-item>

      <el-form-item :label="t('coupons.form.name')" prop="name">
        <el-input
          v-model="form.name"
          :placeholder="t('coupons.form.namePlaceholder')"
        />
      </el-form-item>

      <el-form-item :label="t('coupons.form.type')" prop="type">
        <el-radio-group v-model="form.type">
          <el-radio :value="1">{{ t('coupons.type.percentage') }}</el-radio>
          <el-radio :value="2">{{ t('coupons.type.fixed') }}</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item :label="t('coupons.form.value')" prop="value">
        <el-input-number
          v-model="form.value"
          :min="0"
          :max="form.type === 1 ? 100 : undefined"
          :precision="form.type === 1 ? 0 : 2"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item :label="t('coupons.form.limitUse')">
        <el-input-number
          v-model="form.limit_use"
          :min="0"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item :label="t('coupons.form.validity')" prop="validity">
        <el-date-picker
          v-model="validityRange"
          type="datetimerange"
          :start-placeholder="t('coupons.form.startDate')"
          :end-placeholder="t('coupons.form.endDate')"
          style="width: 100%"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ t('coupons.generate.generate') }}
        </el-button>
      </div>
    </template>

    <!-- Generated Codes Dialog -->
    <el-dialog
      v-model="codesVisible"
      :title="t('coupons.generate.generatedCodes')"
      width="500px"
    >
      <div class="generated-codes">
        <el-alert
          :title="t('coupons.generate.successMessage', { count: generatedCodes.length })"
          type="success"
          :closable="false"
          style="margin-bottom: 16px"
        />
        <el-input
          v-model="codesText"
          type="textarea"
          :rows="10"
          readonly
        />
      </div>
      <template #footer>
        <el-button type="primary" @click="handleCopyCodes">
          {{ t('coupons.generate.copyCodes') }}
        </el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import Clipboard from 'clipboard';
import { useCouponStore } from '@/stores/coupon';

interface Props {
  visible: boolean;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'generated'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useI18n();
const couponStore = useCouponStore();

// Dialog visibility
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

// Form ref
const formRef = ref<FormInstance>();

// Form data
const form = reactive({
  generate_count: 10,
  name: '',
  type: 1,
  value: 0,
  limit_use: null as number | null,
  limit_use_with_user: null as number | null,
  limit_plan_ids: null as number[] | null,
  started_at: 0,
  ended_at: 0,
});

const validityRange = ref<[Date, Date] | null>(null);
const submitting = ref(false);

// Generated codes
const codesVisible = ref(false);
const generatedCodes = ref<string[]>([]);
const codesText = computed(() => generatedCodes.value.join('\n'));

// Form rules
const rules: FormRules = {
  generate_count: [
    { required: true, message: t('coupons.validation.countRequired'), trigger: 'blur' },
  ],
  name: [
    { required: true, message: t('coupons.validation.nameRequired'), trigger: 'blur' },
  ],
  type: [
    { required: true, message: t('coupons.validation.typeRequired'), trigger: 'change' },
  ],
  value: [
    { required: true, message: t('coupons.validation.valueRequired'), trigger: 'blur' },
  ],
  validity: [
    { required: true, message: t('coupons.validation.validityRequired'), trigger: 'change' },
  ],
};

// Handle submit
async function handleSubmit() {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();

    if (!validityRange.value) {
      ElMessage.warning(t('coupons.validation.validityRequired'));
      return;
    }

    submitting.value = true;

    const data = {
      ...form,
      started_at: Math.floor(validityRange.value[0].getTime() / 1000),
      ended_at: Math.floor(validityRange.value[1].getTime() / 1000),
    };

    const codes = await couponStore.generateCoupons(data);
    generatedCodes.value = codes;
    codesVisible.value = true;

    emit('generated');
    handleClose();
  } catch (error: any) {
    if (error !== 'validation') {
      ElMessage.error(t('coupons.messages.generateError'));
    }
  } finally {
    submitting.value = false;
  }
}

// Handle copy codes
function handleCopyCodes() {
  const clipboard = new Clipboard('.copy-button', {
    text: () => codesText.value,
  });

  clipboard.on('success', () => {
    ElMessage.success(t('coupons.generate.copySuccess'));
    clipboard.destroy();
  });

  clipboard.on('error', () => {
    ElMessage.error(t('coupons.generate.copyError'));
    clipboard.destroy();
  });

  // Trigger click
  const button = document.createElement('button');
  button.className = 'copy-button';
  document.body.appendChild(button);
  button.click();
  document.body.removeChild(button);
}

// Handle close
function handleClose() {
  dialogVisible.value = false;
  formRef.value?.resetFields();
  validityRange.value = null;
}
</script>

<style scoped lang="scss">
.form-hint {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.generated-codes {
  .el-textarea {
    :deep(textarea) {
      font-family: monospace;
    }
  }
}
</style>
