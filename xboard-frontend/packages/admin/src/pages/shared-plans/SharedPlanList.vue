<template>
  <div class="shared-plan-list-container">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('sharedPlans.title') }}</h1>
        <p class="page-description">{{ t('sharedPlans.description') }}</p>
      </div>
      <el-button type="primary" @click="handleImport">
        <el-icon><Plus /></el-icon>
        {{ t('sharedPlans.importSubscription') }}
      </el-button>
    </div>

    <!-- Filters -->
    <el-card class="filter-card">
      <el-form :inline="true">
        <el-form-item :label="t('sharedPlans.syncStatus')">
          <el-select
            v-model="filters.sync_status"
            :placeholder="t('common.select')"
            clearable
            @change="handleFilterChange"
            style="width: 150px"
          >
            <el-option :label="t('sharedPlans.active')" value="active" />
            <el-option :label="t('sharedPlans.failed')" value="failed" />
            <el-option :label="t('sharedPlans.expired')" value="expired" />
          </el-select>
        </el-form-item>
        
        <el-form-item :label="t('sharedPlans.filterByTag')">
          <el-select
            v-model="filters.tag"
            :placeholder="t('sharedPlans.allTags')"
            clearable
            @change="handleFilterChange"
            style="width: 150px"
          >
            <el-option :label="t('sharedPlans.allTags')" value="" />
            <el-option
              v-for="tag in availableTags"
              :key="tag"
              :label="tag"
              :value="tag"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item>
          <el-button @click="handleRefresh">
            <el-icon><Refresh /></el-icon>
            {{ t('common.refresh') }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="3" animated />
    </div>

    <!-- Error State -->
    <el-alert
      v-else-if="error"
      type="error"
      :title="error"
      :closable="false"
      show-icon
      class="error-alert"
    />

    <!-- Plan Cards -->
    <div v-else-if="plans.length > 0" class="plans-grid">
      <el-card
        v-for="plan in plans"
        :key="plan.id"
        class="plan-card"
        :class="{ 'plan-failed': plan.sync_status === 'failed', 'plan-expired': plan.sync_status === 'expired' }"
      >
        <!-- Plan Header -->
        <div class="plan-header">
          <div class="plan-title-section">
            <h3 class="plan-name">{{ plan.name }}</h3>
            <el-tag
              :type="getStatusType(plan.sync_status)"
              size="small"
            >
              {{ t(`sharedPlans.${plan.sync_status}`) }}
            </el-tag>
          </div>
          
          <div class="plan-actions">
            <el-tooltip :content="t('sharedPlans.viewDetails')">
              <el-button
                type="primary"
                size="small"
                circle
                @click="handleViewDetails(plan)"
              >
                <el-icon><View /></el-icon>
              </el-button>
            </el-tooltip>
            
            <el-tooltip :content="t('sharedPlans.sync')">
              <el-button
                type="success"
                size="small"
                circle
                @click="handleSync(plan)"
              >
                <el-icon><Refresh /></el-icon>
              </el-button>
            </el-tooltip>
            
            <el-tooltip :content="t('sharedPlans.edit')">
              <el-button
                type="warning"
                size="small"
                circle
                @click="handleEdit(plan)"
              >
                <el-icon><Edit /></el-icon>
              </el-button>
            </el-tooltip>
            
            <el-tooltip :content="t('sharedPlans.delete')">
              <el-button
                type="danger"
                size="small"
                circle
                @click="handleDelete(plan)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </div>

        <!-- Plan Content -->
        <div class="plan-content">
          <p v-if="plan.description" class="plan-description">{{ plan.description }}</p>
          
          <!-- Tags Section -->
          <div v-if="plan.tags && plan.tags.length > 0" class="tags-section">
            <el-tag
              v-for="tag in plan.tags"
              :key="tag"
              :type="getTagType(tag)"
              size="small"
              class="tag-badge"
            >
              {{ tag }}
            </el-tag>
          </div>
          
          <!-- Server Group Section -->
          <div v-if="plan.group" class="group-section">
            <el-icon class="group-icon"><Grid /></el-icon>
            <span class="group-label">{{ t('sharedPlans.serverGroup') }}:</span>
            <span class="group-name">{{ plan.group.name }}</span>
            <span class="group-servers">({{ plan.group.server_count }} {{ t('sharedPlans.servers') }})</span>
          </div>
          
          <!-- Stats Grid -->
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-label">{{ t('sharedPlans.format') }}</div>
              <div class="stat-value">
                <el-tag size="small">{{ plan.subscription_format.toUpperCase() }}</el-tag>
              </div>
            </div>
            
            <div class="stat-item">
              <div class="stat-label">{{ t('sharedPlans.nodesCountLabel') }}</div>
              <div class="stat-value">{{ plan.nodes_count }}</div>
            </div>
          </div>

          <!-- Pricing Section -->
          <div v-if="plan.prices" class="pricing-section">
            <div class="pricing-label">{{ t('sharedPlans.pricing') }}:</div>
            <div class="pricing-items">
              <span
                v-for="(price, period) in plan.prices"
                :key="period"
                v-show="price && price > 0"
                class="pricing-badge"
              >
                {{ getPeriodLabel(period) }}: ¥{{ (price / 100).toFixed(2) }}
              </span>
            </div>
          </div>

          <!-- Slot Usage -->
          <div class="slot-section">
            <div class="slot-header">
              <span class="slot-label">{{ t('sharedPlans.slots') }}</span>
              <span class="slot-usage" :class="{ 'slot-full': plan.used_slots >= plan.max_slots }">
                {{ plan.used_slots }} / {{ plan.max_slots }}
              </span>
            </div>
            <el-progress
              :percentage="(plan.used_slots / plan.max_slots) * 100"
              :status="plan.used_slots >= plan.max_slots ? 'exception' : 'success'"
              :show-text="false"
            />
            <div class="slot-status">
              <span v-if="plan.used_slots >= plan.max_slots" class="status-full">
                {{ t('sharedPlans.full') }}
              </span>
              <span v-else class="status-available">
                {{ plan.max_slots - plan.used_slots }} {{ t('sharedPlans.available') }}
              </span>
            </div>
          </div>

          <!-- Traffic Info -->
          <div v-if="plan.total_traffic" class="traffic-section">
            <div class="traffic-item">
              <span class="traffic-label">{{ t('sharedPlans.totalTrafficLabel') }}:</span>
              <span class="traffic-value">{{ formatBytes(plan.total_traffic) }}</span>
            </div>
            <div v-if="plan.used_traffic" class="traffic-item">
              <span class="traffic-label">{{ t('sharedPlans.usedTrafficLabel') }}:</span>
              <span class="traffic-value">{{ formatBytes(plan.used_traffic) }}</span>
            </div>
          </div>

          <!-- Last Sync -->
          <div class="sync-info">
            <el-icon><Clock /></el-icon>
            <span>{{ t('sharedPlans.lastSync') }}: {{ formatDate(plan.last_sync_at) }}</span>
          </div>
        </div>
      </el-card>
    </div>

    <!-- Empty State -->
    <el-empty
      v-else
      :description="t('sharedPlans.noPlan')"
    >
      <el-button type="primary" @click="handleImport">
        {{ t('sharedPlans.createFirst') }}
      </el-button>
    </el-empty>

    <!-- Edit Modal -->
    <el-dialog
      v-model="editDialogVisible"
      :title="t('sharedPlans.editPlan')"
      width="800px"
      :show-close="!editLoading"
      :close-on-click-modal="!editLoading"
      :close-on-press-escape="!editLoading"
      :destroy-on-close="true"
      @closed="resetEditDialog"
    >
      <el-form
        v-if="selectedPlan"
        :model="editForm"
        :rules="editRules"
        ref="editFormRef"
        label-position="top"
      >
        <el-form-item :label="t('sharedPlans.planName')" prop="name">
          <el-input v-model="editForm.name" />
        </el-form-item>

        <el-form-item :label="t('sharedPlans.planDescription')" prop="description">
          <el-input v-model="editForm.description" type="textarea" :rows="3" />
        </el-form-item>

        <el-form-item :label="t('sharedPlans.maxSlots')" prop="max_slots">
          <el-input-number
            v-model="editForm.max_slots"
            :min="selectedPlan.used_slots"
            :max="1000"
            style="width: 100%"
          />
        </el-form-item>

        <!-- 价格设置 -->
        <div class="pricing-section">
          <div class="pricing-header">
            <h4>{{ t('sharedPlans.pricingTiers') }}</h4>
            <div class="pricing-actions">
              <el-input
                v-model.number="editForm.base_price"
                :placeholder="t('sharedPlans.basePrice')"
                style="width: 200px; margin-right: 8px"
                @input="handleBasePriceInput"
                @mousedown.left="handleSelectAll"
              >
                <template #prefix>¥</template>
              </el-input>
              <el-button size="small" @click="calculatePricesFromBase">
                {{ t('sharedPlans.autoCalculate') }}
              </el-button>
              <el-button size="small" @click="clearAllPrices">
                {{ t('common.clear') }}
              </el-button>
            </div>
          </div>

          <div class="pricing-grid">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item :label="`${t('sharedPlans.monthly')} (${t('sharedPlans.everyMonth')})`">
                  <el-input-number
                    v-model="editForm.prices.monthly"
                    :min="0"
                    :step="1"
                    :precision="2"
                    controls-position="right"
                    style="width: 100%"
                    @mousedown.left="handleSelectAll"
                  />
                  <div class="form-hint">30 {{ t('sharedPlans.days') }}</div>
                </el-form-item>
              </el-col>
              
              <el-col :span="8">
                <el-form-item :label="`${t('sharedPlans.quarterly')} (3${t('sharedPlans.months')})`">
                  <el-input-number
                    v-model="editForm.prices.quarterly"
                    :min="0"
                    :step="1"
                    :precision="2"
                    controls-position="right"
                    style="width: 100%"
                    @mousedown.left="handleSelectAll"
                  />
                  <div class="form-hint">90 {{ t('sharedPlans.days') }}</div>
                </el-form-item>
              </el-col>
              
              <el-col :span="8">
                <el-form-item :label="`${t('sharedPlans.halfYearly')} (6${t('sharedPlans.months')})`">
                  <el-input-number
                    v-model="editForm.prices.half_yearly"
                    :min="0"
                    :step="1"
                    :precision="2"
                    controls-position="right"
                    style="width: 100%"
                    @mousedown.left="handleSelectAll"
                  />
                  <div class="form-hint">180 {{ t('sharedPlans.days') }}</div>
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item :label="`${t('sharedPlans.yearly')} (12${t('sharedPlans.months')})`">
                  <el-input-number
                    v-model="editForm.prices.yearly"
                    :min="0"
                    :step="1"
                    :precision="2"
                    controls-position="right"
                    style="width: 100%"
                    @mousedown.left="handleSelectAll"
                  />
                  <div class="form-hint">365 {{ t('sharedPlans.days') }}</div>
                </el-form-item>
              </el-col>
              
              <el-col :span="8">
                <el-form-item :label="`${t('sharedPlans.twoYearly')} (24${t('sharedPlans.months')})`">
                  <el-input-number
                    v-model="editForm.prices.two_yearly"
                    :min="0"
                    :step="1"
                    :precision="2"
                    controls-position="right"
                    style="width: 100%"
                    @mousedown.left="handleSelectAll"
                  />
                  <div class="form-hint">730 {{ t('sharedPlans.days') }}</div>
                </el-form-item>
              </el-col>
              
              <el-col :span="8">
                <el-form-item :label="`${t('sharedPlans.threeYearly')} (36${t('sharedPlans.months')})`">
                  <el-input-number
                    v-model="editForm.prices.three_yearly"
                    :min="0"
                    :step="1"
                    :precision="2"
                    controls-position="right"
                    style="width: 100%"
                    @mousedown.left="handleSelectAll"
                  />
                  <div class="form-hint">1095 {{ t('sharedPlans.days') }}</div>
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item :label="t('sharedPlans.onetime')">
                  <el-input-number
                    v-model="editForm.prices.onetime"
                    :min="0"
                    :step="1"
                    :precision="2"
                    controls-position="right"
                    style="width: 100%"
                    @mousedown.left="handleSelectAll"
                  />
                  <div class="form-hint">{{ t('sharedPlans.permanent') }}</div>
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </div>
      </el-form>

      <template #footer>
        <el-button :disabled="editLoading" @click="handleCancelEdit">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="editLoading" @click="handleUpdatePlan">
          {{ t('common.save') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import {
  Plus,
  View,
  Edit,
  Delete,
  Refresh,
  Clock,
  Grid,
} from '@element-plus/icons-vue';
import { useSharedPlanStore } from '../../stores/sharedPlan';
import type { SharedPlan } from '@xboard/shared/api/sharedPlan';

const { t } = useI18n();
const router = useRouter();
const sharedPlanStore = useSharedPlanStore();

// Refs
const editFormRef = ref<FormInstance>();
const editDialogVisible = ref(false);
const selectedPlan = ref<SharedPlan | null>(null);
const editLoading = ref(false);

// Filters
const filters = ref({
  sync_status: '',
  tag: '',
});

// Edit form
const editForm = ref({
  name: '',
  description: '',
  base_price: 0, // 基础价格（月付价格，单位：元）
  prices: {
    monthly: 0,
    quarterly: 0,
    half_yearly: 0,
    yearly: 0,
    two_yearly: 0,
    three_yearly: 0,
    onetime: 0,
  },
  max_slots: 0,
});

const editRules: FormRules = {
  name: [
    { required: true, message: t('sharedPlans.nameRequired'), trigger: 'blur' },
  ],
  base_price: [
    { required: true, message: t('sharedPlans.priceRequired'), trigger: 'blur' },
  ],
  max_slots: [
    { required: true, message: t('sharedPlans.maxSlotsRequired'), trigger: 'blur' },
  ],
};

// Computed
const loading = computed(() => sharedPlanStore.loading);
const error = computed(() => sharedPlanStore.error);
const plans = computed(() => {
  let filteredPlans = sharedPlanStore.plans;
  
  // Filter by tag if selected
  if (filters.value.tag) {
    filteredPlans = filteredPlans.filter(plan => 
      plan.tags && plan.tags.includes(filters.value.tag)
    );
  }
  
  return filteredPlans;
});

// Get all unique tags from plans
const availableTags = computed(() => {
  const tags = new Set<string>();
  sharedPlanStore.plans.forEach(plan => {
    if (plan.tags) {
      plan.tags.forEach(tag => tags.add(tag));
    }
  });
  return Array.from(tags).sort();
});

// Methods
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const formatPlanPrice = (plan: SharedPlan): string => {
  // New pricing structure with multiple periods
  if (plan.prices && typeof plan.prices === 'object') {
    const prices = plan.prices;
    const priceEntries = Object.entries(prices).filter(([_, value]) => value && value > 0);
    
    if (priceEntries.length === 0) {
      return '¥0.00';
    }
    
    // Show the first available price
    const [period, cents] = priceEntries[0];
    const yuan = (cents as number) / 100;
    
    const periodLabels: Record<string, string> = {
      monthly: '月付',
      quarterly: '季付',
      half_yearly: '半年付',
      yearly: '年付',
      two_yearly: '两年付',
      three_yearly: '三年付',
      onetime: '一次性'
    };
    
    return `¥${yuan.toFixed(2)} (${periodLabels[period] || period})`;
  }
  
  // Legacy pricing structure
  if (plan.price) {
    return `¥${(plan.price / 100).toFixed(2)}`;
  }
  
  return '¥0.00';
};

const getPeriodLabel = (period: string): string => {
  const labels: Record<string, string> = {
    monthly: '月付',
    quarterly: '季付',
    half_yearly: '半年付',
    yearly: '年付',
    two_yearly: '两年付',
    three_yearly: '三年付',
    onetime: '一次性'
  };
  return labels[period] || period;
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return t('sharedPlans.never');
  return new Date(dateString).toLocaleString();
};

const getStatusType = (status: string): string => {
  const types: Record<string, string> = {
    active: 'success',
    failed: 'danger',
    expired: 'warning',
  };
  return types[status] || 'info';
};

const getTagType = (tag: string): string => {
  const lowerTag = tag.toLowerCase();
  
  // Trial tags
  if (lowerTag === '试用' || lowerTag === 'trial') {
    return 'warning';
  }
  
  // High-speed tags
  if (lowerTag === '高速' || lowerTag === 'high-speed' || lowerTag === 'fast') {
    return 'success';
  }
  
  // Stable tags
  if (lowerTag === '稳定' || lowerTag === 'stable') {
    return 'info';
  }
  
  // Premium tags
  if (lowerTag === '高级' || lowerTag === 'premium' || lowerTag === 'vip') {
    return 'danger';
  }
  
  // Default
  return '';
};

const handleImport = () => {
  router.push({ name: 'ImportSubscription' });
};

const handleViewDetails = (plan: SharedPlan) => {
  router.push({ name: 'SharedPlanDetails', params: { id: plan.id } });
};

const handleEdit = (plan: SharedPlan) => {
  selectedPlan.value = plan;
  
  // prices 存储的是分，需要转换为元显示
  const priceInCents = plan.prices?.monthly || plan.price || 0;
  const priceInYuan = priceInCents / 100;
  
  editForm.value = {
    name: plan.name,
    description: plan.description || '',
    base_price: priceInYuan, // 基础价格（月付）
    prices: {
      monthly: plan.prices?.monthly ? plan.prices.monthly / 100 : 0,
      quarterly: plan.prices?.quarterly ? plan.prices.quarterly / 100 : 0,
      half_yearly: plan.prices?.half_yearly ? plan.prices.half_yearly / 100 : 0,
      yearly: plan.prices?.yearly ? plan.prices.yearly / 100 : 0,
      two_yearly: plan.prices?.two_yearly ? plan.prices.two_yearly / 100 : 0,
      three_yearly: plan.prices?.three_yearly ? plan.prices.three_yearly / 100 : 0,
      onetime: plan.prices?.onetime ? plan.prices.onetime / 100 : 0,
    },
    max_slots: plan.max_slots,
  };
  editDialogVisible.value = true;
};

// 根据基础价格自动计算其他周期价格
const calculatePricesFromBase = () => {
  const basePrice = editForm.value.base_price;
  if (basePrice > 0) {
    editForm.value.prices = {
      monthly: basePrice,
      quarterly: Math.round(basePrice * 3 * 0.95), // 季付 5% 折扣
      half_yearly: Math.round(basePrice * 6 * 0.90), // 半年付 10% 折扣
      yearly: Math.round(basePrice * 12 * 0.85), // 年付 15% 折扣
      two_yearly: Math.round(basePrice * 24 * 0.80), // 两年付 20% 折扣
      three_yearly: Math.round(basePrice * 36 * 0.75), // 三年付 25% 折扣
      onetime: Math.round(basePrice * 12 * 0.80), // 一次性 20% 折扣
    };
  }
};

// 基础价格输入时自动计算
const handleBasePriceInput = () => {
  calculatePricesFromBase();
};

// 点击时自动全选（避免右键/仅 focus 触发导致弹出菜单干扰）
const handleSelectAll = (event: Event) => {
  // 只在鼠标左键点击时触发，避免右键菜单被干扰
  if (event instanceof MouseEvent && event.button !== 0) {
    return;
  }

  // 右键菜单事件不处理
  if (event.type === 'contextmenu') {
    return;
  }

  const currentTarget = event.currentTarget as HTMLElement | null;
  const target = event.target as HTMLElement | null;
  const inputEl =
    (currentTarget?.querySelector?.('input') as HTMLInputElement | null) ||
    (target && (target as any).select ? (target as unknown as HTMLInputElement) : null);

  if (!inputEl || typeof inputEl.select !== 'function') return;
  nextTick(() => inputEl.select());
};

const resetEditDialog = () => {
  editLoading.value = false;
  selectedPlan.value = null;
  editFormRef.value?.clearValidate();
  // 保留 editForm 默认值，避免下次打开残留
  editForm.value = {
    name: '',
    description: '',
    base_price: 0,
    prices: {
      monthly: 0,
      quarterly: 0,
      half_yearly: 0,
      yearly: 0,
      two_yearly: 0,
      three_yearly: 0,
      onetime: 0,
    },
    max_slots: 0,
  };
};

const handleCancelEdit = () => {
  if (editLoading.value) return;
  editDialogVisible.value = false;
};

// 清空所有价格
const clearAllPrices = () => {
  editForm.value.base_price = 0;
  editForm.value.prices = {
    monthly: 0,
    quarterly: 0,
    half_yearly: 0,
    yearly: 0,
    two_yearly: 0,
    three_yearly: 0,
    onetime: 0,
  };
};

const handleUpdatePlan = async () => {
  if (!editFormRef.value || !selectedPlan.value) return;
  if (editLoading.value) return;

  let saveSuccess = false;

  try {
    // 先验证表单（Element Plus validate 可能返回 void/boolean，这里统一成 boolean）
    const valid = await editFormRef.value.validate().catch(() => false);
    if (!valid) return;

    editLoading.value = true;
    
    // 将元转换为分存储
    const updateData: any = {
      name: editForm.value.name,
      description: editForm.value.description,
      max_slots: editForm.value.max_slots,
      prices: {
        monthly: Math.round(editForm.value.prices.monthly * 100),
        quarterly: Math.round(editForm.value.prices.quarterly * 100),
        half_yearly: Math.round(editForm.value.prices.half_yearly * 100),
        yearly: Math.round(editForm.value.prices.yearly * 100),
        two_yearly: Math.round(editForm.value.prices.two_yearly * 100),
        three_yearly: Math.round(editForm.value.prices.three_yearly * 100),
        onetime: Math.round(editForm.value.prices.onetime * 100),
      },
    };
    
    console.log('Updating plan with data:', updateData);
    
    await sharedPlanStore.updatePlan(selectedPlan.value!.id, updateData);
    console.log('Update successful');
    
    ElMessage.success(t('sharedPlans.updateSuccess'));

    saveSuccess = true;
    
    // 刷新列表（不要阻塞保存按钮的 loading 状态）
    sharedPlanStore.fetchPlans().catch(() => undefined);
  } catch (error: any) {
    console.error('Update plan failed:', error);
    ElMessage.error(error.message || t('sharedPlans.updateFailed'));
  } finally {
    editLoading.value = false;

    // Ensure dialog closes on successful save even if any non-critical step throws/hangs
    if (saveSuccess) {
      editDialogVisible.value = false;
    }
  }
};

const handleSync = async (plan: SharedPlan) => {
  try {
    await ElMessageBox.confirm(
      t('sharedPlans.syncConfirm'),
      t('sharedPlans.sync'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'info',
      }
    );

    await sharedPlanStore.syncSubscription(plan.id);
    ElMessage.success(t('sharedPlans.syncSuccess'));
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('sharedPlans.syncFailed'));
    }
  }
};

const handleDelete = async (plan: SharedPlan) => {
  try {
    await ElMessageBox.confirm(
      t('sharedPlans.deleteConfirm', { name: plan.name }),
      t('sharedPlans.delete'),
      {
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await sharedPlanStore.deletePlan(plan.id);
    ElMessage.success(t('sharedPlans.deleteSuccess'));
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('sharedPlans.deleteFailed'));
    }
  }
};

const handleFilterChange = () => {
  fetchPlans();
};

const handleRefresh = () => {
  fetchPlans();
};

const fetchPlans = async () => {
  try {
    await sharedPlanStore.fetchPlans({
      sync_status: filters.value.sync_status || undefined,
    });
  } catch (error) {
    // Error is handled by store
  }
};

// Lifecycle
onMounted(() => {
  fetchPlans();
});
</script>

<style scoped>
.shared-plan-list-container {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px 0;
}

.page-description {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.filter-card {
  margin-bottom: 24px;
}

.loading-container {
  padding: 24px;
}

.error-alert {
  margin-bottom: 24px;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 24px;
}

.plan-card {
  transition: all 0.3s ease;
}

.plan-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.plan-failed {
  border-left: 4px solid #f56c6c;
}

.plan-expired {
  border-left: 4px solid #e6a23c;
  opacity: 0.8;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.plan-title-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.plan-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.plan-actions {
  display: flex;
  gap: 8px;
}

.plan-content {
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.plan-description {
  font-size: 14px;
  color: #606266;
  margin: 0 0 16px 0;
  line-height: 1.6;
}

.tags-section {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.tag-badge {
  cursor: default;
}

.group-section {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #f0f9ff;
  border-radius: 4px;
  font-size: 13px;
}

.group-icon {
  color: #409eff;
}

.group-label {
  color: #909399;
}

.group-name {
  font-weight: 600;
  color: #303133;
}

.group-servers {
  color: #909399;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.stat-item {
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  display: block;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.pricing-section {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
  border-radius: 6px;
  border: 1px solid #667eea30;
}

.pricing-label {
  font-size: 12px;
  color: #606266;
  font-weight: 600;
  margin-bottom: 8px;
}

.pricing-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pricing-badge {
  display: inline-block;
  padding: 4px 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  color: #303133;
}

.slot-section {
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.slot-label {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.slot-usage {
  font-size: 16px;
  font-weight: 600;
  color: #409eff;
}

.slot-usage.slot-full {
  color: #f56c6c;
}

.slot-status {
  margin-top: 8px;
  font-size: 12px;
}

.status-available {
  color: #67c23a;
}

.status-full {
  color: #f56c6c;
}

.traffic-section {
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.traffic-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 13px;
}

.traffic-label {
  color: #909399;
}

.traffic-value {
  font-weight: 600;
  color: #303133;
}

.sync-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #909399;
}

@media (max-width: 768px) {
  .plans-grid {
    grid-template-columns: 1fr;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>

.pricing-section {
  margin-top: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.pricing-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.pricing-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.pricing-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.form-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

@media (max-width: 768px) {
  .pricing-grid {
    grid-template-columns: 1fr;
  }
}
