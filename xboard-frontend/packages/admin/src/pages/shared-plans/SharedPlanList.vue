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

            <el-tooltip :content="t('sharedPlans.copyOriginalUrl')">
              <el-button
                type="info"
                size="small"
                circle
                @click="handleCopyOriginalUrl(plan)"
              >
                <el-icon><Link /></el-icon>
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
          <div class="plan-meta">
            <div v-if="(plan.groups && plan.groups.length > 0) || plan.group" class="plan-meta-item">
              <el-icon class="plan-meta-icon"><Grid /></el-icon>
              <span class="plan-meta-text">
                <template v-if="plan.groups && plan.groups.length > 0">
                  {{ plan.groups.length }} {{ t('sharedPlans.serverGroups') }}
                </template>
                <template v-else>
                  {{ plan.group?.name }} ({{ plan.group?.server_count }} {{ t('sharedPlans.servers') }})
                </template>
              </span>
            </div>
            <div class="plan-meta-item">
              <span class="plan-meta-label">{{ t('sharedPlans.nodesCountLabel') }}:</span>
              <span class="plan-meta-text">{{ plan.nodes_count }}</span>
            </div>
          </div>

          <!-- Pricing Section -->
          <div v-if="plan.prices" class="pricing-section">
            <div class="pricing-label">{{ t('sharedPlans.pricing') }}:</div>
            <div class="pricing-items-grid">
              <div
                v-for="(price, period) in plan.prices"
                :key="period"
                v-show="price && price > 0"
                class="pricing-grid-item"
              >
                <div class="pricing-grid-period">{{ getPeriodLabel(period) }}</div>
                <div class="pricing-grid-value">¥{{ (price / 100).toFixed(2) }}</div>
              </div>
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
        <el-form-item :label="t('sharedPlans.subscriptionUrl')" prop="subscription_url">
          <el-input v-model="editForm.subscription_url" type="textarea" :rows="2" />
        </el-form-item>

        <el-form-item :label="t('sharedPlans.serverGroups')" prop="group_ids">
          <el-select
            v-model="editForm.group_ids"
            multiple
            :placeholder="t('common.select')"
            clearable
            filterable
            style="width: 100%"
            :loading="loadingGroups"
          >
            <el-option
              v-for="group in serverGroups"
              :key="group.id"
              :label="`${group.name} (${group.server_count || 0} ${t('sharedPlans.servers')})`"
              :value="group.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('sharedPlans.deviceLimit')" prop="device_limit">
          <el-input-number
            v-model="editForm.device_limit"
            :min="0"
            :step="1"
            :precision="0"
            :controls="false"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item :label="t('sharedPlans.tags')" prop="tags">
          <el-select
            v-model="editForm.tags"
            multiple
            filterable
            allow-create
            default-first-option
            :placeholder="t('sharedPlans.tagsPlaceholder')"
            style="width: 100%"
            :max-collapse-tags="3"
          >
            <el-option
              v-for="tag in suggestedTags"
              :key="tag"
              :label="tag"
              :value="tag"
            />
          </el-select>
        </el-form-item>

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
            :controls="false"
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

          <div class="pricing-edit-grid">
            <div class="pricing-edit-tile">
              <div class="pricing-edit-period">{{ t('sharedPlans.monthly') }}</div>
              <el-input-number
                v-model="editForm.prices.monthly"
                :min="0"
                :step="1"
                :precision="2"
                :controls="false"
                style="width: 100%"
                @mousedown.left="handleSelectAll"
              />
            </div>

            <div class="pricing-edit-tile">
              <div class="pricing-edit-period">{{ t('sharedPlans.quarterly') }}</div>
              <el-input-number
                v-model="editForm.prices.quarterly"
                :min="0"
                :step="1"
                :precision="2"
                :controls="false"
                style="width: 100%"
                @mousedown.left="handleSelectAll"
              />
            </div>

            <div class="pricing-edit-tile">
              <div class="pricing-edit-period">{{ t('sharedPlans.halfYearly') }}</div>
              <el-input-number
                v-model="editForm.prices.half_yearly"
                :min="0"
                :step="1"
                :precision="2"
                :controls="false"
                style="width: 100%"
                @mousedown.left="handleSelectAll"
              />
            </div>

            <div class="pricing-edit-tile">
              <div class="pricing-edit-period">{{ t('sharedPlans.yearly') }}</div>
              <el-input-number
                v-model="editForm.prices.yearly"
                :min="0"
                :step="1"
                :precision="2"
                :controls="false"
                style="width: 100%"
                @mousedown.left="handleSelectAll"
              />
            </div>

            <div class="pricing-edit-tile">
              <div class="pricing-edit-period">{{ t('sharedPlans.twoYearly') }}</div>
              <el-input-number
                v-model="editForm.prices.two_yearly"
                :min="0"
                :step="1"
                :precision="2"
                :controls="false"
                style="width: 100%"
                @mousedown.left="handleSelectAll"
              />
            </div>

            <div class="pricing-edit-tile">
              <div class="pricing-edit-period">{{ t('sharedPlans.threeYearly') }}</div>
              <el-input-number
                v-model="editForm.prices.three_yearly"
                :min="0"
                :step="1"
                :precision="2"
                :controls="false"
                style="width: 100%"
                @mousedown.left="handleSelectAll"
              />
            </div>
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
  Edit,
  Delete,
  Link,
  Refresh,
  Clock,
  Grid,
} from '@element-plus/icons-vue';
import { useSharedPlanStore } from '../../stores/sharedPlan';
import { serverApi } from '@xboard/shared/api/server';
import type { ServerGroup } from '@xboard/shared/types/server';
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

// Server groups (for editing group_id)
const serverGroups = ref<ServerGroup[]>([]);
const loadingGroups = ref(false);

const suggestedTags = ref<string[]>([
  '试用', '高速', '稳定', '美国', '香港', '日本', '新加坡',
  '台湾', '韩国', '英国', '德国', '加拿大', '澳大利亚',
  'trial', 'high-speed', 'stable', 'premium', 'basic'
]);

const sanitizeText = (input: unknown): string => {
  const s = String(input ?? '');
  // Remove surrogate pairs (most emoji) to avoid DB charset issues on some installs.
  return s.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');
};

const containsEmoji = (input: unknown): boolean => {
  return /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(String(input ?? ''));
};

// Edit form
const editForm = ref({
  subscription_url: '',
  group_ids: [] as number[],
  device_limit: null as number | null,
  tags: [] as string[],
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
  },
  max_slots: 1,
});

const editRules: FormRules = {
  subscription_url: [
    { required: true, message: t('sharedPlans.urlRequired'), trigger: 'blur' },
    { type: 'url', message: t('sharedPlans.urlInvalid'), trigger: 'blur' },
  ],
  tags: [
    {
      validator: (_rule: any, value: any, callback: any) => {
        const tags = Array.isArray(value) ? value.map((v: any) => String(v)) : [];
        if (tags.length > 10) {
          callback(new Error(t('sharedPlans.maxTagsExceeded')));
          return;
        }
        if (tags.some((tag: string) => tag.length > 20)) {
          callback(new Error(t('sharedPlans.tagTooLong')));
          return;
        }
        callback();
      },
      trigger: 'change'
    }
  ],
  name: [
    { required: true, message: t('sharedPlans.nameRequired'), trigger: 'blur' },
    {
      validator: (_rule: any, value: any, callback: any) => {
        if (containsEmoji(value)) {
          callback(new Error('不支持表情符号'));
          return;
        }
        callback();
      },
      trigger: 'blur'
    }
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
      monthly: t('sharedPlans.monthly'),
      quarterly: t('sharedPlans.quarterly'),
      half_yearly: t('sharedPlans.halfYearly'),
      yearly: t('sharedPlans.yearly'),
      two_yearly: t('sharedPlans.twoYearly'),
      three_yearly: t('sharedPlans.threeYearly'),
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
    monthly: t('sharedPlans.monthly'),
    quarterly: t('sharedPlans.quarterly'),
    half_yearly: t('sharedPlans.halfYearly'),
    yearly: t('sharedPlans.yearly'),
    two_yearly: t('sharedPlans.twoYearly'),
    three_yearly: t('sharedPlans.threeYearly'),
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

const handleEdit = (plan: SharedPlan) => {
  selectedPlan.value = plan;
  
  // prices 存储的是分，需要转换为元显示
  const priceInCents = plan.prices?.monthly || plan.price || 0;
  const priceInYuan = priceInCents / 100;
  
  editForm.value = {
    subscription_url: plan.subscription_url || '',
    group_ids: (plan.group_ids && plan.group_ids.length > 0)
      ? plan.group_ids.slice()
      : (plan.group_id ? [plan.group_id] : []),
    device_limit: typeof (plan as any).device_limit === 'number' ? (plan as any).device_limit : null,
    tags: (plan.tags || []).slice(),
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
  editForm.value = {
    subscription_url: '',
    group_ids: [],
    device_limit: null,
    tags: [],
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
  editForm.value.prices = {
    monthly: 0,
    quarterly: 0,
    half_yearly: 0,
    yearly: 0,
    two_yearly: 0,
    three_yearly: 0,
  };
};

const handleUpdatePlan = async () => {
  if (!editFormRef.value || !selectedPlan.value) return;
  if (editLoading.value) return;

  let saveSuccess = false;

  try {
    // 先验证表单（Element Plus validate 可能返回 void/boolean，这里统一成 boolean）
    const validResult = await editFormRef.value.validate().catch(() => false);
    if (validResult === false) return;

    editLoading.value = true;
    
    // 将元转换为分存储
    const pricesInCents: Record<string, number> = {
      monthly: Math.round(editForm.value.prices.monthly * 100),
      quarterly: Math.round(editForm.value.prices.quarterly * 100),
      half_yearly: Math.round(editForm.value.prices.half_yearly * 100),
      yearly: Math.round(editForm.value.prices.yearly * 100),
      two_yearly: Math.round(editForm.value.prices.two_yearly * 100),
      three_yearly: Math.round(editForm.value.prices.three_yearly * 100),
    };

    // 允许单项价格为 0（视为未设置）：提交时剔除 0 值
    const filteredPrices = Object.fromEntries(
      Object.entries(pricesInCents).filter(([, value]) => value > 0)
    );

    const updateData: any = {
      // Some deployments (e.g. sqlite dev db) may not have group_ids column.
      // Send only group_id for compatibility.
      group_id: (editForm.value.group_ids || []).length > 0 ? editForm.value.group_ids[0] : null,
      device_limit: editForm.value.device_limit,
      tags: (Array.isArray(editForm.value.tags) ? editForm.value.tags : [])
        .map((tag: any) => sanitizeText(tag))
        .filter((tag: string) => tag.trim().length > 0),
      name: sanitizeText(editForm.value.name),
      description: sanitizeText(editForm.value.description),
      max_slots: editForm.value.max_slots,
      prices: filteredPrices,
    };

    // IMPORTANT: backend stores subscription_url encrypted.
    // If we always send subscription_url, backend compares plaintext with encrypted value,
    // incorrectly thinks it changed, triggers resync, and may throw -> 500.
    // Only send subscription_url when user actually changed it.
    const originalUrl = selectedPlan.value.subscription_url || '';
    const currentUrl = editForm.value.subscription_url || '';
    if (currentUrl.trim() && currentUrl.trim() !== originalUrl.trim()) {
      updateData.subscription_url = currentUrl.trim();
    }
    
    await sharedPlanStore.updatePlan(selectedPlan.value!.id, updateData);
    
    ElMessage.success(t('sharedPlans.updateSuccess'));

    saveSuccess = true;

    // Close dialog immediately on success
    editDialogVisible.value = false;
    
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

const handleCopyOriginalUrl = async (plan: SharedPlan) => {
  try {
    // 直接使用列表中的 subscription_url（列表接口已返回原始地址）
    const originalUrl = plan.subscription_url;
    if (!originalUrl) {
      ElMessage.error(t('sharedPlans.originalUrlNotFound'));
      return;
    }
    await navigator.clipboard.writeText(originalUrl);
    ElMessage.success(t('sharedPlans.originalUrlCopied'));
  } catch (error) {
    ElMessage.error(t('sharedPlans.copyFailed'));
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

const fetchServerGroups = async () => {
  loadingGroups.value = true;
  try {
    const response = await serverApi.getGroups();
    if (response.data) {
      serverGroups.value = response.data;
    }
  } catch (_error) {
    // Ignore; editing group_id can still proceed as optional
  } finally {
    loadingGroups.value = false;
  }
};

// Lifecycle
onMounted(() => {
  fetchPlans();
  fetchServerGroups();
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

.plan-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
  color: #606266;
  font-size: 13px;
}

.plan-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.plan-meta-icon {
  font-size: 14px;
  color: #909399;
}

.plan-meta-label {
  color: #909399;
}

.plan-meta-text {
  color: #606266;
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

.pricing-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.pricing-edit-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.pricing-edit-tile {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 10px;
  background: #fff;
}

.pricing-edit-period {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
  font-weight: 600;
}

.pricing-grid-item {
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}

.pricing-grid-period {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
}

.pricing-grid-value {
  font-size: 14px;
  font-weight: 700;
  color: #303133;
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
