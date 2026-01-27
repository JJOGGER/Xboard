<template>
  <div class="shared-plan-details-container">
    <!-- Header -->
    <div class="page-header">
      <div>
        <el-button @click="handleBack">
          <el-icon><ArrowLeft /></el-icon>
          {{ t('common.back') }}
        </el-button>
      </div>
      <div class="header-actions">
        <el-button type="success" @click="handleSync">
          <el-icon><Refresh /></el-icon>
          {{ t('sharedPlans.sync') }}
        </el-button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="5" animated />
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

    <!-- Plan Details -->
    <div v-else-if="currentPlan" class="details-content">
      <!-- Basic Info Card -->
      <el-card class="info-card">
        <template #header>
          <div class="card-header">
            <span>{{ t('sharedPlans.basicInfo') }}</span>
            <el-tag :type="getStatusType(currentPlan.sync_status)">
              {{ t(`sharedPlans.${currentPlan.sync_status}`) }}
            </el-tag>
          </div>
        </template>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">{{ t('sharedPlans.planName') }}</div>
            <div class="info-value">{{ currentPlan.name }}</div>
          </div>

          <div class="info-item">
            <div class="info-label">{{ t('sharedPlans.subscriptionFormat') }}</div>
            <div class="info-value">
              <el-tag>{{ currentPlan.subscription_format.toUpperCase() }}</el-tag>
            </div>
          </div>

          <div class="info-item">
            <div class="info-label">{{ t('sharedPlans.nodesCountLabel') }}</div>
            <div class="info-value">{{ currentPlan.nodes_count }}</div>
          </div>

          <div v-if="currentPlan.group" class="info-item">
            <div class="info-label">{{ t('sharedPlans.serverGroup') }}</div>
            <div class="info-value">
              <el-tag>{{ currentPlan.group.name }}</el-tag>
            </div>
          </div>

          <div v-if="currentPlan.tags && currentPlan.tags.length > 0" class="info-item full-width">
            <div class="info-label">{{ t('sharedPlans.tags') }}</div>
            <div class="info-value">
              <el-tag
                v-for="tag in currentPlan.tags"
                :key="tag"
                size="small"
                style="margin-right: 8px;"
              >
                {{ tag }}
              </el-tag>
            </div>
          </div>

          <div v-if="currentPlan.description" class="info-item full-width">
            <div class="info-label">{{ t('sharedPlans.planDescription') }}</div>
            <div class="info-value">{{ currentPlan.description }}</div>
          </div>
        </div>
      </el-card>

      <!-- Pricing Card -->
      <el-card v-if="currentPlan.prices" class="info-card">
        <template #header>
          <span>{{ t('sharedPlans.pricingTiers') }}</span>
        </template>

        <div class="pricing-grid">
          <div
            v-for="(price, period) in currentPlan.prices"
            :key="period"
            v-show="price && price > 0"
            class="pricing-item"
          >
            <div class="pricing-period">{{ getPeriodLabel(period) }}</div>
            <div class="pricing-value">¥{{ (price / 100).toFixed(2) }}</div>
          </div>
        </div>
      </el-card>

      <!-- Traffic Info Card -->
      <el-card v-if="currentPlan.total_traffic" class="info-card">
        <template #header>
          <span>{{ t('sharedPlans.trafficInfo') }}</span>
        </template>

        <div class="traffic-details">
          <div class="traffic-item">
            <div class="traffic-label">{{ t('sharedPlans.totalTrafficLabel') }}</div>
            <div class="traffic-value">{{ formatBytes(currentPlan.total_traffic) }}</div>
          </div>

          <div v-if="currentPlan.used_traffic" class="traffic-item">
            <div class="traffic-label">{{ t('sharedPlans.usedTrafficLabel') }}</div>
            <div class="traffic-value">{{ formatBytes(currentPlan.used_traffic) }}</div>
          </div>

          <div v-if="currentPlan.total_traffic && currentPlan.used_traffic" class="traffic-item">
            <div class="traffic-label">{{ t('sharedPlans.remainingTraffic') }}</div>
            <div class="traffic-value">
              {{ formatBytes(currentPlan.total_traffic - currentPlan.used_traffic) }}
            </div>
          </div>

          <el-alert
            type="info"
            :closable="false"
            show-icon
            class="traffic-note"
          >
            {{ t('sharedPlans.trafficShared') }}
          </el-alert>
        </div>
      </el-card>

      <!-- Sync Info Card -->
      <el-card class="info-card">
        <template #header>
          <span>{{ t('sharedPlans.syncInfo') }}</span>
        </template>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">{{ t('sharedPlans.lastSyncAt') }}</div>
            <div class="info-value">{{ formatDate(currentPlan.last_sync_at) }}</div>
          </div>

          <div class="info-item">
            <div class="info-label">{{ t('sharedPlans.syncStatusLabel') }}</div>
            <div class="info-value">
              <el-tag :type="getStatusType(currentPlan.sync_status)">
                {{ t(`sharedPlans.${currentPlan.sync_status}`) }}
              </el-tag>
            </div>
          </div>

          <div v-if="currentPlan.sync_fail_count > 0" class="info-item">
            <div class="info-label">{{ t('sharedPlans.syncFailCount') }}</div>
            <div class="info-value">{{ currentPlan.sync_fail_count }}</div>
          </div>

          <div v-if="currentPlan.sync_error" class="info-item full-width">
            <div class="info-label">{{ t('sharedPlans.syncError') }}</div>
            <div class="info-value error-text">{{ currentPlan.sync_error }}</div>
          </div>
        </div>
      </el-card>

      <!-- Slot Info Card -->
      <el-card class="info-card">
        <template #header>
          <span>{{ t('sharedPlans.slotInfo') }}</span>
        </template>

        <div class="slot-details">
          <div class="slot-stats">
            <div class="slot-stat">
              <div class="slot-stat-label">{{ t('sharedPlans.maxSlotsLabel') }}</div>
              <div class="slot-stat-value">{{ currentPlan.max_slots }}</div>
            </div>

            <div class="slot-stat">
              <div class="slot-stat-label">{{ t('sharedPlans.usedSlotsLabel') }}</div>
              <div class="slot-stat-value">{{ currentPlan.used_slots }}</div>
            </div>

            <div class="slot-stat">
              <div class="slot-stat-label">{{ t('sharedPlans.availableSlots') }}</div>
              <div class="slot-stat-value">{{ currentPlan.max_slots - currentPlan.used_slots }}</div>
            </div>
          </div>

          <el-progress
            :percentage="(currentPlan.used_slots / currentPlan.max_slots) * 100"
            :status="currentPlan.used_slots >= currentPlan.max_slots ? 'exception' : 'success'"
          />
        </div>
      </el-card>

      <!-- Slot List Card -->
      <el-card class="info-card">
        <template #header>
          <span>{{ t('sharedPlans.slotList') }}</span>
        </template>

        <el-table
          v-if="currentSlots.length > 0"
          :data="currentSlots"
          stripe
        >
          <el-table-column prop="user.email" :label="t('sharedPlans.user')" />
          <el-table-column :label="t('sharedPlans.allocatedAt')">
            <template #default="{ row }">
              {{ formatDate(row.allocated_at) }}
            </template>
          </el-table-column>
          <el-table-column :label="t('sharedPlans.slotExpireAt')">
            <template #default="{ row }">
              {{ formatDate(row.expire_at) }}
            </template>
          </el-table-column>
          <el-table-column :label="t('sharedPlans.slotStatus')">
            <template #default="{ row }">
              <el-tag :type="getSlotStatusType(row.status)" size="small">
                {{ t(`sharedPlans.slot${capitalize(row.status)}`) }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>

        <el-empty
          v-else
          :description="t('sharedPlans.noSlots')"
        />
      </el-card>

      <!-- Nodes List Card -->
      <el-card class="info-card">
        <template #header>
          <span>{{ t('sharedPlans.nodesList') }}</span>
        </template>

        <el-table
          v-if="currentPlan.nodes_config && currentPlan.nodes_config.length > 0"
          :data="currentPlan.nodes_config"
          stripe
          max-height="400"
        >
          <el-table-column :label="t('sharedPlans.nodeName')">
            <template #default="{ row }">
              {{ row.name || row.ps || '-' }}
            </template>
          </el-table-column>
          <el-table-column :label="t('sharedPlans.nodeProtocol')">
            <template #default="{ row }">
              <el-tag size="small">{{ getProtocolFromNode(row) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('sharedPlans.nodeServer')">
            <template #default="{ row }">
              {{ row.server || row.host || '-' }}
            </template>
          </el-table-column>
          <el-table-column :label="t('sharedPlans.nodePort')">
            <template #default="{ row }">
              {{ row.port || '-' }}
            </template>
          </el-table-column>
        </el-table>

        <el-empty
          v-else
          :description="t('sharedPlans.noNodes')"
        />
      </el-card>

      <!-- Sync Logs Card -->
      <el-card class="info-card">
        <template #header>
          <div class="card-header">
            <span>{{ t('sharedPlans.syncLogs') }}</span>
            <el-button size="small" @click="handleRefreshLogs">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
        </template>

        <el-table
          v-if="syncLogs.length > 0"
          :data="syncLogs"
          stripe
        >
          <el-table-column :label="t('sharedPlans.syncTime')">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column :label="t('sharedPlans.result')">
            <template #default="{ row }">
              <el-tag :type="row.sync_status === 'success' ? 'success' : 'danger'" size="small">
                {{ t(`sharedPlans.${row.sync_status}`) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="nodes_count" :label="t('sharedPlans.nodesCountLabel')" />
          <el-table-column :label="t('sharedPlans.duration')">
            <template #default="{ row }">
              {{ row.duration_ms ? `${row.duration_ms}ms` : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="error_message" :label="t('sharedPlans.errorMessage')" show-overflow-tooltip />
        </el-table>

        <el-empty
          v-else
          :description="t('sharedPlans.noLogs')"
        />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Refresh } from '@element-plus/icons-vue';
import { useSharedPlanStore } from '../../stores/sharedPlan';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const sharedPlanStore = useSharedPlanStore();

// Computed
const loading = computed(() => sharedPlanStore.loading);
const error = computed(() => sharedPlanStore.error);
const currentPlan = computed(() => sharedPlanStore.currentPlan);
const currentSlots = computed(() => sharedPlanStore.currentSlots);
const syncLogs = computed(() => sharedPlanStore.syncLogs);

// Methods
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

const getSlotStatusType = (status: string): string => {
  const types: Record<string, string> = {
    active: 'success',
    expired: 'warning',
    cancelled: 'info',
  };
  return types[status] || 'info';
};

const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const getProtocolFromNode = (node: any): string => {
  // Try to determine protocol from node properties
  if (node.type) return node.type.toUpperCase();
  if (node.protocol) return node.protocol.toUpperCase();
  
  // Fallback: check common node properties
  if (node.v) return 'VMESS';
  if (node.ss) return 'SHADOWSOCKS';
  if (node.trojan) return 'TROJAN';
  if (node.hysteria) return 'HYSTERIA';
  if (node.hysteria2) return 'HYSTERIA2';
  if (node.vless) return 'VLESS';
  
  return 'UNKNOWN';
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

const handleBack = () => {
  router.back();
};

const handleSync = async () => {
  if (!currentPlan.value) return;

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

    await sharedPlanStore.syncSubscription(currentPlan.value.id);
    ElMessage.success(t('sharedPlans.syncSuccess'));
    await fetchDetails();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('sharedPlans.syncFailed'));
    }
  }
};

const handleRefreshLogs = async () => {
  const planId = Number(route.params.id);
  if (planId) {
    await sharedPlanStore.fetchSyncLogs(planId);
  }
};

const fetchDetails = async () => {
  const planId = Number(route.params.id);
  if (planId) {
    try {
      await sharedPlanStore.fetchPlanDetails(planId);
      await sharedPlanStore.fetchSyncLogs(planId);
    } catch (error) {
      // Error is handled by store
    }
  }
};

// Lifecycle
onMounted(() => {
  fetchDetails();
});
</script>

<style scoped>
.shared-plan-details-container {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.loading-container {
  padding: 24px;
}

.error-alert {
  margin-bottom: 24px;
}

.details-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-card {
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.info-item {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.error-text {
  color: #f56c6c;
}

.traffic-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.traffic-item {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.traffic-label {
  font-size: 14px;
  color: #909399;
}

.traffic-value {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.traffic-note {
  margin-top: 8px;
}

.slot-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.slot-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.slot-stat {
  text-align: center;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
}

.slot-stat-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.slot-stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #409eff;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

.pricing-item {
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  text-align: center;
  color: white;
  transition: transform 0.2s;
}

.pricing-item:hover {
  transform: translateY(-2px);
}

.pricing-period {
  font-size: 12px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.pricing-value {
  font-size: 20px;
  font-weight: 700;
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .slot-stats {
    grid-template-columns: 1fr;
  }
  
  .pricing-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
