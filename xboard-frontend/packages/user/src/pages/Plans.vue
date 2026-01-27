<template>
  <div class="plans-page">
    <div class="plans-header">
      <h1 class="plans-title">{{ t('plans.title') }}</h1>
      <p class="plans-subtitle">{{ t('plans.subtitle') }}</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <n-spin size="large" />
      <p>{{ t('plans.loading') }}</p>
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
        {{ t('plans.retry') }}
      </n-button>
    </div>

    <!-- Plans Grid -->
    <div v-else-if="plans.length > 0" class="plans-grid">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="plan-card"
        :class="{ 'plan-featured': plan.is_featured }"
      >
        <!-- Featured Badge -->
        <div v-if="plan.is_featured" class="featured-badge">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {{ t('plans.featured') }}
        </div>

        <!-- Plan Header -->
        <div class="plan-header">
          <h3 class="plan-name">{{ plan.name }}</h3>
          <div class="plan-price">
            <span class="price-amount">${{ (plan.month_price / 100).toFixed(2) }}</span>
            <span class="price-period">/ {{ t('plans.month') }}</span>
          </div>
          <div v-if="plan.quarter_price" class="plan-price-alt">
            <span class="price-label">{{ t('plans.quarterly') }}:</span>
            <span class="price-amount-alt">${{ (plan.quarter_price / 100).toFixed(2) }}</span>
          </div>
          <div v-if="plan.half_year_price" class="plan-price-alt">
            <span class="price-label">{{ t('plans.halfYearly') }}:</span>
            <span class="price-amount-alt">${{ (plan.half_year_price / 100).toFixed(2) }}</span>
          </div>
          <div v-if="plan.year_price" class="plan-price-alt">
            <span class="price-label">{{ t('plans.yearly') }}:</span>
            <span class="price-amount-alt">${{ (plan.year_price / 100).toFixed(2) }}</span>
          </div>
        </div>

        <!-- Plan Features -->
        <div class="plan-features">
          <div class="feature-item">
            <svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{{ formatBytes(plan.transfer_enable) }} {{ t('plans.traffic') }}</span>
          </div>

          <div v-if="plan.speed_limit" class="feature-item">
            <svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{{ plan.speed_limit }} Mbps {{ t('plans.speed') }}</span>
          </div>

          <div v-if="plan.device_limit" class="feature-item">
            <svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{{ plan.device_limit }} {{ t('plans.devices') }}</span>
          </div>

          <div class="feature-item">
            <svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{{ t('plans.resetDay') }}: {{ plan.reset_day || t('plans.noReset') }}</span>
          </div>

          <div v-if="plan.content" class="feature-item feature-description">
            <p>{{ plan.content }}</p>
          </div>
        </div>

        <!-- Subscribe Button -->
        <n-button
          type="primary"
          size="large"
          block
          :disabled="isCurrentPlan(plan.id)"
          @click="handleSubscribe(plan)"
        >
          <template v-if="isCurrentPlan(plan.id)">
            {{ t('plans.currentPlan') }}
          </template>
          <template v-else>
            {{ t('plans.subscribe') }}
          </template>
        </n-button>
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
      <p class="empty-message">{{ t('plans.noPlans') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { NButton, NSpin, useMessage } from 'naive-ui'
import { useAuthStore } from '../stores/auth'
import { useOrderStore } from '../stores/order'
import { useSharedPlanStore } from '../stores/sharedPlan'
import { planApi } from '@xboard/shared'
import type { Plan } from '@xboard/shared'

const { t } = useI18n()
const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()
const orderStore = useOrderStore()
const sharedPlanStore = useSharedPlanStore()

const plans = ref<Plan[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Computed to determine if we should show shared plans or traditional plans
const showSharedPlans = computed(() => {
  // If there are shared plans available, show them
  return sharedPlanStore.availablePlans.length > 0
})

const displayPlans = computed(() => {
  if (showSharedPlans.value) {
    // Convert shared plans to display format
    return sharedPlanStore.availablePlans.map(plan => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      month_price: plan.prices?.monthly || 0,
      quarter_price: plan.prices?.quarterly || 0,
      half_year_price: plan.prices?.half_yearly || 0,
      year_price: plan.prices?.yearly || 0,
      two_year_price: plan.prices?.two_yearly || 0,
      three_year_price: plan.prices?.three_yearly || 0,
      onetime_price: plan.prices?.onetime || 0,
      transfer_enable: plan.total_traffic || 0,
      speed_limit: null,
      device_limit: null,
      reset_day: null,
      content: plan.description,
      is_featured: false,
      is_shared_plan: true,
      nodes_count: plan.nodes_count,
      max_slots: plan.max_slots,
      used_slots: plan.used_slots,
      available_slots: plan.max_slots - plan.used_slots
    }))
  }
  return plans.value
})

const isCurrentPlan = (planId: number) => {
  return authStore.user?.plan_id === planId
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const fetchPlans = async () => {
  loading.value = true
  error.value = null

  try {
    // Always fetch shared plans first
    await sharedPlanStore.fetchAvailablePlans()
    
    // If no shared plans available, fetch traditional plans
    if (sharedPlanStore.availablePlans.length === 0) {
      console.log('No shared plans available, fetching traditional plans...')
      const response = await planApi.getPlans()
      console.log('Plans API response:', response)
      console.log('Plans data:', response.data)
      
      // Handle different response structures
      if (response.data?.data) {
        plans.value = response.data.data
      } else if (Array.isArray(response.data)) {
        plans.value = response.data
      } else {
        plans.value = []
      }
      
      console.log('Traditional plans loaded:', plans.value.length, 'plans')
    } else {
      console.log('Shared plans loaded:', sharedPlanStore.availablePlans.length, 'plans')
    }
  } catch (err: any) {
    console.error('Failed to fetch plans:', err)
    console.error('Error details:', err.response?.data || err.message)
    error.value = err.response?.data?.message || err.message || t('plans.fetchError')
  } finally {
    loading.value = false
  }
}

const handleSubscribe = async (plan: Plan) => {
  try {
    loading.value = true
    
    // Handle shared plan subscription
    if ((plan as any).is_shared_plan) {
      // Navigate to SharedPlans page for detailed selection
      router.push({ name: 'SharedPlans' })
      return
    }
    
    // Find the first available period with a price
    let period = null
    const periodMap = {
      month_price: plan.month_price,
      quarter_price: plan.quarter_price,
      half_year_price: plan.half_year_price,
      year_price: plan.year_price,
      two_year_price: plan.two_year_price,
      three_year_price: plan.three_year_price,
      onetime_price: plan.onetime_price,
      reset_price: plan.reset_price
    }
    
    // Find first available period
    for (const [key, value] of Object.entries(periodMap)) {
      if (value && value > 0) {
        period = key
        break
      }
    }
    
    if (!period) {
      message.error(t('plans.noPriceAvailable') || 'No pricing available for this plan')
      return
    }
    
    // Create order first
    const orderData = {
      plan_id: plan.id,
      plan_type: 'traditional' as const,
      period: period
    }
    
    const orderResponse = await orderStore.createOrder(orderData)
    
    // Navigate to checkout with the order
    router.push({
      name: 'Checkout',
      query: { 
        trade_no: orderResponse.trade_no
      }
    })
  } catch (err: any) {
    console.error('Failed to create order:', err)
    message.error(err.message || t('plans.subscribeError'))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchPlans()
})
</script>

<style scoped>
.plans-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.plans-header {
  text-align: center;
  margin-bottom: 3rem;
}

.plans-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 1rem;
}

.plans-subtitle {
  font-size: 1.125rem;
  color: #64748b;
  margin: 0;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
  color: #64748b;
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
}

.error-icon {
  width: 64px;
  height: 64px;
  color: #ef4444;
}

.error-icon svg {
  width: 100%;
  height: 100%;
}

.error-message {
  font-size: 1.125rem;
  color: #64748b;
  margin: 0;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: #94a3b8;
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-message {
  font-size: 1.125rem;
  color: #64748b;
  margin: 0;
}

/* Plans Grid */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

@media (max-width: 768px) {
  .plans-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .plans-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1025px) {
  .plans-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Plan Card */
.plan-card {
  position: relative;
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 2px solid #e2e8f0;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.plan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  border-color: #3b82f6;
}

.plan-featured {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.plan-featured:hover {
  box-shadow: 0 12px 24px rgba(59, 130, 246, 0.3);
}

/* Featured Badge */
.featured-badge {
  position: absolute;
  top: -12px;
  right: 2rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  font-size: 0.875rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.featured-badge svg {
  width: 16px;
  height: 16px;
}

/* Plan Header */
.plan-header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.plan-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 1rem;
}

.plan-price {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.price-amount {
  font-size: 2.5rem;
  font-weight: 700;
  color: #3b82f6;
}

.price-period {
  font-size: 1rem;
  color: #64748b;
}

.plan-price-alt {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.price-label {
  font-size: 0.875rem;
  color: #64748b;
}

.price-amount-alt {
  font-size: 1.125rem;
  font-weight: 600;
  color: #0f172a;
}

/* Plan Features */
.plan-features {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-size: 0.9375rem;
  color: #475569;
}

.feature-icon {
  width: 20px;
  height: 20px;
  color: #22c55e;
  flex-shrink: 0;
  margin-top: 2px;
}

.feature-description {
  padding-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.6;
}

.feature-description p {
  margin: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .plans-page {
    padding: 1rem;
  }

  .plans-header {
    margin-bottom: 2rem;
  }

  .plans-title {
    font-size: 1.75rem;
  }

  .plans-subtitle {
    font-size: 0.9375rem;
  }

  .plan-card {
    padding: 1.5rem;
  }

  .plan-name {
    font-size: 1.25rem;
  }

  .price-amount {
    font-size: 2rem;
  }

  .featured-badge {
    top: -10px;
    right: 1rem;
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
  }

  .featured-badge svg {
    width: 14px;
    height: 14px;
  }
}

@media (max-width: 480px) {
  .plans-page {
    padding: 0.75rem;
  }

  .plans-title {
    font-size: 1.5rem;
  }

  .plans-subtitle {
    font-size: 0.875rem;
  }

  .plan-card {
    padding: 1.25rem;
  }

  .plan-name {
    font-size: 1.125rem;
  }

  .price-amount {
    font-size: 1.75rem;
  }

  .price-period {
    font-size: 0.875rem;
  }

  .plan-price-alt {
    flex-direction: column;
    gap: 0.25rem;
  }

  .feature-item {
    font-size: 0.875rem;
  }

  .feature-icon {
    width: 18px;
    height: 18px;
  }
}
</style>
