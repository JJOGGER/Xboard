/**
 * Traffic Store
 * Manages user traffic usage and logs
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApi } from '@xboard/shared'
import type { TrafficLog, TrafficStats } from '@xboard/shared'

export interface TrafficChartData {
  date: string
  upload: number
  download: number
  total: number
}

export interface ServerTrafficBreakdown {
  server_id: number
  server_name: string
  upload: number
  download: number
  total: number
  percentage: number
}

export const useTrafficStore = defineStore('traffic', () => {
  // State
  const trafficLogs = ref<TrafficLog[]>([])
  const trafficStats = ref<TrafficStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const dateRange = ref<{ start?: string; end?: string }>({})
  const selectedServerId = ref<number | undefined>(undefined)

  // Getters
  const totalUpload = computed(() => {
    return trafficLogs.value.reduce((sum, log) => sum + log.u, 0)
  })

  const totalDownload = computed(() => {
    return trafficLogs.value.reduce((sum, log) => sum + log.d, 0)
  })

  const totalTraffic = computed(() => {
    return totalUpload.value + totalDownload.value
  })

  /**
   * Group traffic logs by date for chart visualization
   */
  const trafficByDate = computed((): TrafficChartData[] => {
    const grouped = new Map<string, { upload: number; download: number }>()

    trafficLogs.value.forEach(log => {
      const dateStr = new Date(log.record_at * 1000).toISOString()
      const date = dateStr.split('T')[0] || dateStr
      
      if (!grouped.has(date)) {
        grouped.set(date, { upload: 0, download: 0 })
      }
      
      const entry = grouped.get(date)!
      entry.upload += log.u
      entry.download += log.d
    })

    return Array.from(grouped.entries())
      .map(([date, data]) => ({
        date,
        upload: data.upload,
        download: data.download,
        total: data.upload + data.download
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  })

  /**
   * Group traffic by server for breakdown visualization
   */
  const trafficByServer = computed((): ServerTrafficBreakdown[] => {
    const grouped = new Map<number, { upload: number; download: number; name: string }>()

    trafficLogs.value.forEach(log => {
      const serverId = log.server_id
      if (!grouped.has(serverId)) {
        grouped.set(serverId, {
          upload: 0,
          download: 0,
          name: `Server ${serverId}` // This should be replaced with actual server name
        })
      }
      
      const entry = grouped.get(serverId)!
      entry.upload += log.u
      entry.download += log.d
    })

    const total = totalTraffic.value || 1 // Avoid division by zero

    return Array.from(grouped.entries())
      .map(([serverId, data]) => {
        const serverTotal = data.upload + data.download
        return {
          server_id: serverId,
          server_name: data.name,
          upload: data.upload,
          download: data.download,
          total: serverTotal,
          percentage: Math.round((serverTotal / total) * 100)
        }
      })
      .sort((a, b) => b.total - a.total)
  })

  /**
   * Get recent traffic logs (last 7 days)
   */
  const recentLogs = computed(() => {
    const sevenDaysAgo = Date.now() / 1000 - 7 * 24 * 60 * 60
    return trafficLogs.value
      .filter(log => log.record_at >= sevenDaysAgo)
      .sort((a, b) => b.record_at - a.record_at)
  })

  // Actions

  /**
   * Fetch traffic logs
   * Retrieves traffic usage logs with optional filters
   */
  const fetchTrafficLogs = async (params?: {
    start_date?: string
    end_date?: string
    server_id?: number
  }) => {
    loading.value = true
    error.value = null

    try {
      const response = await userApi.getTrafficLogs(params)
      trafficLogs.value = response.data
      
      // Update filter state
      if (params) {
        dateRange.value = {
          start: params.start_date,
          end: params.end_date
        }
        selectedServerId.value = params.server_id
      }
      
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch traffic logs'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch traffic statistics
   * Retrieves aggregated traffic stats
   */
  const fetchTrafficStats = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await userApi.getTrafficStats()
      trafficStats.value = response.data
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch traffic stats'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Set date range filter
   * Updates the date range for traffic logs
   */
  const setDateRange = async (start?: string, end?: string) => {
    dateRange.value = { start, end }
    await fetchTrafficLogs({
      start_date: start,
      end_date: end,
      server_id: selectedServerId.value
    })
  }

  /**
   * Set server filter
   * Updates the server filter for traffic logs
   */
  const setServerFilter = async (serverId?: number) => {
    selectedServerId.value = serverId
    await fetchTrafficLogs({
      start_date: dateRange.value.start || undefined,
      end_date: dateRange.value.end || undefined,
      server_id: serverId
    })
  }

  /**
   * Clear filters
   * Resets all filters and fetches all traffic logs
   */
  const clearFilters = async () => {
    dateRange.value = {}
    selectedServerId.value = undefined
    await fetchTrafficLogs()
  }

  /**
   * Initialize traffic data
   * Fetches traffic logs and stats
   */
  const initialize = async () => {
    try {
      await Promise.all([
        fetchTrafficLogs(),
        fetchTrafficStats()
      ])
    } catch (err) {
      console.error('Failed to initialize traffic data:', err)
    }
  }

  /**
   * Clear traffic data
   * Resets all traffic state
   */
  const clearTrafficData = () => {
    trafficLogs.value = []
    trafficStats.value = null
    dateRange.value = {}
    selectedServerId.value = undefined
    error.value = null
  }

  return {
    // State
    trafficLogs,
    trafficStats,
    loading,
    error,
    dateRange,
    selectedServerId,
    
    // Getters
    totalUpload,
    totalDownload,
    totalTraffic,
    trafficByDate,
    trafficByServer,
    recentLogs,
    
    // Actions
    fetchTrafficLogs,
    fetchTrafficStats,
    setDateRange,
    setServerFilter,
    clearFilters,
    initialize,
    clearTrafficData
  }
})
