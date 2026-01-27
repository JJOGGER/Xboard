<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
    <div class="w-full max-w-md">
      <!-- Logo and Title -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {{ t('register.title') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          {{ t('register.subtitle') }}
        </p>
      </div>

      <!-- Registration Form Card -->
      <n-card class="shadow-xl">
        <n-form
          ref="formRef"
          :model="formData"
          :rules="rules"
          size="large"
          @submit.prevent="handleSubmit"
        >
          <!-- Email Field -->
          <n-form-item path="email" :label="t('register.email')">
            <n-input
              v-model:value="formData.email"
              type="text"
              :placeholder="t('register.emailPlaceholder')"
              :disabled="loading"
            >
              <template #prefix>
                <n-icon :component="MailOutline" />
              </template>
            </n-input>
          </n-form-item>

          <!-- Password Field -->
          <n-form-item path="password" :label="t('register.password')">
            <n-input
              v-model:value="formData.password"
              type="password"
              show-password-on="click"
              :placeholder="t('register.passwordPlaceholder')"
              :disabled="loading"
            >
              <template #prefix>
                <n-icon :component="LockClosedOutline" />
              </template>
            </n-input>
          </n-form-item>

          <!-- Confirm Password Field -->
          <n-form-item path="password_confirmation" :label="t('register.confirmPassword')">
            <n-input
              v-model:value="formData.password_confirmation"
              type="password"
              show-password-on="click"
              :placeholder="t('register.confirmPasswordPlaceholder')"
              :disabled="loading"
            >
              <template #prefix>
                <n-icon :component="LockClosedOutline" />
              </template>
            </n-input>
          </n-form-item>

          <!-- Invite Code Field -->
          <n-form-item path="invite_code" :label="t('register.inviteCode')">
            <n-input
              v-model:value="formData.invite_code"
              type="text"
              :placeholder="t('register.inviteCodePlaceholder')"
              :disabled="loading"
            >
              <template #prefix>
                <n-icon :component="TicketOutline" />
              </template>
            </n-input>
          </n-form-item>

          <!-- Error Message -->
          <n-alert
            v-if="errorMessage"
            type="error"
            :title="t('register.error')"
            class="mb-4"
            closable
            @close="errorMessage = ''"
          >
            {{ errorMessage }}
          </n-alert>

          <!-- Success Message -->
          <n-alert
            v-if="successMessage"
            type="success"
            :title="t('register.success')"
            class="mb-4"
          >
            {{ successMessage }}
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
            {{ loading ? t('register.registering') : t('register.registerButton') }}
          </n-button>

          <!-- Login Link -->
          <div class="text-center mt-6">
            <span class="text-gray-600 dark:text-gray-400">
              {{ t('register.haveAccount') }}
            </span>
            <router-link
              to="/login"
              class="ml-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              {{ t('register.loginLink') }}
            </router-link>
          </div>
        </n-form>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
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
import { MailOutline, LockClosedOutline, TicketOutline } from '@vicons/ionicons5'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

// Form reference
const formRef = ref<FormInst | null>(null)

// Form data
const formData = reactive({
  email: '',
  password: '',
  password_confirmation: '',
  invite_code: ''
})

// Loading and message states
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Custom validator for password confirmation
const validatePasswordConfirmation = (rule: FormItemRule, value: string): boolean | Error => {
  if (!value) {
    return new Error(t('register.validation.confirmPasswordRequired'))
  }
  if (value !== formData.password) {
    return new Error(t('register.validation.passwordMismatch'))
  }
  return true
}

// Validation rules
const rules: FormRules = {
  email: [
    {
      required: true,
      message: t('register.validation.emailRequired'),
      trigger: ['blur', 'input']
    },
    {
      type: 'email',
      message: t('register.validation.emailInvalid'),
      trigger: ['blur', 'input']
    }
  ],
  password: [
    {
      required: true,
      message: t('register.validation.passwordRequired'),
      trigger: ['blur', 'input']
    },
    {
      min: 8,
      message: t('register.validation.passwordMinLength'),
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

    // Attempt registration
    await authStore.register({
      email: formData.email,
      password: formData.password,
      password_confirmation: formData.password_confirmation,
      invite_code: formData.invite_code || undefined
    })

    // Show success message
    successMessage.value = t('register.successMessage')

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
      errorMessage.value = t('register.validation.registerFailed')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Additional custom styles if needed */
</style>
