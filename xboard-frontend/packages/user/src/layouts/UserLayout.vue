<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Top Navigation Bar -->
    <header class="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo and Brand -->
          <div class="flex items-center">
            <router-link to="/" class="flex items-center space-x-2">
              <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-lg">X</span>
              </div>
              <span class="text-xl font-bold text-gray-900 dark:text-white">XBoard</span>
            </router-link>
          </div>

          <!-- Desktop Navigation -->
          <nav class="hidden md:flex items-center space-x-8">
            <router-link
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              class="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              active-class="text-blue-600 dark:text-blue-400"
            >
              {{ t(item.label) }}
            </router-link>
          </nav>

          <!-- Right Side Actions -->
          <div class="flex items-center space-x-4">
            <!-- Language Switcher -->
            <n-dropdown :options="languageOptions" @select="handleLanguageChange">
              <n-button text class="hidden sm:flex">
                <template #icon>
                  <n-icon :component="LanguageOutline" />
                </template>
              </n-button>
            </n-dropdown>

            <!-- Theme Toggle -->
            <n-button text @click="toggleTheme" class="hidden sm:flex">
              <template #icon>
                <n-icon :component="isDark ? SunnyOutline : MoonOutline" />
              </template>
            </n-button>

            <!-- User Dropdown -->
            <n-dropdown :options="userMenuOptions" @select="handleUserMenuSelect">
              <n-button text>
                <template #icon>
                  <n-icon :component="PersonCircleOutline" />
                </template>
                <span class="hidden sm:inline ml-2">{{ userEmail }}</span>
              </n-button>
            </n-dropdown>

            <!-- Mobile Menu Button -->
            <n-button text class="md:hidden" @click="mobileMenuOpen = !mobileMenuOpen">
              <template #icon>
                <n-icon :component="mobileMenuOpen ? CloseOutline : MenuOutline" />
              </template>
            </n-button>
          </div>
        </div>
      </div>

      <!-- Mobile Navigation -->
      <div v-if="mobileMenuOpen" class="md:hidden border-t border-gray-200 dark:border-gray-700">
        <nav class="px-4 py-4 space-y-2">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            active-class="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
            @click="mobileMenuOpen = false"
          >
            {{ t(item.label) }}
          </router-link>
        </nav>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <router-view />
    </main>

    <!-- Footer -->
    <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          <!-- About Section -->
          <div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              {{ t('footer.about') }}
            </h3>
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              {{ t('footer.aboutText') }}
            </p>
          </div>

          <!-- Quick Links -->
          <div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              {{ t('footer.quickLinks') }}
            </h3>
            <ul class="space-y-2">
              <li>
                <router-link to="/plans" class="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">
                  {{ t('footer.plans') }}
                </router-link>
              </li>
              <li>
                <router-link to="/knowledge" class="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">
                  {{ t('footer.knowledge') }}
                </router-link>
              </li>
              <li>
                <router-link to="/tickets" class="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">
                  {{ t('footer.support') }}
                </router-link>
              </li>
            </ul>
          </div>

          <!-- Legal -->
          <div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              {{ t('footer.legal') }}
            </h3>
            <ul class="space-y-2">
              <li>
                <a href="#" class="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">
                  {{ t('footer.terms') }}
                </a>
              </li>
              <li>
                <a href="#" class="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">
                  {{ t('footer.privacy') }}
                </a>
              </li>
            </ul>
          </div>

          <!-- Social -->
          <div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              {{ t('footer.followUs') }}
            </h3>
            <div class="flex space-x-4">
              <a href="#" class="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                <n-icon :component="LogoTwitter" size="20" />
              </a>
              <a href="#" class="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                <n-icon :component="LogoGithub" size="20" />
              </a>
            </div>
          </div>
        </div>

        <!-- Copyright -->
        <div class="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p class="text-center text-gray-600 dark:text-gray-400 text-sm">
            © {{ currentYear }} XBoard. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
    
    <!-- Global Error Notification -->
    <ErrorNotification />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  NButton,
  NDropdown,
  NIcon,
  useMessage
} from 'naive-ui'
import {
  PersonCircleOutline,
  LanguageOutline,
  MoonOutline,
  SunnyOutline,
  MenuOutline,
  CloseOutline,
  LogoTwitter,
  LogoGithub
} from '@vicons/ionicons5'
import { useAuthStore } from '../stores/auth'
import ErrorNotification from '@/components/common/ErrorNotification.vue'

const { t, locale } = useI18n()
const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

// State
const mobileMenuOpen = ref(false)
const isDark = ref(false)
const currentYear = new Date().getFullYear()

// Computed
const userEmail = computed(() => authStore.user?.email || 'User')

// Navigation items
const navItems = [
  { path: '/dashboard', label: 'nav.dashboard' },
  { path: '/shared-plans', label: 'nav.plans' },
  { path: '/subscription', label: 'nav.subscription' },
  { path: '/orders', label: 'nav.orders' },
  { path: '/tickets', label: 'nav.support' }
]

// Language options
const languageOptions = [
  {
    label: 'English',
    key: 'en'
  },
  {
    label: '简体中文',
    key: 'zh'
  }
]

// User menu options
const userMenuOptions = computed(() => [
  {
    label: t('userMenu.dashboard'),
    key: 'dashboard'
  },
  {
    label: t('userMenu.settings'),
    key: 'settings'
  },
  {
    type: 'divider',
    key: 'd1'
  },
  {
    label: t('userMenu.logout'),
    key: 'logout'
  }
])

// Handle language change
const handleLanguageChange = (key: string) => {
  locale.value = key
  localStorage.setItem('language', key)
  message.success(`Language changed to ${key === 'en' ? 'English' : '简体中文'}`)
}

// Toggle theme
const toggleTheme = () => {
  isDark.value = !isDark.value
  // In a real implementation, this would toggle the dark mode class on the root element
  document.documentElement.classList.toggle('dark')
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

// Handle user menu selection
const handleUserMenuSelect = async (key: string) => {
  switch (key) {
    case 'dashboard':
      router.push('/dashboard')
      break
    case 'settings':
      router.push('/settings')
      break
    case 'logout':
      await authStore.logout()
      router.push('/login')
      message.success('Logged out successfully')
      break
  }
}

// Initialize theme from localStorage
const savedTheme = localStorage.getItem('theme')
if (savedTheme === 'dark') {
  isDark.value = true
  document.documentElement.classList.add('dark')
}
</script>

<style scoped>
/* Additional custom styles if needed */
</style>
