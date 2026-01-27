<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
    <div class="w-full max-w-md">
      <!-- Login Card -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <!-- Logo and Title -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            XBoard Admin
          </h1>
          <p class="text-gray-600 dark:text-gray-400">
            Sign in to your admin account
          </p>
        </div>

        <!-- Login Form -->
        <el-form
          ref="formRef"
          :model="formData"
          :rules="rules"
          @submit.prevent="handleSubmit"
          label-position="top"
          size="large"
        >
          <!-- Email Field -->
          <el-form-item label="Email" prop="email">
            <el-input
              v-model="formData.email"
              type="email"
              placeholder="admin@example.com"
              :prefix-icon="User"
              :disabled="loading"
            />
          </el-form-item>

          <!-- Password Field -->
          <el-form-item label="Password" prop="password">
            <el-input
              v-model="formData.password"
              type="password"
              placeholder="Enter your password"
              :prefix-icon="Lock"
              :disabled="loading"
              show-password
              @keyup.enter="handleSubmit"
            />
          </el-form-item>

          <!-- Error Message -->
          <el-alert
            v-if="errorMessage"
            :title="errorMessage"
            type="error"
            :closable="false"
            class="mb-4"
          />

          <!-- Submit Button -->
          <el-form-item>
            <el-button
              type="primary"
              native-type="submit"
              :loading="loading"
              :disabled="loading"
              class="w-full"
              size="large"
            >
              {{ loading ? 'Signing in...' : 'Sign In' }}
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- Footer -->
      <div class="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
        <p>&copy; 2025 XBoard. All rights reserved.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// Form reference
const formRef = ref<FormInstance>()

// Form data
const formData = reactive({
  email: '',
  password: ''
})

// Loading state
const loading = ref(false)

// Error message
const errorMessage = ref('')

// Validation rules
const rules: FormRules = {
  email: [
    { required: true, message: 'Email is required', trigger: 'blur' },
    { type: 'email', message: 'Please enter a valid email', trigger: 'blur' }
  ],
  password: [
    { required: true, message: 'Password is required', trigger: 'blur' },
    { min: 6, message: 'Password must be at least 6 characters', trigger: 'blur' }
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

    // Set loading state
    loading.value = true

    // Attempt login
    await authStore.login({
      email: formData.email,
      password: formData.password
    })

    // Show success message
    ElMessage.success('Login successful!')

    // Redirect to dashboard
    router.push({ name: 'Dashboard' })
  } catch (error: any) {
    // Display error message
    if (error.message) {
      errorMessage.value = error.message
    } else if (error.errors) {
      // Handle validation errors from API
      const firstError = Object.values(error.errors)[0]
      errorMessage.value = Array.isArray(firstError) ? firstError[0] : 'Login failed'
    } else {
      errorMessage.value = 'Invalid email or password. Please try again.'
    }

    // Show error notification
    ElMessage.error(errorMessage.value)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Additional custom styles if needed */
</style>
