<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1 class="dashboard-title">{{ t('dashboard.title') }}</h1>
      <p class="dashboard-subtitle">{{ t('dashboard.subtitle') }}</p>
    </div>

    <!-- Account Overview Card -->
    <div class="overview-card">
      <div class="overview-header">
        <h2 class="overview-title">{{ t('dashboard.overview.title') }}</h2>
      </div>

      <div class="overview-grid">
        <!-- Subscription Status -->
        <div class="overview-item clickable" @click="router.push({ name: 'Subscription' })">
          <div class="overview-icon subscription-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div class="overview-content">
            <div class="overview-label">{{ t('dashboard.overview.subscription') }}</div>
            <div class="overview-value">
              {{ hasActiveSubscription ? activeSubscriptionInfo?.name : t('dashboard.overview.noPlan') }}
            </div>
            <div v-if="activeSubscriptionInfo" class="overview-meta">
              {{ t('dashboard.overview.expiresAt') }}: {{ activeSubscriptionInfo.expiresAt }}
            </div>
          </div>
        </div>

        <!-- Account Balance -->
        <div class="overview-item">
          <div class="overview-icon balance-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div class="overview-content">
            <div class="overview-label">{{ t('dashboard.overview.balance') }}</div>
            <div class="overview-value">¥{{ ((authStore.user?.balance || 0) / 100).toFixed(2) }}</div>
          </div>
        </div>

        <!-- Commission Balance -->
        <div class="overview-item clickable" @click="router.push({ name: 'Referral' })">
          <div class="overview-icon commission-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div class="overview-content">
            <div class="overview-label">{{ t('dashboard.overview.commission') }}</div>
            <div class="overview-value">¥{{ ((authStore.user?.commission_balance || 0) / 100).toFixed(2) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- My Subscriptions -->
    <div class="overview-card">
      <div class="overview-header">
        <h2 class="overview-title">{{ t('dashboard.mySubscriptions.title') }}</h2>
        <n-button text type="primary" @click="router.push({ name: 'Subscription' })">
          {{ t('dashboard.mySubscriptions.viewAll') }}
        </n-button>
      </div>

      <div v-if="!hasAnySubscription" class="empty-subscriptions">
        {{ t('dashboard.mySubscriptions.empty') }}
      </div>

      <div v-else class="subscriptions-list">
        <div v-if="traditionalSubscription" class="subscription-row clickable" @click="router.push({ name: 'Subscription' })">
          <div class="subscription-type">{{ t('dashboard.mySubscriptions.traditional') }}</div>
          <div class="subscription-name">{{ traditionalSubscription.name }}</div>
          <div class="subscription-expire" v-if="traditionalSubscription.expiresAt">
            {{ t('dashboard.mySubscriptions.expiresAt') }}: {{ traditionalSubscription.expiresAt }}
          </div>
        </div>

        <div
          v-for="sub in activeSharedSubscriptions"
          :key="sub.slot.id"
          class="subscription-row clickable"
          @click="router.push({ name: 'Subscription' })"
        >
          <div class="subscription-type">{{ t('dashboard.mySubscriptions.shared') }}</div>
          <div class="subscription-name">{{ sub.plan.name }}</div>
          <div class="subscription-expire">
            {{ t('dashboard.mySubscriptions.expiresAt') }}: {{ formatDate(sub.slot.expire_at) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { NButton, NTag, NProgress, NSpin, useMessage } from 'naive-ui'
import { useAuthStore } from '../stores/auth'
import { useSharedPlanStore } from '../stores/sharedPlan'
import dayjs from 'dayjs'

const { t } = useI18n()
const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()
const sharedPlanStore = useSharedPlanStore()

const activeSharedSubscriptions = computed(() =>
  sharedPlanStore.userSubscriptions.filter((sub: any) => sub.slot?.status === 'active')
)

const traditionalSubscription = computed(() => {
  if (authStore.user?.plan_id && authStore.user?.expired_at) {
    return {
      name: t('dashboard.overview.planActive'),
      expiresAt: formatDate(authStore.user.expired_at * 1000),
    }
  }
  return null
})

const hasAnySubscription = computed(() => {
  return !!traditionalSubscription.value || activeSharedSubscriptions.value.length > 0
})

// Check if user has any active subscription (traditional or shared)
const hasActiveSubscription = computed(() => {
  // Check traditional subscription
  if (authStore.user?.plan_id) return true
  
  // Check shared subscriptions
  return sharedPlanStore.userSubscriptions.some(sub => 
    sub.slot.status === 'active'
  )
})

const activeSubscriptionInfo = computed(() => {
  // Prefer shared subscription if active
  const activeShared = sharedPlanStore.userSubscriptions.find(sub => 
    sub.slot.status === 'active'
  )
  
  if (activeShared) {
    return {
      type: 'shared',
      name: activeShared.plan.name,
      expiresAt: new Date(activeShared.slot.expire_at).toLocaleString()
    }
  }
  
  // Fallback to traditional subscription
  if (authStore.user?.plan_id && authStore.user?.expired_at) {
    return {
      type: 'traditional',
      name: t('dashboard.overview.planActive'),
      expiresAt: formatDate(authStore.user.expired_at * 1000)
    }
  }
  
  return null
})

const formatDate = (date: string | number) => {
  try {
    return dayjs(date).format('YYYY-MM-DD HH:mm')
  } catch (error) {
    console.error('Error formatting date:', error)
    return String(date)
  }
}

onMounted(async () => {
  // 只有在已登录时才刷新用户信息和获取数据
  if (!authStore.isAuthenticated) {
    return
  }
  
  // 刷新用户信息以获取最新余额
  try {
    await authStore.fetchUser()
  } catch (error) {
    console.error('Failed to refresh user info:', error)
  }
  
  // 获取共享订阅信息
  try {
    await sharedPlanStore.fetchUserSubscriptions()
  } catch (error) {
    console.error('Failed to fetch shared subscriptions:', error)
  }
})
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.dashboard-title {
  font-size: 2rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.5rem;
}

.dashboard-subtitle {
  font-size: 1rem;
  color: #64748b;
  margin: 0;
}

/* Overview Card */
.overview-card {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.subscriptions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.subscription-row {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.subscription-row.clickable {
  cursor: pointer;
}

.subscription-row.clickable:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.subscription-type {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
}

.subscription-name {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.subscription-expire {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.empty-subscriptions {
  padding: 24px 8px;
  color: #94a3b8;
  text-align: center;
}

.overview-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.overview-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.overview-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.75rem;
  transition: all 0.2s ease;
}

.overview-item.clickable {
  cursor: pointer;
}

.overview-item.clickable:hover {
  background: #f8fafc;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.overview-icon {
  width: 48px;
  height: 48px;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.overview-icon svg {
  width: 24px;
  height: 24px;
}

.subscription-icon {
  background: #dbeafe;
  color: #3b82f6;
}

.traffic-icon {
  background: #dcfce7;
  color: #22c55e;
}

.balance-icon {
  background: #fef3c7;
  color: #f59e0b;
}

.commission-icon {
  background: #f3e8ff;
  color: #a855f7;
}

.overview-content {
  flex: 1;
  min-width: 0;
}

.overview-label {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.overview-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 0.25rem;
}

.overview-meta {
  font-size: 0.75rem;
  color: #94a3b8;
}

/* Quick Actions */
.quick-actions {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 1rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.actions-grid .n-button svg {
  width: 20px;
  height: 20px;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
}

.content-section {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.loading-state,
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem 1rem;
  color: #94a3b8;
}

/* Orders List */
.orders-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
  cursor: pointer;
}

.order-item:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.order-info {
  flex: 1;
  min-width: 0;
}

.order-id {
  font-weight: 600;
  color: #0f172a;
  font-size: 0.875rem;
}

.order-date {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 0.25rem;
}

.order-amount {
  font-weight: 600;
  color: #3b82f6;
  font-size: 1rem;
}

/* Notices List */
.notices-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.notice-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  background: #fef3c7;
  border: 1px solid #fde68a;
}

.notice-icon {
  width: 24px;
  height: 24px;
  color: #f59e0b;
  flex-shrink: 0;
}

.notice-icon svg {
  width: 100%;
  height: 100%;
}

.notice-content {
  flex: 1;
  min-width: 0;
}

.notice-title {
  font-weight: 600;
  color: #92400e;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.notice-text {
  font-size: 0.875rem;
  color: #78350f;
  line-height: 1.5;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.notice-date {
  font-size: 0.75rem;
  color: #a16207;
}

/* Responsive Design */
@media (max-width: 768px) {
  .dashboard {
    padding: 1rem;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
