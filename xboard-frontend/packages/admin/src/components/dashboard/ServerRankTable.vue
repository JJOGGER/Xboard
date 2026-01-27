<template>
  <el-card>
    <template #header>
      <div class="table-header">
        <span class="table-title">Server Performance Ranking</span>
        <el-radio-group v-model="period" size="small" @change="handlePeriodChange">
          <el-radio-button value="hour">Last Hour</el-radio-button>
          <el-radio-button value="yesterday">Yesterday</el-radio-button>
        </el-radio-group>
      </div>
    </template>
    <el-table
      :data="tableData"
      v-loading="loading"
      stripe
      style="width: 100%"
      :default-sort="{ prop: 'total', order: 'descending' }"
    >
      <el-table-column type="index" :label="t('serverRank.index')" width="60" />
      <el-table-column prop="server_name" :label="t('serverRank.serverName')" min-width="200">
        <template #default="{ row }">
          <div class="server-name">
            <el-icon :size="16" color="#409EFF">
              <Monitor />
            </el-icon>
            <span>{{ row.server_name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="u" :label="t('serverRank.upload')" min-width="120" sortable>
        <template #default="{ row }">
          <span>{{ formatBytes(row.u) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="d" :label="t('serverRank.download')" min-width="120" sortable>
        <template #default="{ row }">
          <span>{{ formatBytes(row.d) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="total" :label="t('serverRank.totalTraffic')" min-width="140" sortable>
        <template #default="{ row }">
          <el-tag type="primary" effect="plain">
            {{ formatBytes(row.total) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="t('serverRank.usage')" min-width="150">
        <template #default="{ row }">
          <div class="usage-bar">
            <el-progress
              :percentage="calculatePercentage(row.total)"
              :color="getProgressColor(calculatePercentage(row.total))"
              :show-text="false"
            />
            <span class="usage-text">{{ calculatePercentage(row.total).toFixed(1) }}%</span>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Monitor } from '@element-plus/icons-vue'
import type { ServerRank } from '@xboard/shared'
import { formatBytes } from '@xboard/shared'

interface Props {
  data: ServerRank[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  periodChange: [period: 'hour' | 'yesterday']
}>()

const { t } = useI18n()

const period = ref<'hour' | 'yesterday'>('hour')

const tableData = computed(() => props.data)

const maxTraffic = computed(() => {
  if (tableData.value.length === 0) return 0
  return Math.max(...tableData.value.map(item => item.total))
})

const calculatePercentage = (value: number): number => {
  if (maxTraffic.value === 0) return 0
  return (value / maxTraffic.value) * 100
}

const getProgressColor = (percentage: number): string => {
  if (percentage >= 80) return '#67C23A'
  if (percentage >= 50) return '#409EFF'
  if (percentage >= 30) return '#E6A23C'
  return '#F56C6C'
}

const handlePeriodChange = (value: 'hour' | 'yesterday') => {
  emit('periodChange', value)
}
</script>

<style scoped>
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
}

.server-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.usage-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.usage-bar :deep(.el-progress) {
  flex: 1;
}

.usage-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  min-width: 45px;
  text-align: right;
}
</style>
