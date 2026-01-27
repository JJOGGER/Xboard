/**
 * User Authentication Store
 * Manages user authentication state and operations
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@xboard/shared'
import type { AuthUser, LoginCredentials, RegisterData } from '@xboard/shared'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<AuthUser | null>(null)
  const token = ref<string | null>(authService.getToken())
  const loading = ref(false)
  const error = ref<string | null>(null)
  const rememberMe = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userEmail = computed(() => user.value?.email || '')
  const userId = computed(() => user.value?.id || null)
  const hasActiveSubscription = computed(() => {
    if (!user.value) return false
    return (
      user.value.plan_id !== null &&
      user.value.expired_at !== null &&
      user.value.expired_at > Date.now() / 1000
    )
  })
  const remainingTraffic = computed(() => {
    if (!user.value) return 0
    return user.value.transfer_enable - user.value.u - user.value.d
  })

  // Actions
  
  /**
   * Login user
   * Authenticates user and stores session
   */
  const login = async (credentials: LoginCredentials & { remember?: boolean }) => {
    loading.value = true
    error.value = null

    try {
      const response = await authService.userLogin(credentials)
      
      // Store token (backend returns 'auth_data' field)
      const authToken = response.auth_data || response.token
      token.value = authToken
      
      // Store remember me preference
      if (credentials.remember !== undefined) {
        rememberMe.value = credentials.remember
      }
      
      // Fetch user data after successful login
      if (authToken) {
        await fetchUser()
      }
      
      return response
    } catch (err: any) {
      error.value = err.message || 'Login failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Register new user
   * Creates new user account
   */
  const register = async (data: RegisterData) => {
    loading.value = true
    error.value = null

    try {
      const response = await authService.userRegister(data)
      
      // Store token and fetch user data
      const authToken = response.auth_data || response.token
      if (authToken) {
        token.value = authToken
        await fetchUser()
      }
      
      return response
    } catch (err: any) {
      error.value = err.message || 'Registration failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Logout user
   * Clears session and redirects to login
   */
  const logout = async () => {
    loading.value = true
    error.value = null

    try {
      await authService.logout()
    } catch (err: any) {
      // Continue with local cleanup even if API call fails
      console.error('Logout error:', err)
    } finally {
      // Clear local state
      user.value = null
      token.value = null
      loading.value = false
    }
  }

  /**
   * Fetch current user profile
   * Retrieves user data from API
   */
  const fetchUser = async () => {
    if (!token.value) {
      throw new Error('No authentication token')
    }

    loading.value = true
    error.value = null

    try {
      const userData = await authService.getCurrentUser()
      user.value = userData
      return userData
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch user'
      // Clear auth on fetch failure (likely invalid token)
      clearAuth()
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Refresh authentication token
   * Renews the session token
   */
  const refreshToken = async () => {
    try {
      const newToken = await authService.refreshToken()
      token.value = newToken
      return newToken
    } catch (err: any) {
      error.value = err.message || 'Failed to refresh token'
      clearAuth()
      throw err
    }
  }

  /**
   * Set authentication token
   * Updates token in store and storage
   */
  const setToken = (newToken: string) => {
    token.value = newToken
    authService.setToken(newToken)
  }

  /**
   * Clear authentication
   * Removes all auth data from store and storage
   */
  const clearAuth = () => {
    user.value = null
    token.value = null
    authService.removeToken()
    localStorage.removeItem('user_type')
  }

  /**
   * Initialize auth state
   * Fetches user data if token exists
   */
  const initialize = async () => {
    if (token.value) {
      try {
        await fetchUser()
      } catch (err) {
        // Clear invalid auth
        clearAuth()
      }
    }
  }

  /**
   * Update user profile in store
   * Updates local user data without API call
   */
  const updateUserProfile = (updates: Partial<AuthUser>) => {
    if (user.value) {
      user.value = { ...user.value, ...updates }
    }
  }

  return {
    // State
    user,
    token,
    loading,
    error,
    rememberMe,
    
    // Getters
    isAuthenticated,
    userEmail,
    userId,
    hasActiveSubscription,
    remainingTraffic,
    
    // Actions
    login,
    register,
    logout,
    fetchUser,
    refreshToken,
    setToken,
    clearAuth,
    initialize,
    updateUserProfile
  }
}, {
  persist: {
    key: 'xboard-user-auth',
    storage: localStorage,
    paths: ['user', 'token', 'rememberMe']
  }
})
