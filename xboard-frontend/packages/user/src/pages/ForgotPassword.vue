<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
    <div class="w-full max-w-md">
      <!-- Logo and Title -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {{ t('forgotPassword.title') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          {{ t('forgotPassword.subtitle') }}
        </p>
      </div>

      <!-- Forgot Password Form Card -->
      <n-card class="shadow-xl">
        <n-form
          ref="formRef"
          :model="formData"
          :rules="rules"
          size="large"
          @submit.prevent="handleSubmit"
        >
          <!-- Email Field -->
          <n-form-item path="email" :label="t('forgotPassword.email')">
            <n-input
              v-model:value="formData.email"
              type="text"
              :placeholder="t('forgotPassword.emailPlaceholder')"
              :disabled="loading"
              @keydown.enter="handleSubmit"
            >
              <template #prefix>
                <n-icon :component="MailOutline" />
              </template>
            </n-input>
          </n-form-item>

          <!-- Success Message -->
          <n-alert
            v-if="successMessage"
            type="success"
            :title="t('forgotPassword.success')"
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
            {{ loading ? t('forgotPassword.sending') : t('forgotPassword.sendButton') }}
          </n-button>

          <!-- Back to Login Link -->
          <div class="text-center mt-6">
            <router-link
              to="/login"
              class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              {{ t('forgotPassword.backToLogin') }}
            </router-link>
          </div>
        </n-form>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
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
  type FormRules
} from 'naive-ui'
import { MailOutline } from '@vicons/ionicons5'
import { authService } from '@xboard/shared'

const { t } = useI18n()

// Form reference
const formRef = ref<FormInst | null>(null)

// Form data
const formData = reactive({
  email: ''
})

// Loading and message states
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Validation rules
const rules: FormRules = {
  email: [
    {
      required: true,
      message: t('forgotPassword.validation.emailRequired'),
      trigger: ['blur', 'input']
    },
    {
      type: 'email',
      message: t('forgotPassword.validation.emailInvalid'),
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

    // Clear previous messages
    errorMessage.value = ''
    successMessage.value = ''
    loading.value = true

    // Send password reset email
    await authService.forgotPassword(formData.email)

    // Show success message
    successMessage.value = t('forgotPassword.successMessage')
  } catch (error: any) {
    // Display error message
    if (error?.message) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Failed to send reset email. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Additional custom styles if needed */
</style>
