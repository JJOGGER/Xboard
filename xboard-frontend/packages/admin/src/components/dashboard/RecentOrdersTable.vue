<template>
  <el-card>
    <template #header>
      <div class="table-header">
        <span class="table-title">{{ t('dashboard.recentOrders') }}</span>
        <el-button type="primary" size="small" link @click="handleViewAll">
          {{ t('dashboard.viewAll') }}
          <el-icon class="ml-1"><ArrowRight /></el-icon>
        </el-button>
      </div>
    </template>
    <el-table
      :data="tableData"
      v-loading="loading"
      stripe
      style="width: 100%"
    >
      <el-table-column prop="trade_no" :label="t('dashboard.orderNo')" min-width="180">
        <template #default="{ row }">
          <span class="order-no">{{ row.trade_no }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="user" :label="t('dashboard.user')" min-width="200">
        <template #default="{ row }">
          <div v-if="row.user" class="user-info">
            <el-icon :size="16" color="#909399">
              <User />
            </el-icon>
            <span>{{ row.user.email }}</span>
          </div>
          <span v-else class="text-gray-400">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="plan" :label="t('dashboard.plan')" min-width="150">
        <template #default="{ row }">
          <span v-if="row.plan">{{ row.plan.name }}</span>
          <span v-else class="text-gray-400">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="total_amount" :label="t('dashboard.amount')" min-width="120" align="right">
        <template #default="{ row }">
          <span class="amount">{{ formatCurrency(row.total_amount) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" :label="t('dashboard.status')" min-width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" :label="t('dashboard.created')" min-width="160">
        <template #default="{ row }">
          <div class="date-info">
            <el-icon :size="14" color="#909399">
              <Clock />
            </el-icon>
            <span>{{ formatDate(row.created_at) }}</span>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { User, Clock, ArrowRight } from '@element-plus/icons-vue'
import type { Order } from '@xboard/shared'
import { formatCurrency, formatDate } from '@xboard/shared'

interface Props {
  data: Order[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const router = useRouter()
const { t } = useI18n()

const tableData = computed(() => props.data)

const getStatusType = (status: number): 'success' | 'warning' | 'danger' | 'info' => {
  switch (status) {
    case 3: // Completed
      return 'success'
    case 1: // Processing
      return 'warning'
    case 2: // Cancelled
      return 'danger'
    case 0: // Pending
    default:
      return 'info'
  }
}

const getStatusText = (status: number): string => {
  switch (status) {
    case 0:
      return t('orders.pending')
    case 1:
      return t('orders.processing')
    case 2:
      return t('orders.cancelled')
    case 3:
      return t('orders.completed')
    case 4:
      return t('orders.discounted')
    default:
      return 'Unknown'
  }
}

const handleViewAll = () => {
  router.push({ name: 'Orders' })
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

.order-no {
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 13px;
  color: var(--el-color-primary);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.amount {
  font-weight: 600;
  color: var(--el-color-success);
}

.date-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.ml-1 {
  margin-left: 4px;
}
</style>
