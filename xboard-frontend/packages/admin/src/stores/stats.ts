/**
 * Statistics Store
 * Manages dashboard statistics and analytics data
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '@xboard/shared/api/client'
import type { 
  DashboardStats, 
  OrderStats, 
  ServerRank 
} from '@xboard/shared'

export interface DateRange {
  start: string
  end: string
}

export const useStatsStore = defineStore('stats', () => {
  // State
  const dashboardStats = ref<DashboardStats | null>(null)
  const orderStats = ref<OrderStats[]>([])
  const serverRanks = ref<ServerRank[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const dateRange = ref<DateRange>({
    start: '',
    end: ''
  })

  // Getters
  const hasDashboardStats = computed(() => dashboardStats.value !== null)
  const hasOrderStats = computed(() => orderStats.value.length > 0)
  const hasServerRanks = computed(() => serverRanks.value.length > 0)

  // Calculate growth percentage
  const monthIncomeGrowth = computed(() => {
    if (!dashboardStats.value) return 0
    const current = dashboardStats.value.month_income
    const previous = dashboardStats.value.last_month_income
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  })

  const dayIncomeGrowth = computed(() => {
    if (!dashboardStats.value) return 0
    // Compare with average daily income from last month
    const current = dashboardStats.value.day_income
    const lastMonthAvg = dashboardStats.value.last_month_income / 30
    if (lastMonthAvg === 0) return current > 0 ? 100 : 0
    return ((current - lastMonthAvg) / lastMonthAvg) * 100
  })

  // Actions
  const fetchDashboardStats = async (): Promise<void> => {
    loading.value = true
    error.value = null
    
    try {
      const response = await apiClient.get<DashboardStats>('/v2/stat/getOverride')
      dashboardStats.value = response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch dashboard statistics'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchOrderStats = async (range?: DateRange): Promise<void> => {
    loading.value = true
    error.value = null
    
    try {
      const params: Record<string, string> = {}
      
      if (range) {
        params.start_date = range.start
        params.end_date = range.end
        dateRange.value = range
      } else if (dateRange.value.start && dateRange.value.end) {
        params.start_date = dateRange.value.start
        params.end_date = dateRange.value.end
      }
      
      const response = await apiClient.get<OrderStats[]>('/v2/stat/getOrder', { params })
      orderStats.value = response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch order statistics'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchServerRanks = async (period: 'hour' | 'yesterday' = 'hour'): Promise<void> => {
    loading.value = true
    error.value = null
    
    try {
      const endpoint = period === 'hour' ? '/v2/stat/getServerLastRank' : '/v2/stat/getServerYesterdayRank'
      const response = await apiClient.get<ServerRank[]>(endpoint)
      serverRanks.value = response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch server rankings'
      throw err
    } finally {
      loading.value = false
    }
  }

  const setDateRange = (range: DateRange): void => {
    dateRange.value = range
  }

  const clearDateRange = (): void => {
    dateRange.value = {
      start: '',
      end: ''
    }
  }

  const clearError = (): void => {
    error.value = null
  }

  const refreshAll = async (): Promise<void> => {
    await Promise.all([
      fetchDashboardStats(),
      fetchOrderStats(),
      fetchServerRanks()
    ])
  }

  return {
    // State
    dashboardStats,
    orderStats,
    serverRanks,
    loading,
    error,
    dateRange,
    
    // Getters
    hasDashboardStats,
    hasOrderStats,
    hasServerRanks,
    monthIncomeGrowth,
    dayIncomeGrowth,
    
    // Actions
    fetchDashboardStats,
    fetchOrderStats,
    fetchServerRanks,
    setDateRange,
    clearDateRange,
    clearError,
    refreshAll
  }
})
