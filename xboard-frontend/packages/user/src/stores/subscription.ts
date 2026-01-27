/**
 * Subscription Store
 * Manages user subscription information and server nodes
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApi, serverApi } from '@xboard/shared'
import type { SubscriptionInfo, ServerNode } from '@xboard/shared'

export const useSubscriptionStore = defineStore('subscription', () => {
  // State
  const subscription = ref<SubscriptionInfo | null>(null)
  const serverNodes = ref<ServerNode[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const subscriptionUrl = computed(() => subscription.value?.subscription_url || '')
  
  const hasSubscription = computed(() => {
    return subscription.value?.plan_id !== null && subscription.value?.plan_id !== undefined
  })

  const isExpired = computed(() => {
    if (!subscription.value?.expired_at) return true
    return subscription.value.expired_at < Date.now() / 1000
  })

  const daysUntilExpiry = computed(() => {
    if (!subscription.value?.expired_at) return 0
    const now = Date.now() / 1000
    const diff = subscription.value.expired_at - now
    return Math.max(0, Math.ceil(diff / 86400))
  })

  const trafficUsed = computed(() => {
    if (!subscription.value) return 0
    return subscription.value.u + subscription.value.d
  })

  const trafficRemaining = computed(() => {
    if (!subscription.value) return 0
    return Math.max(0, subscription.value.transfer_enable - trafficUsed.value)
  })

  const trafficPercentage = computed(() => {
    if (!subscription.value?.transfer_enable) return 0
    const percentage = (trafficUsed.value / subscription.value.transfer_enable) * 100
    return Math.min(Math.round(percentage), 100)
  })

  const resetDay = computed(() => subscription.value?.reset_day || null)

  const availableNodes = computed(() => {
    return serverNodes.value.filter(node => node.show === true)
  })

  const nodesByRegion = computed(() => {
    const grouped: Record<string, ServerNode[]> = {}
    
    availableNodes.value.forEach(node => {
      // Extract region from tags or use 'Other' as default
      const region = node.tags?.[0] || 'Other'
      
      if (!grouped[region]) {
        grouped[region] = []
      }
      grouped[region].push(node)
    })
    
    return grouped
  })

  // Actions

  /**
   * Fetch subscription information
   * Retrieves user subscription details
   */
  const fetchSubscription = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await userApi.getSubscription()
      subscription.value = response.data
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch subscription'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch server nodes
   * Retrieves available server nodes for user
   */
  const fetchServerNodes = async () => {
    loading.value = true
    error.value = null

    try {
      // Use user-specific endpoint
      const response = await serverApi.getUserServers()
      serverNodes.value = response.data
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch server nodes'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Reset subscription secret
   * Generates new subscription URL
   */
  const resetSecret = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await userApi.resetSubscriptionSecret()
      
      // Update subscription with new URL
      if (subscription.value) {
        subscription.value.subscription_url = response.data.subscription_url
      }
      
      return response.data.subscription_url
    } catch (err: any) {
      error.value = err.message || 'Failed to reset subscription secret'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Initialize subscription data
   * Fetches subscription info and server nodes
   */
  const initialize = async () => {
    try {
      await Promise.all([
        fetchSubscription(),
        fetchServerNodes()
      ])
    } catch (err) {
      console.error('Failed to initialize subscription data:', err)
    }
  }

  /**
   * Clear subscription data
   * Resets all subscription state
   */
  const clearSubscriptionData = () => {
    subscription.value = null
    serverNodes.value = []
    error.value = null
  }

  return {
    // State
    subscription,
    serverNodes,
    loading,
    error,
    
    // Getters
    subscriptionUrl,
    hasSubscription,
    isExpired,
    daysUntilExpiry,
    trafficUsed,
    trafficRemaining,
    trafficPercentage,
    resetDay,
    availableNodes,
    nodesByRegion,
    
    // Actions
    fetchSubscription,
    fetchServerNodes,
    resetSecret,
    initialize,
    clearSubscriptionData
  }
})
