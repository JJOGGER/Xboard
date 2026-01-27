/**
 * User Store
 * Manages user profile and subscription information
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApi } from '@xboard/shared'
import type { AuthUser, UpdateProfileData, SubscriptionInfo } from '@xboard/shared'
import { useAuthStore } from './auth'

export const useUserStore = defineStore('user', () => {
  // State
  const profile = ref<AuthUser | null>(null)
  const subscription = ref<SubscriptionInfo | null>(null)
  const stats = ref<{
    commission_balance: number
    commission_count: number
    invite_count: number
  } | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const hasActiveSubscription = computed(() => {
    if (!profile.value) return false
    return (
      profile.value.plan_id !== null &&
      profile.value.expired_at !== null &&
      profile.value.expired_at > Date.now() / 1000
    )
  })

  const remainingTraffic = computed(() => {
    if (!profile.value) return 0
    return profile.value.transfer_enable - profile.value.u - profile.value.d
  })

  const trafficPercentage = computed(() => {
    if (!profile.value?.transfer_enable) return 0
    const used = (profile.value.u + profile.value.d) / profile.value.transfer_enable * 100
    return Math.min(Math.round(used), 100)
  })

  // Actions

  /**
   * Fetch user profile
   * Retrieves current user profile data
   */
  const fetchProfile = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await userApi.getProfile()
      profile.value = response.data
      
      // Update auth store with latest user data
      const authStore = useAuthStore()
      authStore.updateUserProfile(response.data)
      
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch profile'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update user profile
   * Updates user profile information
   */
  const updateProfile = async (data: UpdateProfileData) => {
    loading.value = true
    error.value = null

    try {
      await userApi.updateProfile(data)
      
      // Refresh profile after update
      await fetchProfile()
      
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to update profile'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Change password
   * Updates user password
   */
  const changePassword = async (data: {
    current_password: string
    password: string
    password_confirmation: string
  }) => {
    loading.value = true
    error.value = null

    try {
      await userApi.changePassword(data)
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to change password'
      throw err
    } finally {
      loading.value = false
    }
  }

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
   * Reset subscription secret
   * Generates new subscription URL
   */
  const resetSubscriptionSecret = async () => {
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
   * Fetch user statistics
   * Retrieves commission and referral stats
   */
  const fetchStats = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await userApi.getStats()
      stats.value = response.data
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch stats'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Initialize user data
   * Fetches all user-related data
   */
  const initialize = async () => {
    try {
      await Promise.all([
        fetchProfile(),
        fetchSubscription(),
        fetchStats()
      ])
    } catch (err) {
      console.error('Failed to initialize user data:', err)
    }
  }

  /**
   * Clear user data
   * Resets all user state
   */
  const clearUserData = () => {
    profile.value = null
    subscription.value = null
    stats.value = null
    error.value = null
  }

  return {
    // State
    profile,
    subscription,
    stats,
    loading,
    error,
    
    // Getters
    hasActiveSubscription,
    remainingTraffic,
    trafficPercentage,
    
    // Actions
    fetchProfile,
    updateProfile,
    changePassword,
    fetchSubscription,
    resetSubscriptionSecret,
    fetchStats,
    initialize,
    clearUserData
  }
})
