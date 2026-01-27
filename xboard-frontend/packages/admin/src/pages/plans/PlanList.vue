<template>
  <div class="plan-list-container">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('plans.title') }}</h1>
        <p class="page-description">{{ t('plans.description') }}</p>
      </div>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        {{ t('plans.createPlan') }}
      </el-button>
    </div>

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
    <div v-else class="plans-grid">
      <draggable
        v-model="sortedPlansList"
        item-key="id"
        handle=".drag-handle"
        @end="handleSortEnd"
        class="draggable-container"
      >
        <template #item="{ element: plan }">
          <el-card class="plan-card" :class="{ 'plan-hidden': plan.show === 0 }">
            <!-- Drag Handle -->
            <div class="drag-handle">
              <el-icon><Rank /></el-icon>
            </div>

            <!-- Plan Header -->
            <div class="plan-header">
              <div class="plan-title-section">
                <h3 class="plan-name">{{ plan.name }}</h3>
                <el-tag v-if="plan.show === 0" type="info" size="small">{{ t('plans.hidden') }}</el-tag>
                <el-tag v-else type="success" size="small">{{ t('plans.visible') }}</el-tag>
              </div>
              
              <div class="plan-actions">
                <el-tooltip :content="t('plans.edit')">
                  <el-button
                    type="primary"
                    size="small"
                    circle
                    @click="handleEdit(plan)"
                  >
                    <el-icon><Edit /></el-icon>
                  </el-button>
                </el-tooltip>
                
                <el-tooltip :content="plan.show === 1 ? t('plans.hide') : t('plans.show')">
                  <el-button
                    :type="plan.show === 1 ? 'warning' : 'success'"
                    size="small"
                    circle
                    @click="handleToggleVisibility(plan)"
                  >
                    <el-icon v-if="plan.show === 1"><Hide /></el-icon>
                    <el-icon v-else><View /></el-icon>
                  </el-button>
                </el-tooltip>
                
                <el-tooltip :content="t('plans.copy')">
                  <el-button
                    type="info"
                    size="small"
                    circle
                    @click="handleCopy(plan)"
                  >
                    <el-icon><DocumentCopy /></el-icon>
                  </el-button>
                </el-tooltip>
                
                <el-tooltip :content="t('plans.delete')">
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
              <p class="plan-description">{{ plan.content || t('plans.noDescription') }}</p>
              
              <!-- Pricing Tiers -->
              <div class="pricing-section">
                <h4 class="section-title">{{ t('plans.pricing') }}</h4>
                <div class="pricing-grid">
                  <div v-if="plan.month_price" class="price-item">
                    <span class="price-label">{{ t('plans.monthly') }}</span>
                    <span class="price-value">${{ formatPrice(plan.month_price) }}</span>
                  </div>
                  <div v-if="plan.quarter_price" class="price-item">
                    <span class="price-label">{{ t('plans.quarterly') }}</span>
                    <span class="price-value">${{ formatPrice(plan.quarter_price) }}</span>
                  </div>
                  <div v-if="plan.half_year_price" class="price-item">
                    <span class="price-label">{{ t('plans.halfYear') }}</span>
                    <span class="price-value">${{ formatPrice(plan.half_year_price) }}</span>
                  </div>
                  <div v-if="plan.year_price" class="price-item">
                    <span class="price-label">{{ t('plans.yearly') }}</span>
                    <span class="price-value">${{ formatPrice(plan.year_price) }}</span>
                  </div>
                  <div v-if="plan.two_year_price" class="price-item">
                    <span class="price-label">{{ t('plans.twoYears') }}</span>
                    <span class="price-value">${{ formatPrice(plan.two_year_price) }}</span>
                  </div>
                  <div v-if="plan.three_year_price" class="price-item">
                    <span class="price-label">{{ t('plans.threeYears') }}</span>
                    <span class="price-value">${{ formatPrice(plan.three_year_price) }}</span>
                  </div>
                  <div v-if="plan.onetime_price" class="price-item">
                    <span class="price-label">{{ t('plans.onetime') }}</span>
                    <span class="price-value">${{ formatPrice(plan.onetime_price) }}</span>
                  </div>
                  <div v-if="plan.reset_price" class="price-item">
                    <span class="price-label">{{ t('plans.reset') }}</span>
                    <span class="price-value">${{ formatPrice(plan.reset_price) }}</span>
                  </div>
                </div>
              </div>

              <!-- Features -->
              <div class="features-section">
                <h4 class="section-title">{{ t('plans.features') }}</h4>
                <div class="features-list">
                  <div class="feature-item">
                    <el-icon><Connection /></el-icon>
                    <span>{{ formatBytes(plan.transfer_enable) }} {{ t('plans.traffic') }}</span>
                  </div>
                  <div v-if="plan.speed_limit" class="feature-item">
                    <el-icon><Odometer /></el-icon>
                    <span>{{ plan.speed_limit }} Mbps {{ t('plans.speedLimit') }}</span>
                  </div>
                  <div v-if="plan.device_limit" class="feature-item">
                    <el-icon><Monitor /></el-icon>
                    <span>{{ plan.device_limit }} {{ plan.device_limit > 1 ? t('plans.devices') : t('plans.device') }}</span>
                  </div>
                  <div class="feature-item">
                    <el-icon><Grid /></el-icon>
                    <span>{{ plan.group_id.length }} {{ plan.group_id.length !== 1 ? t('plans.serverGroups') : t('plans.serverGroup') }}</span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </template>
      </draggable>
    </div>

    <!-- Empty State -->
    <el-empty
      v-if="!loading && !error && plans.length === 0"
      :description="t('plans.noPlans')"
    >
      <el-button type="primary" @click="handleCreate">{{ t('plans.createFirst') }}</el-button>
    </el-empty>

    <!-- Plan Form Modal -->
    <PlanFormModal
      v-model:visible="formVisible"
      :plan="selectedPlan"
      @success="handleFormSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus,
  Edit,
  Delete,
  Hide,
  View,
  DocumentCopy,
  Rank,
  Connection,
  Odometer,
  Monitor,
  Grid,
} from '@element-plus/icons-vue';
import draggable from 'vuedraggable';
import { usePlanStore } from '../../stores/plan';
import { formatBytes } from '@xboard/shared/utils';
import type { Plan } from '@xboard/shared/types';
// Lazy load modal component
import { defineAsyncComponent } from 'vue';
const PlanFormModal = defineAsyncComponent(() => import('../../components/plans/PlanFormModal.vue'));

// Store
const planStore = usePlanStore();
const { t } = useI18n();

// State
const formVisible = ref(false);
const selectedPlan = ref<Plan | null>(null);

// Computed
const loading = computed(() => planStore.loading);
const error = computed(() => planStore.error);
const plans = computed(() => planStore.sortedPlans);

// Sortable list (v-model for draggable)
const sortedPlansList = computed({
  get: () => planStore.sortedPlans,
  set: (_value) => {
    // Update will be handled in handleSortEnd
  },
});

// Methods
const formatPrice = (price: number): string => {
  return (price / 100).toFixed(2);
};

const handleCreate = () => {
  selectedPlan.value = null;
  formVisible.value = true;
};

const handleEdit = (plan: Plan) => {
  selectedPlan.value = plan;
  formVisible.value = true;
};

const handleToggleVisibility = async (plan: Plan) => {
  try {
    await planStore.toggleVisibility(plan.id);
    ElMessage.success(
      plan.show === 1 ? t('plans.planHidden') : t('plans.planShown')
    );
  } catch (error) {
    ElMessage.error(t('plans.toggleVisibilityFailed'));
  }
};

const handleCopy = async (plan: Plan) => {
  try {
    await planStore.copyPlan(plan.id);
    ElMessage.success(t('plans.planCopied'));
  } catch (error) {
    ElMessage.error(t('plans.copyFailed'));
  }
};

const handleDelete = async (plan: Plan) => {
  try {
    await ElMessageBox.confirm(
      t('plans.deleteConfirm', { name: plan.name }),
      t('plans.deleteTitle'),
      {
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await planStore.deletePlan(plan.id);
    ElMessage.success(t('plans.planDeleted'));
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('plans.deleteFailed'));
    }
  }
};

const handleSortEnd = async () => {
  const planIds = sortedPlansList.value.map(plan => plan.id);
  try {
    await planStore.updateSort(planIds);
    ElMessage.success(t('plans.orderUpdated'));
  } catch (error) {
    ElMessage.error(t('plans.updateOrderFailed'));
    // Refresh to restore original order
    await planStore.fetchPlans();
  }
};

const handleFormSuccess = () => {
  formVisible.value = false;
  selectedPlan.value = null;
};

// Lifecycle
onMounted(async () => {
  try {
    await planStore.fetchPlans();
  } catch (error) {
    // Error is handled by store
  }
});
</script>

<style scoped>
.plan-list-container {
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

.draggable-container {
  display: contents;
}

.plan-card {
  position: relative;
  transition: all 0.3s ease;
  cursor: move;
}

.plan-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.plan-hidden {
  opacity: 0.6;
}

.drag-handle {
  position: absolute;
  top: 12px;
  left: 12px;
  cursor: move;
  color: #909399;
  font-size: 18px;
}

.drag-handle:hover {
  color: #606266;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  padding-left: 32px;
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

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
}

.pricing-section {
  margin-bottom: 16px;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.price-item {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.price-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.price-value {
  font-size: 16px;
  font-weight: 600;
  color: #409eff;
}

.features-section {
  margin-top: 16px;
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.feature-item .el-icon {
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
}
</style>
