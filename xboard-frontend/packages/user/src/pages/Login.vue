<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
    <div class="w-full max-w-md">
      <!-- Logo and Title -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {{ t('login.title') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          {{ t('login.subtitle') }}
        </p>
      </div>

      <!-- Login Form Card -->
      <n-card class="shadow-xl">
        <n-form
          ref="formRef"
          :model="formData"
          :rules="rules"
          size="large"
          @submit.prevent="handleSubmit"
        >
          <!-- Email Field -->
          <n-form-item path="email" :label="t('login.email')">
            <n-input
              v-model:value="formData.email"
              type="text"
              :placeholder="t('login.emailPlaceholder')"
              :disabled="loading"
              @keydown.enter="handleSubmit"
            >
              <template #prefix>
                <n-icon :component="MailOutline" />
              </template>
            </n-input>
          </n-form-item>

          <!-- Password Field -->
          <n-form-item path="password" :label="t('login.password')">
            <n-input
              v-model:value="formData.password"
              type="password"
              show-password-on="click"
              :placeholder="t('login.passwordPlaceholder')"
              :disabled="loading"
              @keydown.enter="handleSubmit"
            >
              <template #prefix>
                <n-icon :component="LockClosedOutline" />
              </template>
            </n-input>
          </n-form-item>

          <!-- Remember Me and Forgot Password -->
          <div class="flex items-center justify-between mb-6">
            <n-checkbox v-model:checked="formData.remember">
              {{ t('login.rememberMe') }}
            </n-checkbox>
            <router-link
              to="/forgot-password"
              class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {{ t('login.forgotPassword') }}
            </router-link>
          </div>

          <!-- Error Message -->
          <n-alert
            v-if="errorMessage"
            type="error"
            :title="t('login.error')"
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
            :disabled="loading"
            attr-type="submit"
            @click="handleSubmit"
          >
            {{ loading ? t('login.loggingIn') : t('login.loginButton') }}
          </n-button>

          <!-- Register Link -->
          <div class="text-center mt-6">
            <span class="text-gray-600 dark:text-gray-400">
              {{ t('login.noAccount') }}
            </span>
            <router-link
              to="/register"
              class="ml-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              {{ t('login.registerLink') }}
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
  NCheckbox,
  NAlert,
  NIcon,
  type FormInst,
  type FormRules
} from 'naive-ui'
import { MailOutline, LockClosedOutline } from '@vicons/ionicons5'
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
  remember: false
})

// Loading and error states
const loading = ref(false)
const errorMessage = ref('')

// Validation rules
const rules: FormRules = {
  email: [
    {
      required: true,
      message: t('login.validation.emailRequired'),
      trigger: ['blur', 'input']
    },
    {
      type: 'email',
      message: t('login.validation.emailInvalid'),
      trigger: ['blur', 'input']
    }
  ],
  password: [
    {
      required: true,
      message: t('login.validation.passwordRequired'),
      trigger: ['blur', 'input']
    },
    {
      min: 6,
      message: t('login.validation.passwordMinLength'),
      trigger: ['blur', 'input']
    }
  ]
}

// Handle form submission
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    // Validate form
    await formRef.value.validate()

    // Clear previous error
    errorMessage.value = ''
    loading.value = true

    // Attempt login
    await authStore.login({
      email: formData.email,
      password: formData.password
    })

    // Redirect to dashboard on success
    router.push('/dashboard')
  } catch (error: any) {
    // Display error message
    if (error?.message) {
      errorMessage.value = error.message
    } else if (error?.errors) {
      // Handle validation errors from API
      const firstError = Object.values(error.errors)[0]
      errorMessage.value = Array.isArray(firstError) ? firstError[0] : String(firstError)
    } else {
      errorMessage.value = t('login.validation.loginFailed')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Additional custom styles if needed */
</style>
