<template>
  <div class="system-monitoring-page">
    <el-card class="page-header" shadow="never">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">{{ t('system.title') }}</h2>
          <p class="mt-1 text-sm text-gray-600">{{ t('system.description') }}</p>
        </div>
        <el-button @click="handleRefresh" :loading="systemStore.loading">
          <el-icon class="mr-2"><Refresh /></el-icon>
          {{ t('common.refresh') }}
        </el-button>
      </div>
    </el-card>

    <!-- System Status -->
    <el-row :gutter="20" class="mt-4">
      <el-col :xs="24" :sm="12" :md="8">
        <el-card shadow="never">
          <div class="stat-card">
            <div class="stat-icon cpu">
              <el-icon :size="32"><Monitor /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">{{ t('system.cpuUsage') }}</div>
              <div class="stat-value">{{ systemStore.systemStatus?.cpu_usage || 0 }}%</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="8">
        <el-card shadow="never">
          <div class="stat-card">
            <div class="stat-icon memory">
              <el-icon :size="32"><Coin /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">{{ t('system.memoryUsage') }}</div>
              <div class="stat-value">{{ systemStore.systemStatus?.memory_usage || 0 }}%</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="8">
        <el-card shadow="never">
          <div class="stat-card">
            <div class="stat-icon disk">
              <el-icon :size="32"><FolderOpened /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">{{ t('system.diskUsage') }}</div>
              <div class="stat-value">{{ systemStore.systemStatus?.disk_usage || 0 }}%</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Queue Statistics -->
    <el-card class="mt-4" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="font-semibold">{{ t('system.queueStats') }}</span>
        </div>
      </template>
      
      <el-row :gutter="20">
        <el-col :xs="24" :sm="8">
          <div class="queue-stat">
            <div class="queue-stat-label">{{ t('system.pendingJobs') }}</div>
            <div class="queue-stat-value pending">{{ systemStore.queueStats?.pending || 0 }}</div>
          </div>
        </el-col>
        
        <el-col :xs="24" :sm="8">
          <div class="queue-stat">
            <div class="queue-stat-label">{{ t('system.processingJobs') }}</div>
            <div class="queue-stat-value processing">{{ systemStore.queueStats?.processing || 0 }}</div>
          </div>
        </el-col>
        
        <el-col :xs="24" :sm="8">
          <div class="queue-stat">
            <div class="queue-stat-label">{{ t('system.failedJobs') }}</div>
            <div class="queue-stat-value failed">{{ systemStore.queueStats?.failed || 0 }}</div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- Tabs for Logs and Failed Jobs -->
    <el-card class="mt-4" shadow="never">
      <el-tabs v-model="activeTab">
        <!-- System Logs -->
        <el-tab-pane :label="t('system.systemLogs')" name="logs">
          <div class="mb-4 flex items-center justify-between">
            <el-form inline>
              <el-form-item :label="t('system.logLevel')">
                <el-select v-model="logFilters.level" @change="handleLogFilterChange" clearable>
                  <el-option label="Debug" value="debug" />
                  <el-option label="Info" value="info" />
                  <el-option label="Warning" value="warning" />
                  <el-option label="Error" value="error" />
                </el-select>
              </el-form-item>
            </el-form>
            
            <el-button type="danger" @click="handleClearLogs">
              <el-icon class="mr-2"><Delete /></el-icon>
              {{ t('system.clearLogs') }}
            </el-button>
          </div>
          
          <el-table
            :data="systemStore.logs"
            v-loading="systemStore.loading"
            class="logs-table"
          >
            <el-table-column prop="level" :label="t('system.level')" width="100">
              <template #default="{ row }">
                <el-tag :type="getLogLevelType(row.level)" size="small">
                  {{ row.level }}
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column prop="message" :label="t('system.message')" min-width="300" />
            
            <el-table-column prop="context" :label="t('system.context')" min-width="200">
              <template #default="{ row }">
                <span class="text-gray-600 text-sm">{{ formatContext(row.context) }}</span>
              </template>
            </el-table-column>
            
            <el-table-column prop="created_at" :label="t('system.time')" width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.created_at) }}
              </template>
            </el-table-column>
          </el-table>
          
          <div class="mt-4 flex justify-end">
            <el-pagination
              v-model:current-page="logPagination.page"
              v-model:page-size="logPagination.page_size"
              :total="systemStore.logsTotal"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              @current-change="handleLogPageChange"
              @size-change="handleLogSizeChange"
            />
          </div>
        </el-tab-pane>

        <!-- Failed Jobs -->
        <el-tab-pane :label="t('system.failedJobs')" name="failed-jobs">
          <el-table
            :data="systemStore.failedJobs"
            v-loading="systemStore.loading"
            class="failed-jobs-table"
          >
            <el-table-column type="index" width="60" :label="t('common.index')" />
            
            <el-table-column prop="queue" :label="t('system.queue')" width="120" />
            
            <el-table-column prop="payload" :label="t('system.payload')" min-width="200">
              <template #default="{ row }">
                <span class="text-gray-600 text-sm">{{ formatPayload(row.payload) }}</span>
              </template>
            </el-table-column>
            
            <el-table-column prop="exception" :label="t('system.exception')" min-width="250">
              <template #default="{ row }">
                <el-tooltip :content="row.exception" placement="top">
                  <span class="text-red-600 text-sm truncate block">{{ row.exception }}</span>
                </el-tooltip>
              </template>
            </el-table-column>
            
            <el-table-column prop="failed_at" :label="t('system.failedAt')" width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.failed_at) }}
              </template>
            </el-table-column>
            
            <el-table-column :label="t('common.actions')" width="150" fixed="right">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  size="small"
                  link
                  @click="handleRetryJob(row)"
                >
                  {{ t('system.retry') }}
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  link
                  @click="handleDeleteJob(row)"
                >
                  {{ t('common.delete') }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="mt-4 flex justify-end">
            <el-pagination
              v-model:current-page="jobPagination.page"
              v-model:page-size="jobPagination.page_size"
              :total="systemStore.failedJobsTotal"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              @current-change="handleJobPageChange"
              @size-change="handleJobSizeChange"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Refresh,
  Monitor,
  Coin,
  FolderOpened,
  Delete,
} from '@element-plus/icons-vue';
import { useSystemStore } from '../../stores/system';
import { formatDate as formatDateTime } from '@xboard/shared/utils';
import type { FailedJob } from '@xboard/shared/types/system';

const { t } = useI18n();
const systemStore = useSystemStore();

// State
const activeTab = ref('logs');
const logFilters = reactive({
  level: undefined as string | undefined,
});
const logPagination = reactive({
  page: 1,
  page_size: 20,
});
const jobPagination = reactive({
  page: 1,
  page_size: 20,
});

// Methods
async function loadSystemData() {
  try {
    await Promise.all([
      systemStore.fetchStatus().catch(handleApiNotImplemented),
      systemStore.fetchQueueStats().catch(handleApiNotImplemented),
      loadLogs(),
      loadFailedJobs(),
    ]);
  } catch (error) {
    // Errors already handled
  }
}

function handleApiNotImplemented(error: any) {
  if (error.status === 404) {
    console.warn('System monitoring API not fully implemented');
    return;
  }
  throw error;
}

async function loadLogs() {
  try {
    await systemStore.fetchLogs({
      ...logPagination,
      ...logFilters,
    });
  } catch (error: any) {
    if (error.status === 404) {
      console.warn('System logs API not implemented');
      return;
    }
    throw error;
  }
}

async function loadFailedJobs() {
  try {
    await systemStore.fetchFailedJobs(jobPagination);
  } catch (error: any) {
    if (error.status === 404) {
      console.warn('Failed jobs API not implemented');
      return;
    }
    throw error;
  }
}

function handleRefresh() {
  loadSystemData();
}

function getLogLevelType(level: string) {
  const typeMap: Record<string, any> = {
    debug: 'info',
    info: 'success',
    warning: 'warning',
    error: 'danger',
  };
  return typeMap[level] || 'info';
}

function formatContext(context: any) {
  if (!context) return '-';
  if (typeof context === 'string') return context;
  return JSON.stringify(context).substring(0, 100);
}

function formatPayload(payload: any) {
  if (!payload) return '-';
  if (typeof payload === 'string') return payload.substring(0, 100);
  return JSON.stringify(payload).substring(0, 100);
}

function handleLogFilterChange() {
  logPagination.page = 1;
  loadLogs();
}

function handleLogPageChange() {
  loadLogs();
}

function handleLogSizeChange() {
  logPagination.page = 1;
  loadLogs();
}

function handleJobPageChange() {
  loadFailedJobs();
}

function handleJobSizeChange() {
  jobPagination.page = 1;
  loadFailedJobs();
}

async function handleClearLogs() {
  try {
    await ElMessageBox.confirm(
      t('system.clearLogsConfirm'),
      t('common.confirm'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );
    
    await systemStore.clearLogs();
    loadLogs();
  } catch (error) {
    // User cancelled or error occurred
  }
}

async function handleRetryJob(job: FailedJob) {
  try {
    await systemStore.retryFailedJob(job.id);
    loadFailedJobs();
  } catch (error) {
    // Error handled by store
  }
}

async function handleDeleteJob(job: FailedJob) {
  try {
    await ElMessageBox.confirm(
      t('system.deleteJobConfirm'),
      t('common.confirm'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );
    
    await systemStore.deleteFailedJob(job.id);
    loadFailedJobs();
  } catch (error) {
    // User cancelled or error occurred
  }
}

// Lifecycle
onMounted(() => {
  loadSystemData();
});
</script>

<style scoped lang="scss">
.system-monitoring-page {
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
    
    &.cpu {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    &.memory {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    
    &.disk {
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

.queue-stat {
  text-align: center;
  padding: 20px;
  
  .queue-stat-label {
    font-size: 14px;
    color: #909399;
    margin-bottom: 8px;
  }
  
  .queue-stat-value {
    font-size: 32px;
    font-weight: 600;
    
    &.pending {
      color: #409eff;
    }
    
    &.processing {
      color: #67c23a;
    }
    
    &.failed {
      color: #f56c6c;
    }
  }
}

.logs-table,
.failed-jobs-table {
  width: 100%;
}
</style>
