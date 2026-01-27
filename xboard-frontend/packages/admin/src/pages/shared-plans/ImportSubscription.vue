<template>
  <div class="import-subscription-container">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('sharedPlans.importTitle') }}</h1>
        <p class="page-description">{{ t('sharedPlans.importDescription') }}</p>
      </div>
      <el-button @click="handleBack">
        <el-icon><ArrowLeft /></el-icon>
        {{ t('common.back') }}
      </el-button>
    </div>

    <!-- Import Form -->
    <el-card class="import-card">
      <el-steps :active="currentStep" finish-status="success" align-center>
        <el-step :title="t('sharedPlans.step1')" :description="t('sharedPlans.step1Desc')" />
        <el-step :title="t('sharedPlans.step2')" :description="t('sharedPlans.step2Desc')" />
        <el-step :title="t('sharedPlans.step3')" :description="t('sharedPlans.step3Desc')" />
      </el-steps>

      <!-- Step 1: Enter Subscription URL -->
      <div v-if="currentStep === 0" class="step-content">
        <el-form :model="form" :rules="rules" ref="urlFormRef" label-position="top">
          <el-form-item :label="t('sharedPlans.subscriptionUrl')" prop="subscription_url">
            <el-input
              v-model="form.subscription_url"
              type="textarea"
              :rows="3"
              :placeholder="t('sharedPlans.urlPlaceholder')"
            />
            <div class="form-hint">
              {{ t('sharedPlans.urlHint') }}
            </div>
          </el-form-item>

          <div class="step-actions">
            <el-button type="primary" :loading="loading" @click="handlePreview">
              {{ t('sharedPlans.preview') }}
            </el-button>
          </div>
        </el-form>
      </div>

      <!-- Step 2: Preview Subscription -->
      <div v-if="currentStep === 1" class="step-content">
        <!-- Loading State -->
        <div v-if="loading" class="loading-container" style="text-align: center; padding: 40px;">
          <el-icon class="is-loading" :size="40"><Loading /></el-icon>
          <p style="margin-top: 16px; color: #909399;">{{ t('sharedPlans.loadingPreview') || '正在加载预览...' }}</p>
        </div>

        <!-- Error State -->
        <el-alert
          v-if="!loading && error"
          type="error"
          :title="t('sharedPlans.previewError') || '预览失败'"
          :description="error"
          show-icon
          class="preview-alert"
          style="margin-bottom: 20px;"
        />

        <!-- Empty State -->
        <el-empty
          v-if="!loading && !error && !previewData"
          :description="t('sharedPlans.noPreviewData') || '暂无预览数据'"
          style="padding: 40px;"
        />

        <!-- Preview Content -->
        <div v-if="!loading && !error && previewData" class="preview-section">
          <el-alert
            type="success"
            :title="t('sharedPlans.previewSuccess')"
            :closable="false"
            show-icon
            class="preview-alert"
          />

          <!-- Summary Cards -->
          <div class="preview-grid">
            <div class="preview-card">
              <div class="card-label">{{ t('sharedPlans.format') }}</div>
              <div class="card-value">
                <el-tag type="success" size="large">{{ previewData.format.toUpperCase() }}</el-tag>
              </div>
            </div>

            <div class="preview-card">
              <div class="card-label">{{ t('sharedPlans.nodesCount') }}</div>
              <div class="card-value">
                <span class="preview-number">{{ previewData.nodes_count }}</span>
                <span class="card-unit">{{ t('sharedPlans.nodes') }}</span>
              </div>
            </div>

            <div v-if="previewData.traffic_info" class="preview-card">
              <div class="card-label">{{ t('sharedPlans.totalTraffic') }}</div>
              <div class="card-value">
                {{ formatBytes(previewData.traffic_info.total || 0) }}
              </div>
            </div>

            <div v-if="previewData.traffic_info?.used !== undefined" class="preview-card">
              <div class="card-label">{{ t('sharedPlans.usedTraffic') }}</div>
              <div class="card-value">
                {{ formatBytes(previewData.traffic_info.used) }}
              </div>
              <el-progress 
                :percentage="trafficPercentage" 
                :color="getProgressColor(trafficPercentage)"
                :stroke-width="8"
                class="traffic-progress"
              />
              <div class="card-hint">
                {{ t('sharedPlans.remaining') }}: {{ formatBytes(trafficRemaining) }}
              </div>
            </div>

            <div v-if="previewData.traffic_info?.expire_at" class="preview-card">
              <div class="card-label">{{ t('sharedPlans.expireAt') }}</div>
              <div class="card-value">
                {{ formatDate(previewData.traffic_info.expire_at) }}
              </div>
              <div class="card-hint" :class="{ 'text-warning': remainingDays < 7, 'text-danger': remainingDays < 3 }">
                {{ t('sharedPlans.remainingDays', { days: remainingDays }) }}
              </div>
            </div>
          </div>

          <!-- Full Node List with Expand/Collapse -->
          <div class="nodes-section">
            <h4 class="section-title">
              {{ t('sharedPlans.nodesList') }} ({{ previewData.nodes.length }})
            </h4>
            
            <el-table 
              :data="displayedNodes" 
              stripe 
              :max-height="useVirtualScroll ? 500 : undefined"
              v-loading="loading"
              class="nodes-table"
            >
              <el-table-column type="expand">
                <template #default="{ row }">
                  <div class="node-details">
                    <div class="detail-section">
                      <h5>{{ t('sharedPlans.nodeConfig') }}</h5>
                      <div class="config-grid">
                        <div v-for="(value, key) in row.config" :key="key" class="config-item">
                          <span class="config-key">{{ key }}:</span>
                          <span class="config-value">{{ formatConfigValue(value) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </el-table-column>
              
              <el-table-column prop="name" :label="t('sharedPlans.nodeName')" min-width="200" show-overflow-tooltip />
              <el-table-column prop="server" :label="t('sharedPlans.server')" min-width="180" show-overflow-tooltip />
              <el-table-column prop="port" :label="t('sharedPlans.port')" width="100" align="center" />
              <el-table-column prop="protocol" :label="t('sharedPlans.protocol')" width="120" align="center">
                <template #default="{ row }">
                  <el-tag size="small" type="info">{{ row.protocol }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="network" :label="t('sharedPlans.network')" width="100" align="center">
                <template #default="{ row }">
                  <span v-if="row.network">{{ row.network }}</span>
                  <span v-else class="text-muted">-</span>
                </template>
              </el-table-column>
              <el-table-column prop="tls" :label="t('sharedPlans.tls')" width="80" align="center">
                <template #default="{ row }">
                  <el-icon v-if="row.tls" color="#67C23A" :size="18"><Check /></el-icon>
                  <el-icon v-else color="#F56C6C" :size="18"><Close /></el-icon>
                </template>
              </el-table-column>
            </el-table>

            <!-- Virtual Scroll Info -->
            <div v-if="useVirtualScroll" class="virtual-scroll-info">
              <el-icon><InfoFilled /></el-icon>
              {{ t('sharedPlans.virtualScrollEnabled') }}
            </div>
          </div>
        </div>

        <div class="step-actions">
          <el-button @click="handleBack">
            {{ t('common.back') }}
          </el-button>
          <el-button type="primary" @click="handleNext">
            {{ t('common.next') }}
          </el-button>
        </div>
      </div>

      <!-- Step 3: Configure Plan -->
      <div v-if="currentStep === 2" class="step-content">
        <el-form :model="form" :rules="rules" ref="planFormRef" label-position="top">
          
          <!-- Basic Information Section -->
          <div class="form-section">
            <h3 class="section-title">{{ t('sharedPlans.basicInfo') }}</h3>
            
            <el-form-item :label="t('sharedPlans.planName')" prop="name">
              <el-input
                v-model="form.name"
                :placeholder="t('sharedPlans.planNamePlaceholder')"
                maxlength="100"
                show-word-limit
              />
            </el-form-item>

            <el-form-item :label="t('sharedPlans.planDescription')" prop="description">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="3"
                :placeholder="t('sharedPlans.descriptionPlaceholder')"
              />
            </el-form-item>
          </div>

          <!-- Server Access Section -->
          <div class="form-section">
            <h3 class="section-title">{{ t('sharedPlans.serverAccess') }}</h3>
            <p class="section-description">{{ t('sharedPlans.serverAccessDesc') }}</p>
            
            <el-form-item :label="t('sharedPlans.serverGroup')" prop="group_id">
              <el-select 
                v-model="form.group_id" 
                :placeholder="t('sharedPlans.selectServerGroup')"
                style="width: 100%"
                :loading="loadingGroups"
                filterable
              >
                <el-option
                  v-for="group in serverGroups"
                  :key="group.id"
                  :label="`${group.name} (${group.server_count || 0} ${t('sharedPlans.servers')})`"
                  :value="group.id"
                />
              </el-select>
              <div class="form-hint">{{ t('sharedPlans.serverGroupHint') }}</div>
            </el-form-item>
          </div>

          <!-- Tags Section -->
          <div class="form-section">
            <h3 class="section-title">{{ t('sharedPlans.tags') }}</h3>
            <p class="section-description">{{ t('sharedPlans.tagsDesc') }}</p>
            
            <el-form-item :label="t('sharedPlans.planTags')" prop="tags">
              <el-select
                v-model="form.tags"
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
              <div class="form-hint">{{ t('sharedPlans.tagsHint') }}</div>
            </el-form-item>
          </div>

          <!-- Pricing Tiers Section -->
          <div class="form-section">
            <h3 class="section-title">{{ t('sharedPlans.pricingTiers') }}</h3>
            <p class="section-description">{{ t('sharedPlans.pricingDesc') }}</p>
            
            <div class="pricing-grid">
              <el-form-item :label="t('sharedPlans.monthly')" prop="prices.monthly">
                <el-input-number
                  v-model="form.prices.monthly"
                  :min="0"
                  :step="100"
                  :precision="0"
                  controls-position="right"
                  style="width: 100%"
                  :placeholder="t('sharedPlans.priceInCents')"
                />
                <div class="form-hint">30 {{ t('sharedPlans.days') }}</div>
              </el-form-item>
              
              <el-form-item :label="t('sharedPlans.quarterly')" prop="prices.quarterly">
                <el-input-number
                  v-model="form.prices.quarterly"
                  :min="0"
                  :step="100"
                  :precision="0"
                  controls-position="right"
                  style="width: 100%"
                  :placeholder="t('sharedPlans.priceInCents')"
                />
                <div class="form-hint">90 {{ t('sharedPlans.days') }}</div>
              </el-form-item>
              
              <el-form-item :label="t('sharedPlans.halfYearly')" prop="prices.half_yearly">
                <el-input-number
                  v-model="form.prices.half_yearly"
                  :min="0"
                  :step="100"
                  :precision="0"
                  controls-position="right"
                  style="width: 100%"
                  :placeholder="t('sharedPlans.priceInCents')"
                />
                <div class="form-hint">180 {{ t('sharedPlans.days') }}</div>
              </el-form-item>
              
              <el-form-item :label="t('sharedPlans.yearly')" prop="prices.yearly">
                <el-input-number
                  v-model="form.prices.yearly"
                  :min="0"
                  :step="100"
                  :precision="0"
                  controls-position="right"
                  style="width: 100%"
                  :placeholder="t('sharedPlans.priceInCents')"
                />
                <div class="form-hint">365 {{ t('sharedPlans.days') }}</div>
              </el-form-item>
              
              <el-form-item :label="t('sharedPlans.twoYearly')" prop="prices.two_yearly">
                <el-input-number
                  v-model="form.prices.two_yearly"
                  :min="0"
                  :step="100"
                  :precision="0"
                  controls-position="right"
                  style="width: 100%"
                  :placeholder="t('sharedPlans.priceInCents')"
                />
                <div class="form-hint">730 {{ t('sharedPlans.days') }}</div>
              </el-form-item>
              
              <el-form-item :label="t('sharedPlans.threeYearly')" prop="prices.three_yearly">
                <el-input-number
                  v-model="form.prices.three_yearly"
                  :min="0"
                  :step="100"
                  :precision="0"
                  controls-position="right"
                  style="width: 100%"
                  :placeholder="t('sharedPlans.priceInCents')"
                />
                <div class="form-hint">1095 {{ t('sharedPlans.days') }}</div>
              </el-form-item>
              
              <el-form-item :label="t('sharedPlans.onetime')" prop="prices.onetime">
                <el-input-number
                  v-model="form.prices.onetime"
                  :min="0"
                  :step="100"
                  :precision="0"
                  controls-position="right"
                  style="width: 100%"
                  :placeholder="t('sharedPlans.priceInCents')"
                />
                <div class="form-hint">{{ t('sharedPlans.permanent') }}</div>
              </el-form-item>
            </div>
            
            <div class="form-hint pricing-hint">{{ t('sharedPlans.pricingHint') }}</div>
          </div>

          <!-- Advanced Settings Section -->
          <div class="form-section">
            <h3 class="section-title">{{ t('sharedPlans.advancedSettings') }}</h3>
            
            <el-form-item :label="t('sharedPlans.maxSlots')" prop="max_slots">
              <el-input-number
                v-model="form.max_slots"
                :min="1"
                :max="1000"
                style="width: 100%"
              />
              <div class="form-hint">{{ t('sharedPlans.maxSlotsHint') }}</div>
            </el-form-item>
          </div>

          <div class="step-actions">
            <el-button @click="handleBackToPreview">
              {{ t('common.back') }}
            </el-button>
            <el-button 
              type="primary" 
              :loading="loading" 
              :disabled="!isFormValid"
              @click="handleSubmit"
            >
              {{ t('sharedPlans.createPlan') }}
            </el-button>
          </div>
        </el-form>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { ArrowLeft, Check, Close, InfoFilled } from '@element-plus/icons-vue';
import { useSharedPlanStore } from '../../stores/sharedPlan';
import { serverApi } from '@xboard/shared/api/server';
import type { ServerGroup } from '@xboard/shared/types/server';
import type { ImportSubscriptionRequest } from '@xboard/shared/api/sharedPlan';

const { t } = useI18n();
const router = useRouter();
const sharedPlanStore = useSharedPlanStore();

// Refs
const urlFormRef = ref<FormInstance>();
const planFormRef = ref<FormInstance>();
const currentStep = ref(0);
const serverGroups = ref<ServerGroup[]>([]);
const loadingGroups = ref(false);
const suggestedTags = ref<string[]>([
  '试用', '高速', '稳定', '美国', '香港', '日本', '新加坡', 
  '台湾', '韩国', '英国', '德国', '加拿大', '澳大利亚',
  'trial', 'high-speed', 'stable', 'premium', 'basic'
]);

// Form data with new fields
interface ExtendedImportRequest extends Omit<ImportSubscriptionRequest, 'price' | 'duration_days'> {
  group_id?: number;
  tags?: string[];
  prices: {
    monthly?: number;
    quarterly?: number;
    half_yearly?: number;
    yearly?: number;
    two_yearly?: number;
    three_yearly?: number;
    onetime?: number;
  };
}

const form = ref<ExtendedImportRequest>({
  subscription_url: '',
  name: '',
  description: '',
  group_id: undefined,
  tags: [],
  prices: {
    monthly: 0,
    quarterly: 0,
    half_yearly: 0,
    yearly: 0,
    two_yearly: 0,
    three_yearly: 0,
    onetime: 0,
  },
  max_slots: 10,
});

// Custom validator for at least one price
const validatePricing = (rule: any, value: any, callback: any) => {
  const prices = form.value.prices;
  const hasPrice = Object.values(prices).some(price => price && price > 0);
  
  if (!hasPrice) {
    callback(new Error(t('sharedPlans.atLeastOnePrice')));
  } else {
    callback();
  }
};

// Custom validator for tags
const validateTags = (rule: any, value: any, callback: any) => {
  if (value && value.length > 10) {
    callback(new Error(t('sharedPlans.maxTagsExceeded')));
  } else if (value && value.some((tag: string) => tag.length > 20)) {
    callback(new Error(t('sharedPlans.tagTooLong')));
  } else {
    callback();
  }
};

// Form validation rules
const rules: FormRules = {
  subscription_url: [
    { required: true, message: t('sharedPlans.urlRequired'), trigger: 'blur' },
    { type: 'url', message: t('sharedPlans.urlInvalid'), trigger: 'blur' },
  ],
  name: [
    { required: true, message: t('sharedPlans.nameRequired'), trigger: 'blur' },
    { min: 2, max: 100, message: t('sharedPlans.nameLength'), trigger: 'blur' },
  ],
  group_id: [
    { required: true, message: t('sharedPlans.groupRequired'), trigger: 'change' },
  ],
  tags: [
    { validator: validateTags, trigger: 'change' },
  ],
  'prices.monthly': [
    { validator: validatePricing, trigger: 'change' },
  ],
  max_slots: [
    { required: true, message: t('sharedPlans.maxSlotsRequired'), trigger: 'blur' },
    { type: 'number', min: 1, max: 1000, message: t('sharedPlans.maxSlotsRange'), trigger: 'blur' },
  ],
};

// Computed
const loading = computed(() => sharedPlanStore.loading);
const previewData = computed(() => sharedPlanStore.previewData);

// Check if form is valid for submission
const isFormValid = computed(() => {
  const hasName = form.value.name && form.value.name.length >= 2 && form.value.name.length <= 100;
  const hasGroup = form.value.group_id !== undefined;
  const hasPrice = Object.values(form.value.prices).some(price => price && price > 0);
  const hasValidTags = !form.value.tags || (form.value.tags.length <= 10 && form.value.tags.every(tag => tag.length <= 20));
  const hasValidSlots = form.value.max_slots >= 1 && form.value.max_slots <= 1000;
  
  return hasName && hasGroup && hasPrice && hasValidTags && hasValidSlots;
});

// Virtual scrolling for large node lists (> 50 nodes)
const useVirtualScroll = computed(() => {
  return previewData.value && previewData.value.nodes && previewData.value.nodes.length > 50;
});

// Display all nodes (virtual scrolling handles performance)
const displayedNodes = computed(() => {
  return previewData.value?.nodes || [];
});

// Traffic calculations
const trafficRemaining = computed(() => {
  if (!previewData.value?.traffic_info) return 0;
  const total = previewData.value.traffic_info.total || 0;
  const used = previewData.value.traffic_info.used || 0;
  return Math.max(0, total - used);
});

const trafficPercentage = computed(() => {
  if (!previewData.value?.traffic_info) return 0;
  const total = previewData.value.traffic_info.total || 0;
  const used = previewData.value.traffic_info.used || 0;
  if (total === 0) return 0;
  return Math.min(100, Math.round((used / total) * 100));
});

// Remaining days calculation
const remainingDays = computed(() => {
  if (!previewData.value?.traffic_info?.expire_at) return 0;
  const expireDate = new Date(previewData.value.traffic_info.expire_at);
  const now = new Date();
  const diffTime = expireDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Methods
const fetchServerGroups = async () => {
  loadingGroups.value = true;
  try {
    const response = await serverApi.getGroups();
    console.log('[ServerGroups] API response:', response);
    
    // API client already unwraps response.data, so we access response.data directly
    if (response.data) {
      serverGroups.value = response.data;
      console.log('[ServerGroups] Loaded groups:', serverGroups.value);
    } else {
      console.warn('[ServerGroups] No data in response:', response);
    }
  } catch (error) {
    console.error('[ServerGroups] Failed to fetch server groups:', error);
    ElMessage.error(t('sharedPlans.fetchGroupsFailed'));
  } finally {
    loadingGroups.value = false;
  }
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatConfigValue = (value: any): string => {
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
};

const getProgressColor = (percentage: number): string => {
  if (percentage < 50) return '#67C23A'; // green
  if (percentage < 80) return '#E6A23C'; // orange
  return '#F56C6C'; // red
};

const handlePreview = async () => {
  console.log('[Preview] Starting preview...');
  console.log('[Preview] URL:', form.value.subscription_url);
  
  if (!urlFormRef.value) {
    console.error('[Preview] urlFormRef is null');
    return;
  }

  await urlFormRef.value.validate(async (valid) => {
    console.log('[Preview] Form validation:', valid);
    
    if (valid) {
      try {
        console.log('[Preview] Calling API...');
        const result = await sharedPlanStore.previewSubscription(form.value.subscription_url);
        console.log('[Preview] API result:', result);
        console.log('[Preview] Store previewData:', sharedPlanStore.previewData);
        console.log('[Preview] Store error:', sharedPlanStore.error);
        
        if (result) {
          currentStep.value = 1;
          console.log('[Preview] Moved to step 2');
        } else {
          console.warn('[Preview] No result from API');
          ElMessage.warning('预览数据为空，请检查订阅URL是否有效');
        }
      } catch (error: any) {
        console.error('[Preview] Error:', error);
        console.error('[Preview] Error response:', error.response);
        ElMessage.error(error.response?.data?.message || t('sharedPlans.previewFailed') || '预览失败');
      }
    }
  });
};

const handleNext = () => {
  currentStep.value = 2;
};

const handleBackToPreview = () => {
  currentStep.value = 1;
};

const handleSubmit = async () => {
  if (!planFormRef.value) return;

  await planFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // Filter out zero prices
        const activePrices = Object.entries(form.value.prices)
          .filter(([_, price]) => price && price > 0)
          .reduce((acc, [key, price]) => ({ ...acc, [key]: price }), {});

        const submitData = {
          subscription_url: form.value.subscription_url,
          name: form.value.name,
          description: form.value.description,
          group_id: form.value.group_id,
          tags: form.value.tags?.filter(tag => tag.trim().length > 0) || [],
          prices: activePrices,
          max_slots: form.value.max_slots,
        };

        console.log('[Submit] Submitting data:', submitData);
        const result = await sharedPlanStore.importSubscription(submitData as any);
        console.log('[Submit] Import result:', result);
        
        ElMessage.success(t('sharedPlans.importSuccess'));
        router.push({ name: 'SharedPlans' });
      } catch (error: any) {
        console.error('[Submit] Import failed:', error);
        console.error('[Submit] Error message:', error.message);
        console.error('[Submit] Error stack:', error.stack);
        ElMessage.error(t('sharedPlans.importFailed'));
      }
    }
  });
};

const handleBack = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  } else {
    router.back();
  }
};

// Watch for step changes to preserve form state
const savedFormState = ref<ExtendedImportRequest | null>(null);

watch(currentStep, (newStep, oldStep) => {
  // Save form state when leaving step 3
  if (oldStep === 2 && newStep !== 2) {
    savedFormState.value = JSON.parse(JSON.stringify(form.value));
  }
  
  // Restore form state when returning to step 3
  if (newStep === 2 && savedFormState.value) {
    form.value = JSON.parse(JSON.stringify(savedFormState.value));
  }
});

// Load server groups on mount
onMounted(() => {
  fetchServerGroups();
});
</script>

<style scoped>
.import-subscription-container {
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

.import-card {
  max-width: 1200px;
  margin: 0 auto;
}

.step-content {
  margin-top: 40px;
  min-height: 400px;
}

.form-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.step-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e4e7ed;
}

/* Form Sections */
.form-section {
  margin-bottom: 40px;
  padding: 24px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.form-section:last-of-type {
  margin-bottom: 0;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.section-description {
  font-size: 13px;
  color: #606266;
  margin: 0 0 20px 0;
  line-height: 1.6;
}

/* Pricing Grid */
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 16px;
}

.pricing-hint {
  margin-top: 16px;
  padding: 12px;
  background: #ecf5ff;
  border-radius: 6px;
  color: #409eff;
  font-size: 13px;
  border: 1px solid #d9ecff;
}

/* Preview Section */
.preview-section {
  margin-top: 24px;
}

.preview-alert {
  margin-bottom: 24px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.preview-card {
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
}

.preview-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.preview-number {
  font-size: 32px;
  color: #409eff;
  font-weight: 700;
  line-height: 1;
}

.card-unit {
  font-size: 14px;
  color: #606266;
  font-weight: 400;
}

.card-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

.text-warning {
  color: #E6A23C !important;
  font-weight: 500;
}

.text-danger {
  color: #F56C6C !important;
  font-weight: 600;
}

.text-muted {
  color: #C0C4CC;
}

.traffic-progress {
  margin-top: 12px;
}

.nodes-section {
  margin-top: 32px;
  background: #ffffff;
  border-radius: 8px;
  padding: 24px;
  border: 1px solid #e4e7ed;
}

.nodes-table {
  width: 100%;
}

.node-details {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  margin: 12px 0;
}

.detail-section h5 {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
}

.config-item {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: #ffffff;
  border-radius: 6px;
  font-size: 13px;
}

.config-key {
  color: #606266;
  font-weight: 500;
  min-width: 80px;
}

.config-value {
  color: #303133;
  word-break: break-all;
  flex: 1;
}

.virtual-scroll-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  background: #ecf5ff;
  border-radius: 6px;
  color: #409eff;
  font-size: 13px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .preview-grid {
    grid-template-columns: 1fr;
  }

  .pricing-grid {
    grid-template-columns: 1fr;
  }

  .import-card {
    max-width: 100%;
  }

  .config-grid {
    grid-template-columns: 1fr;
  }
  
  .form-section {
    padding: 16px;
  }
}
</style>
