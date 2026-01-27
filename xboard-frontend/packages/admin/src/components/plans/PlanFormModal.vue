<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? t('plans.editPlan') : t('plans.createPlan')"
    width="800px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="140px"
      label-position="left"
    >
      <!-- Basic Information -->
      <div class="form-section">
        <h3 class="section-title">{{ t('plans.basicInfo') }}</h3>
        
        <el-form-item :label="t('plans.planName')" prop="name">
          <el-input
            v-model="formData.name"
            :placeholder="t('plans.planNamePlaceholder')"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>

        <el-form-item :label="t('plans.description')" prop="content">
          <el-input
            v-model="formData.content"
            type="textarea"
            :rows="3"
            :placeholder="t('plans.descriptionPlaceholder')"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item :label="t('plans.visibility')" prop="show">
          <el-switch
            v-model="formData.show"
            :active-value="1"
            :inactive-value="0"
            :active-text="t('plans.visible')"
            :inactive-text="t('plans.hidden')"
          />
        </el-form-item>
      </div>

      <!-- Pricing Tiers -->
      <div class="form-section">
        <h3 class="section-title">{{ t('plans.pricingTiers') }}</h3>
        
        <div class="pricing-grid">
          <el-form-item :label="t('plans.monthly')" prop="month_price">
            <el-input-number
              v-model="formData.month_price"
              :min="0"
              :step="100"
              :precision="0"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item :label="t('plans.quarterly')" prop="quarter_price">
            <el-input-number
              v-model="formData.quarter_price"
              :min="0"
              :step="100"
              :precision="0"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item :label="t('plans.halfYear')" prop="half_year_price">
            <el-input-number
              v-model="formData.half_year_price"
              :min="0"
              :step="100"
              :precision="0"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item :label="t('plans.yearly')" prop="year_price">
            <el-input-number
              v-model="formData.year_price"
              :min="0"
              :step="100"
              :precision="0"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item :label="t('plans.twoYears')" prop="two_year_price">
            <el-input-number
              v-model="formData.two_year_price"
              :min="0"
              :step="100"
              :precision="0"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item :label="t('plans.threeYears')" prop="three_year_price">
            <el-input-number
              v-model="formData.three_year_price"
              :min="0"
              :step="100"
              :precision="0"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item :label="t('plans.onetime')" prop="onetime_price">
            <el-input-number
              v-model="formData.onetime_price"
              :min="0"
              :step="100"
              :precision="0"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item :label="t('plans.reset')" prop="reset_price">
            <el-input-number
              v-model="formData.reset_price"
              :min="0"
              :step="100"
              :precision="0"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>
        </div>
      </div>

      <!-- Traffic and Limits -->
      <div class="form-section">
        <h3 class="section-title">{{ t('plans.trafficAndLimits') }}</h3>
        
        <el-form-item :label="t('plans.trafficQuota')" prop="transfer_enable">
          <el-input-number
            v-model="formData.transfer_enable"
            :min="0"
            :step="1073741824"
            :precision="0"
            controls-position="right"
            style="width: 100%"
          />
          <span class="input-hint">{{ formatBytes(formData.transfer_enable) }}</span>
        </el-form-item>

        <el-form-item :label="t('plans.speedLimitLabel')" prop="speed_limit">
          <el-input-number
            v-model="formData.speed_limit"
            :min="0"
            :step="10"
            :precision="0"
            controls-position="right"
            :placeholder="t('plans.speedLimitPlaceholder')"
            style="width: 100%"
          />
          <span class="input-hint">{{ t('plans.speedLimitHint') }}</span>
        </el-form-item>

        <el-form-item :label="t('plans.deviceLimitLabel')" prop="device_limit">
          <el-input-number
            v-model="formData.device_limit"
            :min="0"
            :step="1"
            :precision="0"
            controls-position="right"
            :placeholder="t('plans.deviceLimitPlaceholder')"
            style="width: 100%"
          />
          <span class="input-hint">{{ t('plans.deviceLimitHint') }}</span>
        </el-form-item>
      </div>

      <!-- Server Groups -->
      <div class="form-section">
        <h3 class="section-title">{{ t('plans.serverGroups') }}</h3>
        
        <el-form-item :label="t('plans.serverGroupsLabel')" prop="group_id">
          <el-select
            v-model="formData.group_id"
            multiple
            :placeholder="t('plans.serverGroupsPlaceholder')"
            style="width: 100%"
            :loading="loadingGroups"
          >
            <el-option
              v-for="group in serverGroups"
              :key="group.id"
              :label="group.name"
              :value="group.id"
            />
          </el-select>
          <span class="input-hint">{{ t('plans.serverGroupsHint') }}</span>
        </el-form-item>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">{{ t('plans.cancel') }}</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ isEdit ? t('plans.update') : t('plans.create') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { usePlanStore } from '../../stores/plan';
import { formatBytes } from '@xboard/shared/utils';
import type { Plan } from '@xboard/shared/types';

// Props
interface Props {
  visible: boolean;
  plan?: Plan | null;
}

const props = withDefaults(defineProps<Props>(), {
  plan: null,
});

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean];
  success: [];
}>();

// Store
const planStore = usePlanStore();
const { t } = useI18n();

// State
const formRef = ref<FormInstance>();
const submitting = ref(false);
const loadingGroups = ref(false);
const serverGroups = ref<Array<{ id: number; name: string }>>([]);

// Form data
const formData = ref({
  name: '',
  content: '',
  month_price: 0,
  quarter_price: 0,
  half_year_price: 0,
  year_price: 0,
  two_year_price: 0,
  three_year_price: 0,
  onetime_price: 0,
  reset_price: 0,
  transfer_enable: 107374182400, // 100GB in bytes
  speed_limit: null as number | null,
  device_limit: null as number | null,
  group_id: [] as number[],
  show: 1,
});

// Validation rules
const rules: FormRules = {
  name: [
    { required: true, message: t('plans.nameRequired'), trigger: 'blur' },
    { min: 2, max: 50, message: t('plans.nameLength'), trigger: 'blur' },
  ],
  content: [
    { max: 500, message: t('plans.descriptionLength'), trigger: 'blur' },
  ],
  transfer_enable: [
    { required: true, message: t('plans.trafficRequired'), trigger: 'blur' },
    { type: 'number', min: 0, message: t('plans.trafficPositive'), trigger: 'blur' },
  ],
  group_id: [
    { required: true, message: t('plans.groupRequired'), trigger: 'change' },
    { type: 'array', min: 1, message: t('plans.groupMinOne'), trigger: 'change' },
  ],
};

// Computed
const isEdit = computed(() => !!props.plan);

// Methods
const resetForm = () => {
  formData.value = {
    name: '',
    content: '',
    month_price: 0,
    quarter_price: 0,
    half_year_price: 0,
    year_price: 0,
    two_year_price: 0,
    three_year_price: 0,
    onetime_price: 0,
    reset_price: 0,
    transfer_enable: 107374182400,
    speed_limit: null,
    device_limit: null,
    group_id: [],
    show: 1,
  };
  formRef.value?.clearValidate();
};

const loadFormData = () => {
  if (props.plan) {
    formData.value = {
      name: props.plan.name,
      content: props.plan.content,
      month_price: props.plan.month_price,
      quarter_price: props.plan.quarter_price,
      half_year_price: props.plan.half_year_price,
      year_price: props.plan.year_price,
      two_year_price: props.plan.two_year_price,
      three_year_price: props.plan.three_year_price,
      onetime_price: props.plan.onetime_price,
      reset_price: props.plan.reset_price,
      transfer_enable: props.plan.transfer_enable,
      speed_limit: props.plan.speed_limit,
      device_limit: props.plan.device_limit,
      group_id: [...props.plan.group_id],
      show: props.plan.show,
    };
  } else {
    resetForm();
  }
};

const loadServerGroups = async () => {
  loadingGroups.value = true;
  try {
    // TODO: Implement server group fetching when server management is implemented
    // For now, use mock data
    serverGroups.value = [
      { id: 1, name: 'US Servers' },
      { id: 2, name: 'EU Servers' },
      { id: 3, name: 'Asia Servers' },
    ];
  } catch (error) {
    ElMessage.error(t('plans.loadGroupsFailed'));
  } finally {
    loadingGroups.value = false;
  }
};

const handleClose = () => {
  emit('update:visible', false);
  resetForm();
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    
    submitting.value = true;

    // Convert null values to 0 for speed_limit and device_limit if needed
    const submitData = {
      ...formData.value,
      speed_limit: formData.value.speed_limit || null,
      device_limit: formData.value.device_limit || null,
    };

    if (isEdit.value && props.plan) {
      await planStore.updatePlan(props.plan.id, submitData);
      ElMessage.success(t('plans.planUpdated'));
    } else {
      await planStore.createPlan(submitData);
      ElMessage.success(t('plans.planCreated'));
    }

    emit('success');
    handleClose();
  } catch (error) {
    if (error !== false) { // Validation error returns false
      ElMessage.error(isEdit.value ? t('plans.updateFailed') : t('plans.createFailed'));
    }
  } finally {
    submitting.value = false;
  }
};

// Watch for visibility changes
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadFormData();
    loadServerGroups();
  }
});
</script>

<style scoped>
.form-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #ebeef5;
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0 16px;
}

.input-hint {
  display: block;
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-input-number) {
  width: 100%;
}

@media (max-width: 768px) {
  .pricing-grid {
    grid-template-columns: 1fr;
  }
}
</style>
