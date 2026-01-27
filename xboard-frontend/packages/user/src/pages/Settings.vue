<template>
  <div class="settings">
    <div class="settings-header">
      <h1 class="settings-title">{{ t('settings.title') }}</h1>
      <p class="settings-subtitle">{{ t('settings.subtitle') }}</p>
    </div>

    <div class="settings-content">
      <!-- Profile Information -->
      <div class="settings-section">
        <div class="section-header">
          <h2 class="section-title">{{ t('settings.profile.title') }}</h2>
          <p class="section-description">{{ t('settings.profile.description') }}</p>
        </div>

        <div class="form-card">
          <n-form
            ref="profileFormRef"
            :model="profileForm"
            :rules="profileRules"
            label-placement="top"
            require-mark-placement="right-hanging"
          >
            <n-form-item :label="t('settings.profile.email')" path="email">
              <n-input
                v-model:value="profileForm.email"
                :placeholder="t('settings.profile.emailPlaceholder')"
                size="large"
                disabled
              />
            </n-form-item>

            <n-form-item :label="t('settings.profile.userId')" path="userId">
              <n-input
                :value="authStore.user?.id?.toString() || ''"
                size="large"
                disabled
              />
            </n-form-item>

            <n-form-item :label="t('settings.profile.memberSince')" path="memberSince">
              <n-input
                :value="formatDate(authStore.user?.created_at || '')"
                size="large"
                disabled
              />
            </n-form-item>
          </n-form>
        </div>
      </div>

      <!-- Change Password -->
      <div class="settings-section">
        <div class="section-header">
          <h2 class="section-title">{{ t('settings.password.title') }}</h2>
          <p class="section-description">{{ t('settings.password.description') }}</p>
        </div>

        <div class="form-card">
          <n-form
            ref="passwordFormRef"
            :model="passwordForm"
            :rules="passwordRules"
            label-placement="top"
            require-mark-placement="right-hanging"
          >
            <n-form-item :label="t('settings.password.current')" path="current_password">
              <n-input
                v-model:value="passwordForm.current_password"
                type="password"
                show-password-on="click"
                :placeholder="t('settings.password.currentPlaceholder')"
                size="large"
              />
            </n-form-item>

            <n-form-item :label="t('settings.password.new')" path="password">
              <n-input
                v-model:value="passwordForm.password"
                type="password"
                show-password-on="click"
                :placeholder="t('settings.password.newPlaceholder')"
                size="large"
              />
            </n-form-item>

            <n-form-item :label="t('settings.password.confirm')" path="password_confirmation">
              <n-input
                v-model:value="passwordForm.password_confirmation"
                type="password"
                show-password-on="click"
                :placeholder="t('settings.password.confirmPlaceholder')"
                size="large"
              />
            </n-form-item>

            <div class="form-actions">
              <n-button
                type="primary"
                size="large"
                :loading="passwordLoading"
                :disabled="!isPasswordFormValid"
                @click="handleChangePassword"
              >
                {{ t('settings.password.submit') }}
              </n-button>
            </div>
          </n-form>
        </div>
      </div>

      <!-- Email Update -->
      <div class="settings-section">
        <div class="section-header">
          <h2 class="section-title">{{ t('settings.email.title') }}</h2>
          <p class="section-description">{{ t('settings.email.description') }}</p>
        </div>

        <div class="form-card">
          <n-form
            ref="emailFormRef"
            :model="emailForm"
            :rules="emailRules"
            label-placement="top"
            require-mark-placement="right-hanging"
          >
            <n-form-item :label="t('settings.email.current')" path="currentEmail">
              <n-input
                :value="authStore.user?.email || ''"
                size="large"
                disabled
              />
            </n-form-item>

            <n-form-item :label="t('settings.email.new')" path="newEmail">
              <n-input
                v-model:value="emailForm.newEmail"
                :placeholder="t('settings.email.newPlaceholder')"
                size="large"
              />
            </n-form-item>

            <n-form-item :label="t('settings.email.password')" path="password">
              <n-input
                v-model:value="emailForm.password"
                type="password"
                show-password-on="click"
                :placeholder="t('settings.email.passwordPlaceholder')"
                size="large"
              />
            </n-form-item>

            <div class="form-actions">
              <n-button
                type="primary"
                size="large"
                :loading="emailLoading"
                :disabled="!isEmailFormValid"
                @click="handleUpdateEmail"
              >
                {{ t('settings.email.submit') }}
              </n-button>
            </div>
          </n-form>
        </div>
      </div>

      <!-- Notification Preferences -->
      <div class="settings-section">
        <div class="section-header">
          <h2 class="section-title">{{ t('settings.notifications.title') }}</h2>
          <p class="section-description">{{ t('settings.notifications.description') }}</p>
        </div>

        <div class="form-card">
          <div class="notification-options">
            <div class="notification-item">
              <div class="notification-info">
                <div class="notification-label">{{ t('settings.notifications.orderUpdates') }}</div>
                <div class="notification-desc">{{ t('settings.notifications.orderUpdatesDesc') }}</div>
              </div>
              <n-switch v-model:value="notificationPrefs.orderUpdates" />
            </div>

            <div class="notification-item">
              <div class="notification-info">
                <div class="notification-label">{{ t('settings.notifications.trafficAlerts') }}</div>
                <div class="notification-desc">{{ t('settings.notifications.trafficAlertsDesc') }}</div>
              </div>
              <n-switch v-model:value="notificationPrefs.trafficAlerts" />
            </div>

            <div class="notification-item">
              <div class="notification-info">
                <div class="notification-label">{{ t('settings.notifications.systemAnnouncements') }}</div>
                <div class="notification-desc">{{ t('settings.notifications.systemAnnouncementsDesc') }}</div>
              </div>
              <n-switch v-model:value="notificationPrefs.systemAnnouncements" />
            </div>

            <div class="notification-item">
              <div class="notification-info">
                <div class="notification-label">{{ t('settings.notifications.promotions') }}</div>
                <div class="notification-desc">{{ t('settings.notifications.promotionsDesc') }}</div>
              </div>
              <n-switch v-model:value="notificationPrefs.promotions" />
            </div>
          </div>

          <div class="form-actions">
            <n-button
              type="primary"
              size="large"
              :loading="notificationLoading"
              @click="handleSaveNotifications"
            >
              {{ t('settings.notifications.save') }}
            </n-button>
          </div>
        </div>
      </div>

      <!-- Active Sessions -->
      <div class="settings-section">
        <div class="section-header">
          <h2 class="section-title">{{ t('settings.sessions.title') }}</h2>
          <p class="section-description">{{ t('settings.sessions.description') }}</p>
        </div>

        <div class="form-card">
          <div v-if="sessionsLoading" class="loading-state">
            <n-spin size="medium" />
          </div>

          <div v-else-if="sessions.length === 0" class="empty-state">
            <p>{{ t('settings.sessions.empty') }}</p>
          </div>

          <div v-else class="sessions-list">
            <div
              v-for="session in sessions"
              :key="session.id"
              class="session-item"
              :class="{ 'current-session': session.is_current }"
            >
              <div class="session-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>

              <div class="session-info">
                <div class="session-device">
                  {{ session.device || t('settings.sessions.unknownDevice') }}
                  <n-tag v-if="session.is_current" type="success" size="small">
                    {{ t('settings.sessions.current') }}
                  </n-tag>
                </div>
                <div class="session-details">
                  <span>{{ session.ip_address || 'Unknown IP' }}</span>
                  <span class="separator">•</span>
                  <span>{{ session.location || 'Unknown Location' }}</span>
                </div>
                <div class="session-time">
                  {{ t('settings.sessions.lastActive') }}: {{ formatDate(session.last_activity) }}
                </div>
              </div>

              <n-button
                v-if="!session.is_current"
                text
                type="error"
                :loading="revokingSessionId === session.id"
                @click="handleRevokeSession(session.id)"
              >
                {{ t('settings.sessions.revoke') }}
              </n-button>
            </div>
          </div>

          <div v-if="sessions.length > 1" class="form-actions">
            <n-button
              type="error"
              size="large"
              :loading="revokingAll"
              @click="handleRevokeAllSessions"
            >
              {{ t('settings.sessions.revokeAll') }}
            </n-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NForm,
  NFormItem,
  NInput,
  NButton,
  NSwitch,
  NTag,
  NSpin,
  useMessage,
  type FormInst,
  type FormRules
} from 'naive-ui'
import { useAuthStore } from '../stores/auth'
import { useUserStore } from '../stores/user'
import dayjs from 'dayjs'

const { t } = useI18n()
const message = useMessage()
const authStore = useAuthStore()
const userStore = useUserStore()

// Form refs
const profileFormRef = ref<FormInst | null>(null)
const passwordFormRef = ref<FormInst | null>(null)
const emailFormRef = ref<FormInst | null>(null)

// Profile form
const profileForm = reactive({
  email: authStore.user?.email || '',
  userId: authStore.user?.id || 0,
  memberSince: authStore.user?.created_at || ''
})

const profileRules: FormRules = {}

// Password form
const passwordForm = reactive({
  current_password: '',
  password: '',
  password_confirmation: ''
})

const passwordLoading = ref(false)

const passwordRules: FormRules = {
  current_password: [
    {
      required: true,
      message: t('settings.password.currentRequired'),
      trigger: ['blur', 'input']
    }
  ],
  password: [
    {
      required: true,
      message: t('settings.password.newRequired'),
      trigger: ['blur', 'input']
    },
    {
      min: 8,
      message: t('settings.password.minLength'),
      trigger: ['blur', 'input']
    }
  ],
  password_confirmation: [
    {
      required: true,
      message: t('settings.password.confirmRequired'),
      trigger: ['blur', 'input']
    },
    {
      validator: (_rule, value) => {
        return value === passwordForm.password
      },
      message: t('settings.password.mismatch'),
      trigger: ['blur', 'input']
    }
  ]
}

const isPasswordFormValid = computed(() => {
  return (
    passwordForm.current_password.length > 0 &&
    passwordForm.password.length >= 8 &&
    passwordForm.password_confirmation === passwordForm.password
  )
})

// Email form
const emailForm = reactive({
  newEmail: '',
  password: ''
})

const emailLoading = ref(false)

const emailRules: FormRules = {
  newEmail: [
    {
      required: true,
      message: t('settings.email.newRequired'),
      trigger: ['blur', 'input']
    },
    {
      type: 'email',
      message: t('settings.email.invalid'),
      trigger: ['blur', 'input']
    }
  ],
  password: [
    {
      required: true,
      message: t('settings.email.passwordRequired'),
      trigger: ['blur', 'input']
    }
  ]
}

const isEmailFormValid = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return (
    emailForm.newEmail.length > 0 &&
    emailRegex.test(emailForm.newEmail) &&
    emailForm.password.length > 0
  )
})

// Notification preferences
const notificationPrefs = reactive({
  orderUpdates: true,
  trafficAlerts: true,
  systemAnnouncements: true,
  promotions: false
})

const notificationLoading = ref(false)

// Sessions
interface Session {
  id: string
  device: string
  ip_address: string
  location: string
  last_activity: string
  is_current: boolean
}

const sessions = ref<Session[]>([])
const sessionsLoading = ref(false)
const revokingSessionId = ref<string | null>(null)
const revokingAll = ref(false)

// Methods
const formatDate = (date: string | number) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const handleChangePassword = async () => {
  if (!passwordFormRef.value) return

  try {
    await passwordFormRef.value.validate()
    passwordLoading.value = true

    await userStore.changePassword({
      current_password: passwordForm.current_password,
      password: passwordForm.password,
      password_confirmation: passwordForm.password_confirmation
    })

    message.success(t('settings.password.success'))

    // Reset form
    passwordForm.current_password = ''
    passwordForm.password = ''
    passwordForm.password_confirmation = ''
  } catch (error: any) {
    if (error.errors) {
      // Validation errors
      return
    }
    message.error(error.message || t('settings.password.error'))
  } finally {
    passwordLoading.value = false
  }
}

const handleUpdateEmail = async () => {
  if (!emailFormRef.value) return

  try {
    await emailFormRef.value.validate()
    emailLoading.value = true

    await userStore.updateProfile({
      email: emailForm.newEmail,
      current_password: emailForm.password
    })

    message.success(t('settings.email.success'))

    // Reset form
    emailForm.newEmail = ''
    emailForm.password = ''

    // Refresh profile
    await userStore.fetchProfile()
    profileForm.email = authStore.user?.email || ''
  } catch (error: any) {
    if (error.errors) {
      // Validation errors
      return
    }
    message.error(error.message || t('settings.email.error'))
  } finally {
    emailLoading.value = false
  }
}

const handleSaveNotifications = async () => {
  notificationLoading.value = true

  try {
    // Save notification preferences to localStorage for now
    // In a real implementation, this would be saved to the backend
    localStorage.setItem('notification_prefs', JSON.stringify(notificationPrefs))
    
    message.success(t('settings.notifications.success'))
  } catch (error: any) {
    message.error(t('settings.notifications.error'))
  } finally {
    notificationLoading.value = false
  }
}

const fetchSessions = async () => {
  sessionsLoading.value = true

  try {
    // Mock sessions data
    // In a real implementation, this would fetch from the backend
    sessions.value = [
      {
        id: '1',
        device: 'Chrome on macOS',
        ip_address: '192.168.1.100',
        location: 'San Francisco, CA',
        last_activity: new Date().toISOString(),
        is_current: true
      },
      {
        id: '2',
        device: 'Safari on iPhone',
        ip_address: '192.168.1.101',
        location: 'San Francisco, CA',
        last_activity: new Date(Date.now() - 3600000).toISOString(),
        is_current: false
      }
    ]
  } catch (error: any) {
    message.error(t('settings.sessions.fetchError'))
  } finally {
    sessionsLoading.value = false
  }
}

const handleRevokeSession = async (sessionId: string) => {
  revokingSessionId.value = sessionId

  try {
    // In a real implementation, this would call the backend API
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    sessions.value = sessions.value.filter(s => s.id !== sessionId)
    message.success(t('settings.sessions.revokeSuccess'))
  } catch (error: any) {
    message.error(t('settings.sessions.revokeError'))
  } finally {
    revokingSessionId.value = null
  }
}

const handleRevokeAllSessions = async () => {
  revokingAll.value = true

  try {
    // In a real implementation, this would call the backend API
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Keep only current session
    sessions.value = sessions.value.filter(s => s.is_current)
    message.success(t('settings.sessions.revokeAllSuccess'))
  } catch (error: any) {
    message.error(t('settings.sessions.revokeAllError'))
  } finally {
    revokingAll.value = false
  }
}

// Load notification preferences from localStorage
const loadNotificationPrefs = () => {
  const saved = localStorage.getItem('notification_prefs')
  if (saved) {
    try {
      const prefs = JSON.parse(saved)
      Object.assign(notificationPrefs, prefs)
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
    }
  }
}

onMounted(() => {
  // Update profile form with latest user data
  profileForm.email = authStore.user?.email || ''
  
  // Load notification preferences
  loadNotificationPrefs()
  
  // Fetch sessions
  fetchSessions()
})
</script>

<style scoped>
.settings {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.settings-header {
  margin-bottom: 2rem;
}

.settings-title {
  font-size: 2rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.5rem;
}

.settings-subtitle {
  font-size: 1rem;
  color: #64748b;
  margin: 0;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Section */
.settings-section {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 0.5rem;
}

.section-description {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

/* Form Card */
.form-card {
  background: #f8fafc;
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
}

.form-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
}

/* Notification Options */
.notification-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.notification-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}

.notification-info {
  flex: 1;
  min-width: 0;
}

.notification-label {
  font-weight: 600;
  color: #0f172a;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.notification-desc {
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.5;
}

/* Sessions List */
.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.session-item:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.session-item.current-session {
  background: #dbeafe;
  border-color: #93c5fd;
}

.session-icon {
  width: 40px;
  height: 40px;
  border-radius: 0.5rem;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  flex-shrink: 0;
}

.session-icon svg {
  width: 20px;
  height: 20px;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-device {
  font-weight: 600;
  color: #0f172a;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.session-details {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.separator {
  margin: 0 0.5rem;
}

.session-time {
  font-size: 0.75rem;
  color: #94a3b8;
}

/* Loading and Empty States */
.loading-state,
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem 1rem;
  color: #94a3b8;
}

/* Responsive Design */
@media (max-width: 768px) {
  .settings {
    padding: 1rem;
  }

  .settings-section {
    padding: 1.5rem;
  }

  .form-card {
    padding: 1rem;
  }

  .notification-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .session-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .session-device {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
