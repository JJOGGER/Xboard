<template>
  <div class="traffic-reset-page">
    <el-card class="page-header" shadow="never">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">{{ t('trafficReset.title') }}</h2>
          <p class="mt-1 text-sm text-gray-600">{{ t('trafficReset.description') }}</p>
        </div>
        <el-button type="primary" @click="handleManualReset">
          <el-icon class="mr-2"><Refresh /></el-icon>
          {{ t('trafficReset.manualReset') }}
        </el-button>
      </div>
    </el-card>

    <!-- Statistics -->
    <el-row :gutter="20" class="mt-4">
      <el-col :xs="24" :sm="8">
        <el-card shadow="never">
          <div class="stat-card">
            <div class="stat-icon total">
              <el-icon :size="32"><DataAnalysis /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">{{ t('trafficReset.totalResets') }}</div>
              <div class="stat-value">{{ systemStore.trafficResetStats?.total_resets || 0 }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="8">
        <el-card shadow="never">
          <div class="stat-card">
            <div class="stat-icon users">
              <el-icon :size="32"><User /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">{{ t('trafficReset.affectedUsers') }}</div>
              <div class="stat-value">{{ systemStore.trafficResetStats?.affected_users || 0 }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="8">
        <el-card shadow="never">
          <div class="stat-card">
            <div class="stat-icon today">
              <el-icon :size="32"><Calendar /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">{{ t('trafficReset.todayResets') }}</div>
              <div class="stat-value">{{ systemStore.trafficResetStats?.today_resets || 0 }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Reset Logs -->
    <el-card class="mt-4" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="font-semibold">{{ t('trafficReset.resetLogs') }}</span>
        </div>
      </template>
      
      <div class="mb-4">
        <el-form inline>
          <el-form-item :label="t('trafficReset.userId')">
            <el-input
              v-model="filters.user_id"
              :placeholder="t('trafficReset.userIdPlaceholder')"
              clearable
              @change="handleFilterChange"
            />
          </el-form-item>
          
          <el-form-item :label="t('trafficReset.dateRange')">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              :start-placeholder="t('common.startDate')"
              :end-placeholder="t('common.endDate')"
              @change="handleDateRangeChange"
            />
          </el-form-item>
        </el-form>
      </div>
      
      <el-table
        :data="systemStore.trafficResetLogs"
        v-loading="systemStore.loading"
        class="reset-logs-table"
      >
        <el-table-column type="index" width="60" :label="t('common.index')" />
        
        <el-table-column prop="user_id" :label="t('trafficReset.userId')" width="100" />
        
        <el-table-column :label="t('trafficReset.userEmail')" min-width="180">
          <template #default="{ row }">
            <span class="text-gray-600">{{ row.user?.email || '-' }}</span>
          </template>
        </el-table-column>
        
        <el-table-column :label="t('trafficReset.beforeReset')" min-width="150">
          <template #default="{ row }">
            <div class="text-sm">
              <div>{{ t('trafficReset.upload') }}: {{ formatBytes(row.u_before) }}</div>
              <div>{{ t('trafficReset.download') }}: {{ formatBytes(row.d_before) }}</div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column :label="t('trafficReset.afterReset')" min-width="150">
          <template #default="{ row }">
            <div class="text-sm">
              <div>{{ t('trafficReset.upload') }}: {{ formatBytes(row.u_after) }}</div>
              <div>{{ t('trafficReset.download') }}: {{ formatBytes(row.d_after) }}</div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column :label="t('trafficReset.resetType')" width="120">
          <template #default="{ row }">
            <el-tag :type="getResetTypeTag(row.reset_type)" size="small">
              {{ t(`trafficReset.types.${row.reset_type}`) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="created_at" :label="t('trafficReset.resetTime')" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
      
      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.page_size"
          :total="systemStore.trafficResetLogsTotal"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- Manual Reset Modal -->
    <el-dialog
      v-model="showManualResetModal"
      :title="t('trafficReset.manualReset')"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="resetFormRef"
        :model="resetForm"
        :rules="resetRules"
        label-width="120px"
      >
        <el-form-item :label="t('trafficReset.userId')" prop="user_id">
          <el-input
            v-model.number="resetForm.user_id"
            type="number"
            :placeholder="t('trafficReset.userIdPlaceholder')"
          />
        </el-form-item>
        
        <el-form-item :label="t('trafficReset.resetType')" prop="reset_type">
          <el-select v-model="resetForm.reset_type" :placeholder="t('trafficReset.selectResetType')">
            <el-option :label="t('trafficReset.types.manual')" value="manual" />
            <el-option :label="t('trafficReset.types.scheduled')" value="scheduled" />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showManualResetModal = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="resetting" @click="handleManualResetSubmit">
          {{ t('common.confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import {
  Refresh,
  DataAnalysis,
  User,
  Calendar,
} from '@element-plus/icons-vue';
import { useSystemStore } from '../../stores/system';
import { formatDate as formatDateTime, formatBytes } from '@xboard/shared/utils';

const { t } = useI18n();
const systemStore = useSystemStore();

// State
const dateRange = ref<[Date, Date] | null>(null);
const filters = reactive({
  user_id: undefined as number | undefined,
  date_start: undefined as string | undefined,
  date_end: undefined as string | undefined,
});
const pagination = reactive({
  page: 1,
  page_size: 20,
});
const showManualResetModal = ref(false);
const resetting = ref(false);
const resetFormRef = ref<FormInstance>();
const resetForm = reactive({
  user_id: undefined as number | undefined,
  reset_type: 'manual',
});

// Rules
const resetRules: FormRules = {
  user_id: [
    { required: true, message: t('trafficReset.userIdRequired'), trigger: 'blur' },
  ],
  reset_type: [
    { required: true, message: t('trafficReset.resetTypeRequired'), trigger: 'change' },
  ],
};

// Methods
async function loadData() {
  await Promise.all([
    systemStore.fetchTrafficResetStats(),
    loadLogs(),
  ]);
}

async function loadLogs() {
  await systemStore.fetchTrafficResetLogs({
    ...pagination,
    ...filters,
  });
}

function getResetTypeTag(type: string) {
  const typeMap: Record<string, any> = {
    manual: 'primary',
    scheduled: 'success',
    automatic: 'info',
  };
  return typeMap[type] || 'info';
}

function handleFilterChange() {
  pagination.page = 1;
  loadLogs();
}

function handleDateRangeChange() {
  if (dateRange.value) {
    filters.date_start = dateRange.value[0].toISOString().split('T')[0];
    filters.date_end = dateRange.value[1].toISOString().split('T')[0];
  } else {
    filters.date_start = undefined;
    filters.date_end = undefined;
  }
  handleFilterChange();
}

function handlePageChange() {
  loadLogs();
}

function handleSizeChange() {
  pagination.page = 1;
  loadLogs();
}

function handleManualReset() {
  resetForm.user_id = undefined;
  resetForm.reset_type = 'manual';
  showManualResetModal.value = true;
}

async function handleManualResetSubmit() {
  if (!resetFormRef.value) return;
  
  await resetFormRef.value.validate(async (valid) => {
    if (!valid) return;
    
    resetting.value = true;
    try {
      await systemStore.manualReset({
        user_id: resetForm.user_id!,
        reset_type: resetForm.reset_type,
      });
      
      showManualResetModal.value = false;
      loadData();
    } catch (error) {
      // Error handled by store
    } finally {
      resetting.value = false;
    }
  });
}

// Lifecycle
onMounted(() => {
  loadData();
});
</script>

<style scoped lang="scss">
.traffic-reset-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  
  .stat-icon {
    width: 64px;
    height: 64px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    
    &.total {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    &.users {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    
    &.today {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }
  }
  
  .stat-content {
    flex: 1;
    
    .stat-label {
      font-size: 14px;
      color: #909399;
      margin-bottom: 4px;
    }
    
    .stat-value {
      font-size: 28px;
      font-weight: 600;
      color: #303133;
    }
  }
}

.reset-logs-table {
  width: 100%;
}
</style>
