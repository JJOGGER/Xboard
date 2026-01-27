<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? t('coupons.form.editTitle') : t('coupons.form.createTitle')"
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
      <el-form-item :label="t('coupons.form.code')" prop="code">
        <el-input
          v-model="form.code"
          :placeholder="t('coupons.form.codePlaceholder')"
          :disabled="isEdit"
        />
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
        <span class="form-hint">
          {{ form.type === 1 ? t('coupons.form.percentageHint') : t('coupons.form.fixedHint') }}
        </span>
      </el-form-item>

      <el-form-item :label="t('coupons.form.limitUse')">
        <el-input-number
          v-model="form.limit_use"
          :min="0"
          :placeholder="t('coupons.form.unlimitedPlaceholder')"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item :label="t('coupons.form.limitUseWithUser')">
        <el-input-number
          v-model="form.limit_use_with_user"
          :min="0"
          :placeholder="t('coupons.form.unlimitedPlaceholder')"
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

      <el-form-item :label="t('coupons.form.visibility')">
        <el-switch v-model="form.show" :active-value="1" :inactive-value="0" />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ t('common.save') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { useCouponStore } from '@/stores/coupon';
import type { Coupon } from '@xboard/shared/types';

interface Props {
  visible: boolean;
  coupon: Coupon | null;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'saved'): void;
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

const isEdit = computed(() => !!props.coupon);

// Form ref
const formRef = ref<FormInstance>();

// Form data
const form = reactive({
  code: '',
  name: '',
  type: 1,
  value: 0,
  limit_use: null as number | null,
  limit_use_with_user: null as number | null,
  limit_plan_ids: null as number[] | null,
  started_at: 0,
  ended_at: 0,
  show: 1,
});

const validityRange = ref<[Date, Date] | null>(null);

const submitting = ref(false);

// Form rules
const rules: FormRules = {
  code: [
    { required: true, message: t('coupons.validation.codeRequired'), trigger: 'blur' },
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

    if (isEdit.value && props.coupon) {
      await couponStore.updateCoupon(props.coupon.id, data);
      ElMessage.success(t('coupons.messages.updateSuccess'));
    } else {
      await couponStore.createCoupon(data);
      ElMessage.success(t('coupons.messages.createSuccess'));
    }

    emit('saved');
    handleClose();
  } catch (error: any) {
    if (error !== 'validation') {
      ElMessage.error(
        isEdit.value 
          ? t('coupons.messages.updateError') 
          : t('coupons.messages.createError')
      );
    }
  } finally {
    submitting.value = false;
  }
}

// Handle close
function handleClose() {
  dialogVisible.value = false;
  formRef.value?.resetFields();
  validityRange.value = null;
}

// Watch coupon changes
watch(
  () => props.coupon,
  (newCoupon) => {
    if (newCoupon) {
      Object.assign(form, {
        code: newCoupon.code,
        name: newCoupon.name,
        type: newCoupon.type,
        value: newCoupon.value,
        limit_use: newCoupon.limit_use,
        limit_use_with_user: newCoupon.limit_use_with_user,
        limit_plan_ids: newCoupon.limit_plan_ids,
        show: newCoupon.show,
      });
      validityRange.value = [
        new Date(newCoupon.started_at * 1000),
        new Date(newCoupon.ended_at * 1000),
      ];
    } else {
      formRef.value?.resetFields();
      validityRange.value = null;
    }
  },
  { immediate: true }
);
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
</style>
