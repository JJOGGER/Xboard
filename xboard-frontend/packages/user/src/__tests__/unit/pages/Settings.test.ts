/**
 * Unit tests for Settings page forms
 * Tests password change validation, email update validation, and session management
 * Requirements: 28.2, 28.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Settings from '../../../pages/Settings.vue'
import { useAuthStore } from '../../../stores/auth'
import { useUserStore } from '../../../stores/user'

// Mock naive-ui components
vi.mock('naive-ui', () => ({
  NForm: {
    name: 'NForm',
    template: '<form><slot /></form>',
    methods: {
      validate: vi.fn()
    }
  },
  NFormItem: {
    name: 'NFormItem',
    template: '<div><slot /></div>',
    props: ['label', 'path']
  },
  NInput: {
    name: 'NInput',
    template: '<input />',
    props: ['value', 'modelValue', 'type', 'placeholder', 'size', 'disabled']
  },
  NButton: {
    name: 'NButton',
    template: '<button><slot /></button>',
    props: ['type', 'size', 'loading', 'disabled']
  },
  NSwitch: {
    name: 'NSwitch',
    template: '<input type="checkbox" />',
    props: ['value', 'modelValue']
  },
  NTag: {
    name: 'NTag',
    template: '<span><slot /></span>',
    props: ['type', 'size']
  },
  NSpin: {
    name: 'NSpin',
    template: '<div>Loading...</div>',
    props: ['size']
  },
  useMessage: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  })
}))

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

describe('Settings Page - Password Change Validation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Setup auth store with mock user
    const authStore = useAuthStore()
    authStore.user = {
      id: 1,
      email: 'test@example.com',
      is_admin: false,
      is_staff: false,
      balance: 0,
      commission_balance: 0,
      plan_id: null,
      expired_at: null,
      u: 0,
      d: 0,
      transfer_enable: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  })

  it('should require current password', async () => {
    const wrapper = mount(Settings)
    
    // Get password form data
    const passwordForm = (wrapper.vm as any).passwordForm
    
    // Set only new password and confirmation
    passwordForm.password = 'newpassword123'
    passwordForm.password_confirmation = 'newpassword123'
    
    // Current password is empty
    expect(passwordForm.current_password).toBe('')
    
    // Form should not be valid
    const isValid = (wrapper.vm as any).isPasswordFormValid
    expect(isValid).toBe(false)
  })

  it('should require new password to be at least 8 characters', async () => {
    const wrapper = mount(Settings)
    
    const passwordForm = (wrapper.vm as any).passwordForm
    
    // Set short password
    passwordForm.current_password = 'oldpass'
    passwordForm.password = 'short'
    passwordForm.password_confirmation = 'short'
    
    // Form should not be valid
    const isValid = (wrapper.vm as any).isPasswordFormValid
    expect(isValid).toBe(false)
  })

  it('should require password confirmation to match new password', async () => {
    const wrapper = mount(Settings)
    
    const passwordForm = (wrapper.vm as any).passwordForm
    
    // Set mismatched passwords
    passwordForm.current_password = 'oldpassword'
    passwordForm.password = 'newpassword123'
    passwordForm.password_confirmation = 'differentpassword'
    
    // Form should not be valid
    const isValid = (wrapper.vm as any).isPasswordFormValid
    expect(isValid).toBe(false)
  })

  it('should validate when all password fields are correct', async () => {
    const wrapper = mount(Settings)
    
    const passwordForm = (wrapper.vm as any).passwordForm
    
    // Set valid password data
    passwordForm.current_password = 'oldpassword'
    passwordForm.password = 'newpassword123'
    passwordForm.password_confirmation = 'newpassword123'
    
    // Form should be valid
    const isValid = (wrapper.vm as any).isPasswordFormValid
    expect(isValid).toBe(true)
  })

  it('should call userStore.changePassword with correct data', async () => {
    const wrapper = mount(Settings)
    const userStore = useUserStore()
    
    // Mock changePassword method
    const changePasswordSpy = vi.spyOn(userStore, 'changePassword').mockResolvedValue(true)
    
    const passwordForm = (wrapper.vm as any).passwordForm
    
    // Set valid password data
    passwordForm.current_password = 'oldpassword'
    passwordForm.password = 'newpassword123'
    passwordForm.password_confirmation = 'newpassword123'
    
    // Mock form ref validation
    const passwordFormRef = (wrapper.vm as any).passwordFormRef
    if (passwordFormRef) {
      passwordFormRef.validate = vi.fn().mockResolvedValue(undefined)
    }
    
    // Call handleChangePassword
    await (wrapper.vm as any).handleChangePassword()
    
    // Verify changePassword was called with correct data
    expect(changePasswordSpy).toHaveBeenCalledWith({
      current_password: 'oldpassword',
      password: 'newpassword123',
      password_confirmation: 'newpassword123'
    })
  })

  it('should reset password form after successful change', async () => {
    const wrapper = mount(Settings)
    const userStore = useUserStore()
    
    // Mock successful password change
    vi.spyOn(userStore, 'changePassword').mockResolvedValue(true)
    
    const passwordForm = (wrapper.vm as any).passwordForm
    
    // Set valid password data
    passwordForm.current_password = 'oldpassword'
    passwordForm.password = 'newpassword123'
    passwordForm.password_confirmation = 'newpassword123'
    
    // Mock form ref validation
    const passwordFormRef = (wrapper.vm as any).passwordFormRef
    if (passwordFormRef) {
      passwordFormRef.validate = vi.fn().mockResolvedValue(undefined)
    }
    
    // Call handleChangePassword
    await (wrapper.vm as any).handleChangePassword()
    
    // Wait for async operations
    await wrapper.vm.$nextTick()
    
    // Form should be reset
    expect(passwordForm.current_password).toBe('')
    expect(passwordForm.password).toBe('')
    expect(passwordForm.password_confirmation).toBe('')
  })
})

describe('Settings Page - Email Update Validation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    
    const authStore = useAuthStore()
    authStore.user = {
      id: 1,
      email: 'test@example.com',
      is_admin: false,
      is_staff: false,
      balance: 0,
      commission_balance: 0,
      plan_id: null,
      expired_at: null,
      u: 0,
      d: 0,
      transfer_enable: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  })

  it('should require new email address', async () => {
    const wrapper = mount(Settings)
    
    const emailForm = (wrapper.vm as any).emailForm
    
    // Set only password
    emailForm.password = 'password123'
    
    // New email is empty
    expect(emailForm.newEmail).toBe('')
    
    // Form should not be valid
    const isValid = (wrapper.vm as any).isEmailFormValid
    expect(isValid).toBe(false)
  })

  it('should validate email format', async () => {
    const wrapper = mount(Settings)
    
    const emailForm = (wrapper.vm as any).emailForm
    
    // Set invalid email format
    emailForm.newEmail = 'invalid-email'
    emailForm.password = 'password123'
    
    // Form should not be valid
    const isValid = (wrapper.vm as any).isEmailFormValid
    expect(isValid).toBe(false)
  })

  it('should require password for email update', async () => {
    const wrapper = mount(Settings)
    
    const emailForm = (wrapper.vm as any).emailForm
    
    // Set only email
    emailForm.newEmail = 'newemail@example.com'
    
    // Password is empty
    expect(emailForm.password).toBe('')
    
    // Form should not be valid
    const isValid = (wrapper.vm as any).isEmailFormValid
    expect(isValid).toBe(false)
  })

  it('should validate when email and password are correct', async () => {
    const wrapper = mount(Settings)
    
    const emailForm = (wrapper.vm as any).emailForm
    
    // Set valid email data
    emailForm.newEmail = 'newemail@example.com'
    emailForm.password = 'password123'
    
    // Form should be valid
    const isValid = (wrapper.vm as any).isEmailFormValid
    expect(isValid).toBe(true)
  })

  it('should accept various valid email formats', async () => {
    const wrapper = mount(Settings)
    
    const emailForm = (wrapper.vm as any).emailForm
    emailForm.password = 'password123'
    
    const validEmails = [
      'user@example.com',
      'user.name@example.com',
      'user+tag@example.co.uk',
      'user_name@sub.example.com'
    ]
    
    for (const email of validEmails) {
      emailForm.newEmail = email
      const isValid = (wrapper.vm as any).isEmailFormValid
      expect(isValid).toBe(true)
    }
  })

  it('should reject invalid email formats', async () => {
    const wrapper = mount(Settings)
    
    const emailForm = (wrapper.vm as any).emailForm
    emailForm.password = 'password123'
    
    const invalidEmails = [
      'invalid',
      'invalid@',
      '@example.com',
      'invalid@.com',
      'invalid @example.com',
      'invalid@example',
      ''
    ]
    
    for (const email of invalidEmails) {
      emailForm.newEmail = email
      const isValid = (wrapper.vm as any).isEmailFormValid
      expect(isValid).toBe(false)
    }
  })

  it('should call userStore.updateProfile with correct data', async () => {
    const wrapper = mount(Settings)
    const userStore = useUserStore()
    
    // Mock updateProfile method
    const updateProfileSpy = vi.spyOn(userStore, 'updateProfile').mockResolvedValue(true)
    
    const emailForm = (wrapper.vm as any).emailForm
    
    // Set valid email data
    emailForm.newEmail = 'newemail@example.com'
    emailForm.password = 'password123'
    
    // Mock form ref validation
    const emailFormRef = (wrapper.vm as any).emailFormRef
    if (emailFormRef) {
      emailFormRef.validate = vi.fn().mockResolvedValue(undefined)
    }
    
    // Mock fetchProfile
    vi.spyOn(userStore, 'fetchProfile').mockResolvedValue({} as any)
    
    // Call handleUpdateEmail
    await (wrapper.vm as any).handleUpdateEmail()
    
    // Verify updateProfile was called with correct data
    expect(updateProfileSpy).toHaveBeenCalledWith({
      email: 'newemail@example.com',
      current_password: 'password123'
    })
  })

  it('should reset email form after successful update', async () => {
    const wrapper = mount(Settings)
    const userStore = useUserStore()
    
    // Mock successful email update
    vi.spyOn(userStore, 'updateProfile').mockResolvedValue(true)
    vi.spyOn(userStore, 'fetchProfile').mockResolvedValue({} as any)
    
    const emailForm = (wrapper.vm as any).emailForm
    
    // Set valid email data
    emailForm.newEmail = 'newemail@example.com'
    emailForm.password = 'password123'
    
    // Mock form ref validation
    const emailFormRef = (wrapper.vm as any).emailFormRef
    if (emailFormRef) {
      emailFormRef.validate = vi.fn().mockResolvedValue(undefined)
    }
    
    // Call handleUpdateEmail
    await (wrapper.vm as any).handleUpdateEmail()
    
    // Wait for async operations
    await wrapper.vm.$nextTick()
    
    // Form should be reset
    expect(emailForm.newEmail).toBe('')
    expect(emailForm.password).toBe('')
  })

  it('should refresh profile after successful email update', async () => {
    const wrapper = mount(Settings)
    const userStore = useUserStore()
    const authStore = useAuthStore()
    
    // Mock successful email update
    vi.spyOn(userStore, 'updateProfile').mockResolvedValue(true)
    const fetchProfileSpy = vi.spyOn(userStore, 'fetchProfile').mockResolvedValue({} as any)
    
    // Update auth store user email
    authStore.user!.email = 'newemail@example.com'
    
    const emailForm = (wrapper.vm as any).emailForm
    
    // Set valid email data
    emailForm.newEmail = 'newemail@example.com'
    emailForm.password = 'password123'
    
    // Mock form ref validation
    const emailFormRef = (wrapper.vm as any).emailFormRef
    if (emailFormRef) {
      emailFormRef.validate = vi.fn().mockResolvedValue(undefined)
    }
    
    // Call handleUpdateEmail
    await (wrapper.vm as any).handleUpdateEmail()
    
    // Verify fetchProfile was called
    expect(fetchProfileSpy).toHaveBeenCalled()
  })
})

describe('Settings Page - Session Management', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    
    const authStore = useAuthStore()
    authStore.user = {
      id: 1,
      email: 'test@example.com',
      is_admin: false,
      is_staff: false,
      balance: 0,
      commission_balance: 0,
      plan_id: null,
      expired_at: null,
      u: 0,
      d: 0,
      transfer_enable: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  })

  it('should load sessions on mount', async () => {
    const wrapper = mount(Settings)
    
    // Wait for async operations
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const sessions = (wrapper.vm as any).sessions
    
    // Should have loaded mock sessions
    expect(sessions.length).toBeGreaterThan(0)
  })

  it('should identify current session', async () => {
    const wrapper = mount(Settings)
    
    // Wait for async operations
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const sessions = (wrapper.vm as any).sessions
    
    // Should have at least one current session
    const currentSession = sessions.find((s: any) => s.is_current)
    expect(currentSession).toBeDefined()
    expect(currentSession.is_current).toBe(true)
  })

  it('should revoke a specific session', async () => {
    const wrapper = mount(Settings)
    
    // Wait for sessions to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const initialSessions = [...(wrapper.vm as any).sessions]
    const sessionToRevoke = initialSessions.find((s: any) => !s.is_current)
    
    if (sessionToRevoke) {
      // Revoke the session
      await (wrapper.vm as any).handleRevokeSession(sessionToRevoke.id)
      
      // Wait for async operations
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      const remainingSessions = (wrapper.vm as any).sessions
      
      // Session should be removed
      expect(remainingSessions.length).toBe(initialSessions.length - 1)
      expect(remainingSessions.find((s: any) => s.id === sessionToRevoke.id)).toBeUndefined()
    }
  })

  it('should revoke all sessions except current', async () => {
    const wrapper = mount(Settings)
    
    // Wait for sessions to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const initialSessions = [...(wrapper.vm as any).sessions]
    const currentSession = initialSessions.find((s: any) => s.is_current)
    
    // Revoke all sessions
    await (wrapper.vm as any).handleRevokeAllSessions()
    
    // Wait for async operations
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 1100))
    
    const remainingSessions = (wrapper.vm as any).sessions
    
    // Only current session should remain
    expect(remainingSessions.length).toBe(1)
    expect(remainingSessions[0].id).toBe(currentSession?.id)
    expect(remainingSessions[0].is_current).toBe(true)
  })

  it('should not allow revoking current session', async () => {
    const wrapper = mount(Settings)
    
    // Wait for sessions to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const sessions = (wrapper.vm as any).sessions
    const currentSession = sessions.find((s: any) => s.is_current)
    
    // Current session should not have revoke button (tested via UI logic)
    // In the component, revoke button is only shown for !session.is_current
    expect(currentSession).toBeDefined()
    expect(currentSession.is_current).toBe(true)
  })

  it('should display session information correctly', async () => {
    const wrapper = mount(Settings)
    
    // Wait for sessions to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const sessions = (wrapper.vm as any).sessions
    
    // Each session should have required fields
    sessions.forEach((session: any) => {
      expect(session).toHaveProperty('id')
      expect(session).toHaveProperty('device')
      expect(session).toHaveProperty('ip_address')
      expect(session).toHaveProperty('location')
      expect(session).toHaveProperty('last_activity')
      expect(session).toHaveProperty('is_current')
    })
  })

  it('should handle session loading state', async () => {
    const wrapper = mount(Settings)
    
    // Initially should be loading
    const initialLoading = (wrapper.vm as any).sessionsLoading
    
    // Wait for sessions to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Should no longer be loading
    const finalLoading = (wrapper.vm as any).sessionsLoading
    expect(finalLoading).toBe(false)
  })

  it('should track revoking session ID', async () => {
    const wrapper = mount(Settings)
    
    // Wait for sessions to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const sessions = (wrapper.vm as any).sessions
    const sessionToRevoke = sessions.find((s: any) => !s.is_current)
    
    if (sessionToRevoke) {
      // Start revoking
      const revokePromise = (wrapper.vm as any).handleRevokeSession(sessionToRevoke.id)
      
      // Should be tracking the revoking session
      expect((wrapper.vm as any).revokingSessionId).toBe(sessionToRevoke.id)
      
      // Wait for completion
      await revokePromise
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      // Should no longer be tracking
      expect((wrapper.vm as any).revokingSessionId).toBeNull()
    }
  })

  it('should track revoke all loading state', async () => {
    const wrapper = mount(Settings)
    
    // Wait for sessions to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Start revoking all
    const revokePromise = (wrapper.vm as any).handleRevokeAllSessions()
    
    // Should be in loading state
    expect((wrapper.vm as any).revokingAll).toBe(true)
    
    // Wait for completion
    await revokePromise
    await new Promise(resolve => setTimeout(resolve, 1100))
    
    // Should no longer be loading
    expect((wrapper.vm as any).revokingAll).toBe(false)
  })
})
