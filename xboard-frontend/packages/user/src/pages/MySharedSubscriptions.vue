<template>
  <div class="my-subscriptions-page">
    <div class="page-header">
      <h1 class="page-title">{{ t('sharedPlans.mySubscriptions.title') }}</h1>
      <p class="page-subtitle">{{ t('sharedPlans.mySubscriptions.subtitle') }}</p>
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
      <n-button type="primary" @click="fetchSubscriptions">
        {{ t('common.retry') }}
      </n-button>
    </div>

    <!-- Subscriptions List -->
    <div v-else-if="userSubscriptions.length > 0" class="subscriptions-list">
      <div
        v-for="sub in userSubscriptions"
        :key="sub.slot.id"
        class="subscription-card"
        :class="{ 'subscription-expired': sub.slot.status === 'expired' }"
      >
        <!-- Card Header -->
        <div class="card-header">
          <div class="header-left">
            <h3 class="plan-name">{{ sub.plan.name }}</h3>
            <div class="plan-format">
              <svg class="format-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{{ sub.plan.subscription_format.toUpperCase() }}</span>
            </div>
          </div>
          <div class="status-badge" :class="`status-${sub.slot.status}`">
            {{ t(`sharedPlans.mySubscriptions.${sub.slot.status}`) }}
          </div>
        </div>

        <!-- Plan Info -->
        <div class="plan-info">
          <div class="info-item">
            <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2v20M2 12h20" />
            </svg>
            <div class="info-content">
              <span class="info-label">{{ t('sharedPlans.mySubscriptions.nodes') }}</span>
              <span class="info-value">{{ sub.plan.nodes_count }}</span>
            </div>
          </div>

          <div v-if="sub.plan.total_traffic" class="info-item">
            <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            <div class="info-content">
              <span class="info-label">{{ t('sharedPlans.mySubscriptions.traffic') }}</span>
              <span class="info-value">
                {{ formatBytes(sub.plan.total_traffic) }}
                <span class="traffic-shared">({{ t('sharedPlans.mySubscriptions.shared') }})</span>
              </span>
            </div>
          </div>

          <div class="info-item">
            <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <div class="info-content">
              <span class="info-label">{{ t('sharedPlans.mySubscriptions.expiresAt') }}</span>
              <span class="info-value">{{ formatDate(sub.slot.expire_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Subscription URL -->
        <div class="subscription-url-section">
          <div class="url-header">
            <span class="url-label">{{ t('sharedPlans.mySubscriptions.subscriptionUrl') }}</span>
          </div>
          <div class="url-input-group">
            <input
              type="text"
              :value="sub.subscription_url"
              readonly
              class="url-input"
            />
            <n-button
              type="primary"
              @click="copyToClipboard(sub.subscription_url)"
            >
              <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {{ copiedUrl === sub.subscription_url ? t('sharedPlans.mySubscriptions.copied') : t('sharedPlans.mySubscriptions.copy') }}
            </n-button>
          </div>
        </div>

        <!-- Traffic Notice -->
        <div v-if="sub.plan.total_traffic" class="traffic-notice">
          <svg class="notice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>{{ t('sharedPlans.trafficShared') }}</span>
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
      <p class="empty-message">{{ t('sharedPlans.mySubscriptions.noSubscriptions') }}</p>
      <n-button type="primary" @click="goToSharedPlans">
        {{ t('sharedPlans.title') }}
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { NButton, NSpin, useMessage } from 'naive-ui';
import { useSharedPlanStore } from '../stores/sharedPlan';

const { t } = useI18n();
const router = useRouter();
const message = useMessage();
const sharedPlanStore = useSharedPlanStore();

const copiedUrl = ref<string | null>(null);

const loading = computed(() => sharedPlanStore.loading);
const error = computed(() => sharedPlanStore.error);
const userSubscriptions = computed(() => sharedPlanStore.userSubscriptions);

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString();
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    copiedUrl.value = text;
    message.success(t('sharedPlans.mySubscriptions.copied'));
    
    // Reset after 2 seconds
    setTimeout(() => {
      copiedUrl.value = null;
    }, 2000);
  } catch (err) {
    message.error('Failed to copy');
  }
};

const fetchSubscriptions = async () => {
  try {
    await sharedPlanStore.fetchUserSubscriptions();
  } catch (err: any) {
    console.error('Failed to fetch subscriptions:', err);
    // Set error message for display
    if (!sharedPlanStore.error) {
      sharedPlanStore.error = err.message || 'Failed to fetch subscriptions';
    }
  }
};

const goToSharedPlans = () => {
  router.push({ name: 'SharedPlans' });
};

onMounted(() => {
  fetchSubscriptions();
});
</script>

<style scoped>
.my-subscriptions-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  text-align: center;
  margin-bottom: 48px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 12px 0;
}

.page-subtitle {
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

.subscriptions-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.subscription-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.subscription-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.subscription-card.subscription-expired {
  opacity: 0.7;
  border-left: 4px solid #d03050;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.plan-name {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
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

.status-badge {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.status-active {
  background: #e6f7e6;
  color: #18a058;
}

.status-expired {
  background: #ffe6e6;
  color: #d03050;
}

.status-cancelled {
  background: #f0f0f0;
  color: #666;
}

.plan-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f8f8;
  border-radius: 8px;
}

.info-icon {
  width: 20px;
  height: 20px;
  color: #666;
  flex-shrink: 0;
}

.info-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
}

.info-label {
  font-size: 13px;
  color: #666;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.traffic-shared {
  font-size: 12px;
  font-weight: 400;
  color: #999;
  margin-left: 4px;
}

.subscription-url-section {
  margin-bottom: 16px;
}

.url-header {
  margin-bottom: 8px;
}

.url-label {
  font-size: 13px;
  font-weight: 600;
  color: #666;
}

.url-input-group {
  display: flex;
  gap: 8px;
}

.url-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 13px;
  font-family: monospace;
  background: #f8f8f8;
  color: #1a1a1a;
}

.url-input:focus {
  outline: none;
  border-color: #18a058;
}

.copy-icon {
  width: 16px;
  height: 16px;
  margin-right: 4px;
}

.traffic-notice {
  display: flex;
  align-items: center;
  gap: 8px;
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
  .page-title {
    font-size: 24px;
  }
  
  .page-subtitle {
    font-size: 14px;
  }
  
  .card-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .header-left {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .url-input-group {
    flex-direction: column;
  }
}
</style>
