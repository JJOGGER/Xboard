<template>
  <div class="shared-plans-page">
    <div class="plans-header">
      <h1 class="plans-title">{{ t('sharedPlans.title') }}</h1>
      <p class="plans-subtitle">{{ t('sharedPlans.subtitle') }}</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <n-spin size="large" />
      <p>{{ t('common.loading') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>
      <p class="error-message">{{ error }}</p>
      <n-button type="primary" @click="fetchPlans">
        {{ t('common.retry') }}
      </n-button>
    </div>

    <!-- Plans Grid -->
    <div v-else-if="availablePlans.length > 0" class="plans-grid">
      <div
        v-for="plan in availablePlans"
        :key="plan.id"
        class="plan-card"
        :class="{ 'plan-full': plan.used_slots >= plan.max_slots }"
      >
        <!-- Plan Header -->
        <div class="plan-header">
          <h3 class="plan-name">{{ plan.name }}</h3>
          
        </div>

        <!-- Plan Description -->
        <p v-if="plan.description" class="plan-description">{{ plan.description }}</p>


        <!-- Tags (if available) -->
        <div v-if="plan.tags && plan.tags.length > 0" class="plan-tags">
          <span
            v-for="tag in plan.tags"
            :key="tag"
            class="plan-tag"
            :class="{ 'tag-trial': isTrialTag(tag) }"
          >
            {{ tag }}
          </span>
        </div>

        <!-- Pricing Tiers -->
        <div class="pricing-section">
          <h4 class="pricing-title">{{ t('sharedPlans.selectPeriod') }}</h4>
          <div class="pricing-tiers">
            <div
              v-for="tier in getPricingTiers(plan)"
              :key="tier.period"
              class="pricing-tier"
              :class="{
                'tier-selected': selectedPeriods[plan.id] === tier.period,
                'tier-recommended': tier.recommended
              }"
              @click="selectPeriod(plan.id, tier.period)"
            >
              <div class="tier-header">
                <span class="tier-name">{{ tier.name }}</span>
                <span v-if="tier.recommended" class="tier-badge">{{ t('sharedPlans.recommended') }}</span>
              </div>
              <div class="tier-price">
                <span class="price-amount">¥{{ tier.price.toFixed(2) }}</span>
              </div>
              <div class="tier-details">
                <span v-if="tier.days > 0" class="tier-duration">{{ tier.days }} {{ t('sharedPlans.days') }}</span>
                <span v-else class="tier-duration">{{ t('sharedPlans.permanent') }}</span>
                <span v-if="tier.days > 0" class="tier-average">
                  {{ t('sharedPlans.avgMonthly') }}: ¥{{ tier.averageMonthly.toFixed(2) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Purchase Button -->
        <div class="plan-footer">
          <n-button
            type="primary"
            size="large"
            block
            :disabled="plan.used_slots >= plan.max_slots || !selectedPeriods[plan.id] || purchasing"
            :loading="purchasing"
            @click="handlePurchase(plan)"
          >
            <template v-if="plan.used_slots >= plan.max_slots">
              {{ t('sharedPlans.soldOut') }}
            </template>
            <template v-else-if="!selectedPeriods[plan.id]">
              {{ t('sharedPlans.selectPeriodFirst') }}
            </template>
            <template v-else>
              {{ t('sharedPlans.purchase') }}
            </template>
          </n-button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p class="empty-message">{{ t('sharedPlans.noPlans') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, h } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { NButton, NSpin, useMessage, useDialog } from 'naive-ui';
import { useSharedPlanStore } from '../stores/sharedPlan';
import { useOrderStore } from '../stores/order';
import type { SharedPlan } from '@xboard/shared/api/sharedPlan';

const { t } = useI18n();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const sharedPlanStore = useSharedPlanStore();
const orderStore = useOrderStore();

const purchasing = ref(false);
const selectedPeriods = reactive<Record<number, string>>({});
const couponCodes = reactive<Record<number, string>>({});

const loading = computed(() => sharedPlanStore.loading);
const error = computed(() => sharedPlanStore.error);
const availablePlans = computed(() => sharedPlanStore.availablePlans);

// Period configuration
const PERIOD_CONFIG = {
  monthly: { name: '月付', days: 30 },
  quarterly: { name: '季付', days: 90 },
  half_yearly: { name: '半年付', days: 180 },
  yearly: { name: '年付', days: 365 },
  two_yearly: { name: '两年付', days: 730 },
  three_yearly: { name: '三年付', days: 1095 },
  onetime: { name: '一次性', days: -1 },
};


const isTrialTag = (tag: string): boolean => {
  const lowerTag = tag.toLowerCase();
  return lowerTag === '试用' || lowerTag === 'trial';
};

const getPricingTiers = (plan: SharedPlan) => {
  const tiers: Array<{
    period: string;
    name: string;
    price: number;
    days: number;
    averageMonthly: number;
    recommended: boolean;
  }> = [];

  // 使用后端返回的 pricing_tiers 数据
  if (plan.pricing_tiers && Object.keys(plan.pricing_tiers).length > 0) {
    Object.entries(plan.pricing_tiers).forEach(([period, tierData]: [string, any]) => {
      if (tierData && tierData.price > 0) {
        const config = PERIOD_CONFIG[period as keyof typeof PERIOD_CONFIG];
        if (config) {
          // Recommend yearly plan (best value per month)
          const recommended = period === 'yearly';
          
          // 价格从分转换为元
          const priceInYuan = tierData.price / 100;
          const averageMonthlyInYuan = tierData.average_monthly / 100;
          
          tiers.push({
            period,
            name: config.name,
            price: priceInYuan,
            days: tierData.period?.days || config.days,
            averageMonthly: averageMonthlyInYuan,
            recommended,
          });
        }
      }
    });
  } 
  // 备用：使用 prices 结构（如果存在）
  else if (plan.prices && Object.keys(plan.prices).length > 0) {
    Object.entries(plan.prices).forEach(([period, priceInCents]) => {
      if (priceInCents && priceInCents > 0) {
        const config = PERIOD_CONFIG[period as keyof typeof PERIOD_CONFIG];
        if (config) {
          // 价格从分转换为元
          const priceInYuan = priceInCents / 100;
          const averageMonthly = config.days > 0 ? priceInYuan / (config.days / 30) : priceInYuan;
          
          // Recommend yearly plan (best value per month)
          const recommended = period === 'yearly';
          
          tiers.push({
            period,
            name: config.name,
            price: priceInYuan,
            days: config.days,
            averageMonthly,
            recommended,
          });
        }
      }
    });
  } 
  // 向后兼容：旧格式
  else if (plan.price && plan.duration_days) {
    const period = convertDurationToPeriod(plan.duration_days);
    const config = PERIOD_CONFIG[period as keyof typeof PERIOD_CONFIG];
    // 价格从分转换为元
    const priceInYuan = plan.price / 100;
    const averageMonthly = config.days > 0 ? priceInYuan / (config.days / 30) : priceInYuan;
    
    tiers.push({
      period,
      name: config.name,
      price: priceInYuan,
      days: plan.duration_days,
      averageMonthly,
      recommended: false,
    });
  }

  // Sort by days (ascending), with onetime at the end
  return tiers.sort((a, b) => {
    if (a.days === -1) return 1;
    if (b.days === -1) return -1;
    return a.days - b.days;
  });
};

const convertDurationToPeriod = (days: number): string => {
  if (days <= 30) return 'monthly';
  if (days <= 90) return 'quarterly';
  if (days <= 180) return 'half_yearly';
  if (days <= 365) return 'yearly';
  if (days <= 730) return 'two_yearly';
  return 'three_yearly';
};

const selectPeriod = (planId: number, period: string) => {
  selectedPeriods[planId] = period;
};

const fetchPlans = async () => {
  try {
    await sharedPlanStore.fetchAvailablePlans();
  } catch (err: any) {
    console.error('Failed to fetch shared plans:', err);
  }
};

const handlePurchase = async (plan: SharedPlan) => {
  const selectedPeriod = selectedPeriods[plan.id];
  if (!selectedPeriod) {
    message.warning(t('sharedPlans.selectPeriodFirst'));
    return;
  }

  const tiers = getPricingTiers(plan);
  const selectedTier = tiers.find(t => t.period === selectedPeriod);
  
  if (!selectedTier) {
    message.error(t('sharedPlans.invalidPeriod'));
    return;
  }

  dialog.create({
    title: '确认购买',
    content: () => {
      return h('div', { class: 'space-y-2' }, [
        h('div', null, `周期：${selectedTier.name}，价格：¥${selectedTier.price.toFixed(2)}`),
      ]);
    },
    positiveText: '去结算',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        router.push({
          name: 'Checkout',
          query: {
            shared_plan_id: plan.id,
            period: selectedPeriod,
          },
        });
      } catch (err: any) {
        console.error('Purchase failed:', err);
        message.error(err?.response?.data?.message || err.message || t('sharedPlans.purchaseFailed'));
      } finally {
      }
    },
  });
};

onMounted(() => {
  fetchPlans();
});
</script>

<style scoped>
.shared-plans-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.plans-header {
  text-align: center;
  margin-bottom: 48px;
}

.plans-title {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 12px 0;
}

.plans-subtitle {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
}

.error-icon,
.empty-icon {
  width: 64px;
  height: 64px;
  color: #999;
  margin-bottom: 16px;
}

.error-message,
.empty-message {
  font-size: 16px;
  color: #666;
  margin: 0 0 24px 0;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 24px;
}

.plan-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.plan-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.plan-card.plan-full {
  opacity: 0.7;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.plan-name {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  flex: 1;
}

.plan-format {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: #f0f0f0;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  color: #666;
}

.format-icon {
  width: 14px;
  height: 14px;
}

.plan-description {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0 0 20px 0;
}

.plan-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f8f8;
  border-radius: 8px;
}

.stat-icon {
  width: 20px;
  height: 20px;
  color: #666;
  flex-shrink: 0;
}

.stat-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
}

.stat-label {
  font-size: 13px;
  color: #666;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

/* Tags */
.plan-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.plan-tag {
  padding: 4px 12px;
  background: #e8f4fd;
  color: #1890ff;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.plan-tag.tag-trial {
  background: #fff7e6;
  color: #d46b08;
}

/* Pricing Section */
.pricing-section {
  margin-bottom: 20px;
}

.pricing-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 12px 0;
}

.pricing-tiers {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.pricing-tier {
  padding: 12px;
  background: #f8f8f8;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.pricing-tier:hover {
  background: #f0f0f0;
  border-color: #d0d0d0;
}

.pricing-tier.tier-selected {
  background: #e6f7ff;
  border-color: #1890ff;
}

.pricing-tier.tier-recommended {
  border-color: #52c41a;
}

.tier-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tier-name {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
}

.tier-badge {
  padding: 2px 6px;
  background: #52c41a;
  color: white;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
}

.tier-price {
  margin-bottom: 6px;
}

.price-amount {
  font-size: 20px;
  font-weight: 700;
  color: #18a058;
}

.tier-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tier-duration {
  font-size: 12px;
  color: #666;
}

.tier-average {
  font-size: 11px;
  color: #999;
}

.slot-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f8f8;
  border-radius: 8px;
}

.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.slot-label {
  font-size: 13px;
  font-weight: 600;
  color: #666;
}

.slot-count {
  font-size: 14px;
  font-weight: 600;
  color: #18a058;
}

.slot-count.slot-full {
  color: #d03050;
}

.slot-progress {
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.slot-progress-bar {
  height: 100%;
  background: #18a058;
  transition: width 0.3s ease;
}

.slot-progress-bar.progress-full {
  background: #d03050;
}

.slot-status {
  font-size: 12px;
  text-align: center;
}

.status-available {
  color: #18a058;
}

.status-full {
  color: #d03050;
}

.plan-footer {
  margin-top: auto;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.traffic-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 12px;
  background: #fff7e6;
  border-radius: 6px;
  font-size: 12px;
  color: #d46b08;
}

.notice-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .plans-grid {
    grid-template-columns: 1fr;
  }
  
  .plans-title {
    font-size: 24px;
  }
  
  .plans-subtitle {
    font-size: 14px;
  }
  
  .pricing-tiers {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
