<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
    <div class="w-full max-w-md">
      <!-- Logo and Title -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {{ t('resetPassword.title') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          {{ t('resetPassword.subtitle') }}
        </p>
      </div>

      <!-- Reset Password Form Card -->
      <n-card class="shadow-xl">
        <n-form
          ref="formRef"
          :model="formData"
          :rules="rules"
          size="large"
          @submit.prevent="handleSubmit"
        >
          <!-- Password Field -->
          <n-form-item path="password" :label="t('resetPassword.password')">
            <n-input
              v-model:value="formData.password"
              type="password"
              show-password-on="click"
              :placeholder="t('resetPassword.passwordPlaceholder')"
              :disabled="loading"
            >
              <template #prefix>
                <n-icon :component="LockClosedOutline" />
              </template>
            </n-input>
          </n-form-item>

          <!-- Confirm Password Field -->
          <n-form-item path="password_confirmation" :label="t('resetPassword.confirmPassword')">
            <n-input
              v-model:value="formData.password_confirmation"
              type="password"
              show-password-on="click"
              :placeholder="t('resetPassword.confirmPasswordPlaceholder')"
              :disabled="loading"
              @keydown.enter="handleSubmit"
            >
              <template #prefix>
                <n-icon :component="LockClosedOutline" />
              </template>
            </n-input>
          </n-form-item>

          <!-- Success Message -->
          <n-alert
            v-if="successMessage"
            type="success"
            :title="t('resetPassword.success')"
            class="mb-4"
          >
            {{ successMessage }}
          </n-alert>

          <!-- Error Message -->
          <n-alert
            v-if="errorMessage"
            type="error"
            class="mb-4"
            closable
            @close="errorMessage = ''"
          >
            {{ errorMessage }}
          </n-alert>

          <!-- Submit Button -->
          <n-button
            type="primary"
            block
            size="large"
            :loading="loading"
            :disabled="loading || !!successMessage"
            attr-type="submit"
            @click="handleSubmit"
          >
            {{ loading ? t('resetPassword.resetting') : t('resetPassword.resetButton') }}
          </n-button>
        </n-form>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  NCard,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NAlert,
  NIcon,
  type FormInst,
  type FormRules,
  type FormItemRule
} from 'naive-ui'
import { LockClosedOutline } from '@vicons/ionicons5'
import { authService } from '@xboard/shared'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

// Form reference
const formRef = ref<FormInst | null>(null)

// Form data
const formData = reactive({
  password: '',
  password_confirmation: '',
  token: '',
  email: ''
})

// Loading and message states
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Custom validator for password confirmation
const validatePasswordConfirmation = (rule: FormItemRule, value: string): boolean | Error => {
  if (!value) {
    return new Error(t('resetPassword.validation.confirmPasswordRequired'))
  }
  if (value !== formData.password) {
    return new Error(t('resetPassword.validation.passwordMismatch'))
  }
  return true
}

// Validation rules
const rules: FormRules = {
  password: [
    {
      required: true,
      message: t('resetPassword.validation.passwordRequired'),
      trigger: ['blur', 'input']
    },
    {
      min: 8,
      message: t('resetPassword.validation.passwordMinLength'),
      trigger: ['blur', 'input']
    }
  ],
  password_confirmation: [
    {
      required: true,
      validator: validatePasswordConfirmation,
      trigger: ['blur', 'input', 'change']
    }
  ]
}

// Extract token and email from URL on mount
onMounted(() => {
  formData.token = (route.query.token as string) || ''
  formData.email = (route.query.email as string) || ''

  if (!formData.token || !formData.email) {
    errorMessage.value = 'Invalid reset link. Please request a new password reset.'
  }
})

// Handle form submission
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    // Validate form
    await formRef.value.validate()

    // Clear previous messages
    errorMessage.value = ''
    successMessage.value = ''
    loading.value = true

    // Reset password
    await authService.resetPassword({
      email: formData.email,
      password: formData.password,
      password_confirmation: formData.password_confirmation,
      token: formData.token
    })

    // Show success message
    successMessage.value = t('resetPassword.successMessage')

    // Redirect to login after 2 seconds
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (error: any) {
    // Display error message
    if (error?.message) {
      errorMessage.value = error.message
    } else if (error?.errors) {
      // Handle validation errors from API
      const firstError = Object.values(error.errors)[0]
      errorMessage.value = Array.isArray(firstError) ? firstError[0] : String(firstError)
    } else {
      errorMessage.value = 'Failed to reset password. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Additional custom styles if needed */
</style>
