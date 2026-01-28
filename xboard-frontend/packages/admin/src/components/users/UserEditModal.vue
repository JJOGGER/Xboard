<template>
  <el-dialog
    v-model="visible"
    :title="user ? `${t('users.editUser')} - ${user.email}` : t('users.editUser')"
    width="700px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      v-loading="loading"
      :model="form"
      :rules="rules"
      label-width="150px"
    >
      <el-tabs v-model="activeTab">
        <!-- Basic Info Tab -->
        <el-tab-pane :label="t('users.basicInfo')" name="basic">
          <el-form-item :label="t('users.email')" prop="email">
            <el-input v-model="form.email" disabled />
          </el-form-item>

          <el-form-item :label="t('users.plan')" prop="plan_id">
            <el-select v-model="form.plan_id" :placeholder="t('users.selectPlan')" clearable>
              <el-option
                v-for="plan in plans"
                :key="plan.id"
                :label="plan.name"
                :value="plan.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item :label="t('users.expiredAt')" prop="expired_at">
            <el-date-picker
              v-model="form.expired_at"
              type="datetime"
              :placeholder="t('users.selectExpiration')"
              value-format="x"
            />
          </el-form-item>

          <el-form-item :label="t('users.status')">
            <el-switch
              v-model="form.banned"
              :active-value="0"
              :inactive-value="1"
              :active-text="t('users.active')"
              :inactive-text="t('users.banned')"
            />
          </el-form-item>
        </el-tab-pane>

        <!-- Balance & Traffic Tab -->
        <el-tab-pane :label="t('users.balanceTraffic')" name="balance">
          <el-form-item :label="t('users.balanceAdjustment')">
            <el-input-number
              v-model="balanceAdjustment"
              :precision="2"
              :step="10"
              :placeholder="t('users.enterAmountPlaceholder')"
              :controls="false"
            />
            <el-button
              type="primary"
              class="ml-2"
              :disabled="balanceAdjustment === 0 || balanceAdjustment === null"
              @click="handleAdjustBalance"
            >
              {{ t('users.adjust') }}
            </el-button>
          </el-form-item>

          <el-form-item :label="t('users.currentBalance')">
            <span class="info-text">¥{{ (user?.balance || 0).toFixed(2) }}</span>
          </el-form-item>
        </el-tab-pane>

        <!-- Advanced Tab -->
        <el-tab-pane :label="t('users.advanced')" name="advanced">
          <el-form-item :label="t('users.subscriptionSecret')">
            <el-input
              :value="subscriptionSecret"
              disabled
              :placeholder="t('users.clickReset')"
            >
              <template #append>
                <el-button @click="handleResetSecret">{{ t('users.reset') }}</el-button>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item :label="t('users.referrerUserId')" prop="invite_user_id">
            <el-input-number
              v-model="form.invite_user_id"
              :min="0"
              :placeholder="t('users.enterReferrerId')"
            />
            <el-button
              type="primary"
              class="ml-2"
              @click="handleUpdateReferral"
            >
              {{ t('users.update') }}
            </el-button>
          </el-form-item>

          <el-form-item :label="t('users.commissionBalance')">
            <span class="info-text">¥{{ (user?.commission_balance || 0).toFixed(2) }}</span>
          </el-form-item>
        </el-tab-pane>
      </el-tabs>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">{{ t('users.cancel') }}</el-button>
      <el-button type="primary" :loading="loading" @click="handleSave">
        {{ t('users.saveChanges') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import type { User } from '@xboard/shared/types';
import { useUserStore } from '@/stores/user';
import { usePlanStore } from '@/stores/plan';
import { formatBytes, formatCurrency } from '@xboard/shared/utils';

const { t } = useI18n();

interface Props {
  modelValue: boolean;
  userId: number | null;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'updated'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const userStore = useUserStore();
const planStore = usePlanStore();

// State
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const activeTab = ref('basic');
const loading = ref(false);
const formRef = ref<FormInstance>();
const user = ref<User | null>(null);
const subscriptionSecret = ref('');

// Form data
const form = reactive({
  email: '',
  plan_id: null as number | null,
  expired_at: null as number | null,
  banned: 0,
  invite_user_id: null as number | null,
});

// Balance and traffic adjustments
const balanceAdjustment = ref<number | null>(null);
const trafficQuotaGB = ref(0);

// Computed
const plans = computed(() => planStore.plans);

// Validation rules
const rules = computed<FormRules>(() => ({
  email: [
    { required: true, message: t('users.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('users.invalidEmail'), trigger: 'blur' },
  ],
}));

// Methods
async function loadUser(): Promise<void> {
  if (!props.userId) return;

  loading.value = true;
  try {
    await userStore.fetchUserById(props.userId);
    user.value = userStore.currentUser;

    if (user.value) {
      form.email = user.value.email;
      form.plan_id = user.value.plan_id;
      form.expired_at = user.value.expired_at ? user.value.expired_at * 1000 : null;
      form.banned = user.value.banned;
      form.invite_user_id = user.value.invite_user_id;
      trafficQuotaGB.value = user.value.transfer_enable / (1024 * 1024 * 1024);
    }
  } catch (error: any) {
    ElMessage.error(error.message || t('users.loadUserFailed'));
  } finally {
    loading.value = false;
  }
}

async function handleSave(): Promise<void> {
  if (!formRef.value || !props.userId) return;

  try {
    await formRef.value.validate();

    loading.value = true;
    await userStore.updateUser(props.userId, {
      plan_id: form.plan_id,
      expired_at: form.expired_at ? Math.floor(form.expired_at / 1000) : null,
      banned: form.banned,
    });

    ElMessage.success(t('users.userUpdated'));
    await loadUser(); // Refresh user data
    emit('updated');
    handleClose();
  } catch (error: any) {
    if (error !== false) {
      ElMessage.error(error.message || t('users.updateFailed'));
    }
  } finally {
    loading.value = false;
  }
}

async function handleAdjustBalance(): Promise<void> {
  if (!props.userId || balanceAdjustment.value === 0 || balanceAdjustment.value === null) return;

  try {
    const action = balanceAdjustment.value > 0 ? t('users.add') : t('users.subtract');
    const direction = balanceAdjustment.value > 0 ? t('users.toBalance') : t('users.from');
    
    await ElMessageBox.confirm(
      t('users.confirmBalanceAdjustment', {
        action,
        amount: `¥${Math.abs(balanceAdjustment.value).toFixed(2)}`,
        direction
      }),
      t('users.confirmBalanceTitle'),
      {
        confirmButtonText: t('users.adjust'),
        cancelButtonText: t('users.cancel'),
        type: 'warning',
      }
    );

    loading.value = true;
    await userStore.adjustBalance(props.userId, balanceAdjustment.value);
    
    ElMessage.success(t('users.balanceAdjusted'));
    balanceAdjustment.value = null;
    await loadUser();
    emit('updated');
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || t('users.balanceAdjustFailed'));
    }
  } finally {
    loading.value = false;
  }
}

async function handleAdjustTraffic(): Promise<void> {
  if (!props.userId) return;

  try {
    await ElMessageBox.confirm(
      t('users.confirmTrafficAdjustment', { quota: trafficQuotaGB.value }),
      t('users.confirmTrafficTitle'),
      {
        confirmButtonText: t('users.adjust'),
        cancelButtonText: t('users.cancel'),
        type: 'warning',
      }
    );

    loading.value = true;
    const trafficBytes = trafficQuotaGB.value * 1024 * 1024 * 1024;
    await userStore.adjustTraffic(props.userId, trafficBytes);
    
    ElMessage.success(t('users.trafficUpdated'));
    await loadUser();
    emit('updated');
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || t('users.trafficAdjustFailed'));
    }
  } finally {
    loading.value = false;
  }
}

async function handleResetSecret(): Promise<void> {
  if (!props.userId) return;

  try {
    await ElMessageBox.confirm(
      t('users.confirmSecretReset'),
      t('users.confirmSecretTitle'),
      {
        confirmButtonText: t('users.reset'),
        cancelButtonText: t('users.cancel'),
        type: 'warning',
      }
    );

    loading.value = true;
    const newSecret = await userStore.resetSecret(props.userId);
    subscriptionSecret.value = newSecret;
    
    ElMessage.success(t('users.secretReset'));
    emit('updated');
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || t('users.secretResetFailed'));
    }
  } finally {
    loading.value = false;
  }
}

async function handleUpdateReferral(): Promise<void> {
  if (!props.userId) return;

  try {
    loading.value = true;
    await userStore.updateReferral(props.userId, form.invite_user_id);
    
    ElMessage.success(t('users.referralUpdated'));
    await loadUser();
    emit('updated');
  } catch (error: any) {
    ElMessage.error(error.message || t('users.referralUpdateFailed'));
  } finally {
    loading.value = false;
  }
}

function handleClose(): void {
  visible.value = false;
  activeTab.value = 'basic';
  formRef.value?.resetFields();
  balanceAdjustment.value = null;
  subscriptionSecret.value = '';
  user.value = null;
}

// Watch for modal open
watch(
  () => props.modelValue,
  async (newValue) => {
    if (newValue && props.userId) {
      // Load plans if not loaded
      if (planStore.plans.length === 0) {
        await planStore.fetchPlans();
      }
      loadUser();
    }
  },
  { immediate: true }
);
</script>

<style scoped lang="scss">
.info-text {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.traffic-info {
  line-height: 1.6;
}
</style>

