import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService, type AuthUser, type LoginCredentials } from '@xboard/shared'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<AuthUser | null>(null)
  const token = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.is_admin ?? false)
  const userEmail = computed(() => user.value?.email ?? '')

  // Actions
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      console.log('[Auth Store] Starting login...')
      const response = await authService.adminLogin(credentials)
      console.log('[Auth Store] Login response:', response)
      
      // Backend returns 'auth_data' with Bearer token
      const authToken = response.auth_data || response.token
      const cleanToken = authToken ? authToken.replace(/^Bearer\s+/i, '') : ''
      
      console.log('[Auth Store] Token extracted:', cleanToken ? 'Yes' : 'No')
      
      // Store token
      token.value = cleanToken
      authService.setToken(cleanToken)
      
      // Store user type
      localStorage.setItem('user_type', 'admin')
      
      // Get is_admin from login response directly
      // Backend returns is_admin in the login response data
      const isAdminFromResponse = response.is_admin ?? false
      console.log('[Auth Store] is_admin from login response:', isAdminFromResponse)
      
      console.log('[Auth Store] Fetching user info...')
      // Fetch user data after successful login
      await fetchUser()
      
      // Override is_admin from login response since /v2/user/info doesn't return it
      if (user.value) {
        user.value.is_admin = isAdminFromResponse
      }
      
      console.log('[Auth Store] User info fetched:', user.value)
      console.log('[Auth Store] Is admin:', isAdmin.value)
    } catch (error) {
      console.error('[Auth Store] Login error:', error)
      // Clear any partial state
      clearAuth()
      throw error
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await authService.logout()
    } catch (error) {
      // Log error but continue with local cleanup
      console.error('Logout API call failed:', error)
    } finally {
      clearAuth()
    }
  }

  const fetchUser = async (): Promise<void> => {
    try {
      const userData = await authService.getCurrentUser()
      user.value = userData
    } catch (error) {
      throw error
    }
  }

  const setToken = (newToken: string): void => {
    token.value = newToken
    authService.setToken(newToken)
  }

  const clearAuth = (): void => {
    // Clear state
    user.value = null
    token.value = null
    
    // Clear localStorage
    authService.removeToken()
    localStorage.removeItem('user_type')
    
    // Clear any other stored data
    localStorage.removeItem('theme')
    localStorage.removeItem('sidebar_collapsed')
  }

  // Handle session expiration
  const handleSessionExpiration = (): void => {
    clearAuth()
    // The router guard will handle redirect to login
  }

  return {
    // State
    user,
    token,
    
    // Getters
    isAuthenticated,
    isAdmin,
    userEmail,
    
    // Actions
    login,
    logout,
    fetchUser,
    setToken,
    clearAuth,
    handleSessionExpiration
  }
}, {
  persist: {
    key: 'xboard-admin-auth',
    storage: localStorage,
    paths: ['token', 'user']
  }
})
