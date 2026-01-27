<template>
  <div class="dashboard">
    <!-- Page Header -->
    <div class="dashboard-header">
      <div>
        <h1 class="page-title">{{ t('dashboard.title') }}</h1>
        <p class="page-subtitle">{{ t('dashboard.subtitle') }}</p>
      </div>
      <el-button type="primary" :icon="Refresh" @click="handleRefresh" :loading="loading">
        {{ t('dashboard.refresh') }}
      </el-button>
    </div>

    <!-- Statistics Cards -->
    <div class="stats-grid">
      <StatCard
        :label="t('dashboard.monthlyRevenue')"
        :value="dashboardStats?.month_income || 0"
        :icon="Money"
        icon-color="#67C23A"
        icon-bg-color="#f0f9ff"
        :growth="monthIncomeGrowth"
        :growth-label="t('dashboard.vsLastMonth')"
        format="currency"
      />
      <StatCard
        :label="t('dashboard.todayRevenue')"
        :value="dashboardStats?.day_income || 0"
        :icon="TrendCharts"
        icon-color="#409EFF"
        icon-bg-color="#ecf5ff"
        :growth="dayIncomeGrowth"
        :growth-label="t('dashboard.vsAvgDaily')"
        format="currency"
      />
      <StatCard
        :label="t('dashboard.newUsersMonth')"
        :value="dashboardStats?.month_register_total || 0"
        :icon="UserFilled"
        icon-color="#E6A23C"
        icon-bg-color="#fdf6ec"
        format="number"
      />
      <StatCard
        :label="t('dashboard.pendingTickets')"
        :value="dashboardStats?.ticket_pending_total || 0"
        :icon="ChatDotRound"
        icon-color="#F56C6C"
        icon-bg-color="#fef0f0"
        format="number"
      />
    </div>

    <!-- Revenue Chart -->
    <div class="chart-section">
      <RevenueChart
        :data="orderStats"
        :loading="loading"
        @date-change="handleDateChange"
      />
    </div>

    <!-- Server Rankings and Recent Orders -->
    <div class="tables-grid">
      <ServerRankTable
        :data="serverRanks"
        :loading="loading"
        @period-change="handlePeriodChange"
      />
      <RecentOrdersTable
        :data="recentOrders"
        :loading="ordersLoading"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import {
  Refresh,
  Money,
  TrendCharts,
  UserFilled,
  ChatDotRound
} from '@element-plus/icons-vue'
import { useStatsStore } from '@/stores/stats'
import StatCard from '@/components/dashboard/StatCard.vue'
// Lazy load heavy chart components
const RevenueChart = defineAsyncComponent(() => import('@/components/dashboard/RevenueChart.vue'))
const ServerRankTable = defineAsyncComponent(() => import('@/components/dashboard/ServerRankTable.vue'))
const RecentOrdersTable = defineAsyncComponent(() => import('@/components/dashboard/RecentOrdersTable.vue'))
import apiClient from '@xboard/shared/api/client'
import type { Order } from '@xboard/shared'

const { t } = useI18n()

const statsStore = useStatsStore()
const loading = ref(false)
const ordersLoading = ref(false)
const recentOrders = ref<Order[]>([])

// Computed properties from store
const dashboardStats = computed(() => statsStore.dashboardStats)
const orderStats = computed(() => statsStore.orderStats)
const serverRanks = computed(() => statsStore.serverRanks)
const monthIncomeGrowth = computed(() => statsStore.monthIncomeGrowth)
const dayIncomeGrowth = computed(() => statsStore.dayIncomeGrowth)

// Fetch recent orders
const fetchRecentOrders = async () => {
  ordersLoading.value = true
  try {
    const response = await apiClient.get<{ data: Order[] }>('/v2/order/fetch', {
      params: {
        page: 1,
        page_size: 10,
        sort_by: 'created_at',
        sort_order: 'desc'
      }
    })
    // Handle response - data might be directly in response.data or response.data.data
    const orders = response.data?.data || response.data || []
    recentOrders.value = Array.isArray(orders) ? orders.slice(0, 10) : []
  } catch (error: any) {
    console.error('Failed to fetch recent orders:', error)
    // Don't show error message if it's just empty data
    if (error.response?.status !== 404) {
      ElMessage.error(error.message || t('dashboard.fetchOrdersFailed'))
    }
    recentOrders.value = []
  } finally {
    ordersLoading.value = false
  }
}

// Handle refresh
const handleRefresh = async () => {
  loading.value = true
  try {
    await Promise.all([
      statsStore.refreshAll(),
      fetchRecentOrders()
    ])
    ElMessage.success(t('dashboard.refreshSuccess'))
  } catch (error: any) {
    console.error('Failed to refresh dashboard:', error)
    ElMessage.error(error.message || t('dashboard.refreshFailed'))
  } finally {
    loading.value = false
  }
}

// Handle date range change for revenue chart
const handleDateChange = async (start: string, end: string) => {
  loading.value = true
  try {
    await statsStore.fetchOrderStats({ start, end })
  } catch (error: any) {
    console.error('Failed to fetch order stats:', error)
    ElMessage.error(error.message || t('dashboard.fetchStatsFailed'))
  } finally {
    loading.value = false
  }
}

// Handle period change for server rankings
const handlePeriodChange = async (period: 'hour' | 'yesterday') => {
  loading.value = true
  try {
    await statsStore.fetchServerRanks(period)
  } catch (error: any) {
    console.error('Failed to fetch server ranks:', error)
    ElMessage.error(error.message || t('dashboard.fetchRanksFailed'))
  } finally {
    loading.value = false
  }
}

// Initialize dashboard data
onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      statsStore.fetchDashboardStats(),
      statsStore.fetchOrderStats(),
      statsStore.fetchServerRanks(),
      fetchRecentOrders()
    ])
  } catch (error: any) {
    console.error('Failed to initialize dashboard:', error)
    ElMessage.error(error.message || t('dashboard.refreshFailed'))
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.dashboard {
  width: 100%;
  padding: 24px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.chart-section {
  margin-bottom: 24px;
}

.tables-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 1400px) {
  .tables-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
