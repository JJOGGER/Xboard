<template>
  <el-container class="min-h-screen">
    <!-- Desktop Sidebar -->
    <el-aside v-if="!isMobile" :width="sidebarWidth" class="sidebar-container">
      <div class="sidebar-header">
        <h1 v-if="!isCollapsed" class="text-xl font-bold text-white">
          aurora admin
        </h1>
        <h1 v-else class="text-xl font-bold text-white">
          AU
        </h1>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        :collapse-transition="false"
        background-color="#001529"
        text-color="#ffffff"
        active-text-color="#1890ff"
        router
        class="sidebar-menu"
      >
        <el-menu-item index="/" :route="{ name: 'Dashboard' }">
          <el-icon><HomeFilled /></el-icon>
          <template #title>{{ t('menu.dashboard') }}</template>
        </el-menu-item>

        <el-menu-item index="/users" :route="{ name: 'Users' }">
          <el-icon><User /></el-icon>
          <template #title>{{ t('menu.users') }}</template>
        </el-menu-item>

        <el-menu-item index="/orders" :route="{ name: 'Orders' }">
          <el-icon><ShoppingCart /></el-icon>
          <template #title>{{ t('menu.orders') }}</template>
        </el-menu-item>

        <el-menu-item index="/plans" :route="{ name: 'Plans' }">
          <el-icon><Tickets /></el-icon>
          <template #title>{{ t('menu.plans') }}</template>
        </el-menu-item>

        <el-menu-item index="/shared-plans" :route="{ name: 'SharedPlans' }">
          <el-icon><Share /></el-icon>
          <template #title>{{ t('menu.sharedPlans') }}</template>
        </el-menu-item>

        <el-sub-menu index="/servers">
          <template #title>
            <el-icon><Monitor /></el-icon>
            <span>{{ t('menu.servers') }}</span>
          </template>
          <el-menu-item index="/servers" :route="{ name: 'Servers' }">
            <el-icon><Monitor /></el-icon>
            <template #title>{{ t('menu.serverNodes') }}</template>
          </el-menu-item>
          <el-menu-item index="/servers/groups" :route="{ name: 'ServerGroups' }">
            <el-icon><FolderOpened /></el-icon>
            <template #title>{{ t('menu.serverGroups') }}</template>
          </el-menu-item>
          <el-menu-item index="/servers/routes" :route="{ name: 'ServerRoutes' }">
            <el-icon><Connection /></el-icon>
            <template #title>{{ t('menu.routingRules') }}</template>
          </el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/coupons" :route="{ name: 'Coupons' }">
          <el-icon><PriceTag /></el-icon>
          <template #title>{{ t('menu.coupons') }}</template>
        </el-menu-item>

        <el-menu-item index="/tickets" :route="{ name: 'Tickets' }">
          <el-icon><ChatDotRound /></el-icon>
          <template #title>{{ t('menu.tickets') }}</template>
        </el-menu-item>

        <el-menu-item index="/knowledge" :route="{ name: 'Knowledge' }">
          <el-icon><Document /></el-icon>
          <template #title>{{ t('menu.knowledge') }}</template>
        </el-menu-item>

        <el-menu-item index="/notices" :route="{ name: 'Notices' }">
          <el-icon><Bell /></el-icon>
          <template #title>{{ t('menu.notices') }}</template>
        </el-menu-item>

        <el-sub-menu index="/config">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>{{ t('menu.config') }}</span>
          </template>
          <el-menu-item index="/config/system" :route="{ name: 'SystemConfig' }">
            <el-icon><Tools /></el-icon>
            <template #title>{{ t('menu.systemConfig') }}</template>
          </el-menu-item>
          <el-menu-item index="/config/payment" :route="{ name: 'PaymentConfig' }">
            <el-icon><CreditCard /></el-icon>
            <template #title>{{ t('menu.paymentConfig') }}</template>
          </el-menu-item>
          <el-menu-item index="/config/theme" :route="{ name: 'ThemeConfig' }">
            <el-icon><Brush /></el-icon>
            <template #title>{{ t('menu.themeConfig') }}</template>
          </el-menu-item>
          <el-menu-item index="/config/plugin" :route="{ name: 'PluginConfig' }">
            <el-icon><Grid /></el-icon>
            <template #title>{{ t('menu.pluginConfig') }}</template>
          </el-menu-item>
          <el-menu-item index="/config/monitoring" :route="{ name: 'SystemMonitoring' }">
            <el-icon><DataAnalysis /></el-icon>
            <template #title>{{ t('menu.monitoring') }}</template>
          </el-menu-item>
          <el-menu-item index="/config/traffic-reset" :route="{ name: 'TrafficReset' }">
            <el-icon><RefreshRight /></el-icon>
            <template #title>{{ t('menu.trafficReset') }}</template>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <!-- Mobile Drawer -->
    <el-drawer
      v-model="mobileDrawerVisible"
      direction="ltr"
      :size="250"
      :with-header="false"
      class="mobile-drawer"
    >
      <div class="sidebar-header">
        <h1 class="text-xl font-bold text-white">XBoard Admin</h1>
      </div>

      <el-menu
        :default-active="activeMenu"
        background-color="#001529"
        text-color="#ffffff"
        active-text-color="#1890ff"
        router
        class="sidebar-menu"
        @select="handleMobileMenuSelect"
      >
        <el-menu-item index="/" :route="{ name: 'Dashboard' }">
          <el-icon><HomeFilled /></el-icon>
          <template #title>{{ t('menu.dashboard') }}</template>
        </el-menu-item>

        <el-menu-item index="/users" :route="{ name: 'Users' }">
          <el-icon><User /></el-icon>
          <template #title>{{ t('menu.users') }}</template>
        </el-menu-item>

        <el-menu-item index="/orders" :route="{ name: 'Orders' }">
          <el-icon><ShoppingCart /></el-icon>
          <template #title>{{ t('menu.orders') }}</template>
        </el-menu-item>

        <el-menu-item index="/plans" :route="{ name: 'Plans' }">
          <el-icon><Tickets /></el-icon>
          <template #title>{{ t('menu.plans') }}</template>
        </el-menu-item>

        <el-menu-item index="/shared-plans" :route="{ name: 'SharedPlans' }">
          <el-icon><Share /></el-icon>
          <template #title>{{ t('menu.sharedPlans') }}</template>
        </el-menu-item>

        <el-sub-menu index="/servers">
          <template #title>
            <el-icon><Monitor /></el-icon>
            <span>{{ t('menu.servers') }}</span>
          </template>
          <el-menu-item index="/servers" :route="{ name: 'Servers' }">
            <el-icon><Monitor /></el-icon>
            <template #title>{{ t('menu.serverNodes') }}</template>
          </el-menu-item>
          <el-menu-item index="/servers/groups" :route="{ name: 'ServerGroups' }">
            <el-icon><FolderOpened /></el-icon>
            <template #title>{{ t('menu.serverGroups') }}</template>
          </el-menu-item>
          <el-menu-item index="/servers/routes" :route="{ name: 'ServerRoutes' }">
            <el-icon><Connection /></el-icon>
            <template #title>{{ t('menu.routingRules') }}</template>
          </el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/coupons" :route="{ name: 'Coupons' }">
          <el-icon><PriceTag /></el-icon>
          <template #title>{{ t('menu.coupons') }}</template>
        </el-menu-item>

        <el-menu-item index="/tickets" :route="{ name: 'Tickets' }">
          <el-icon><ChatDotRound /></el-icon>
          <template #title>{{ t('menu.tickets') }}</template>
        </el-menu-item>

        <el-menu-item index="/knowledge" :route="{ name: 'Knowledge' }">
          <el-icon><Document /></el-icon>
          <template #title>{{ t('menu.knowledge') }}</template>
        </el-menu-item>

        <el-menu-item index="/notices" :route="{ name: 'Notices' }">
          <el-icon><Bell /></el-icon>
          <template #title>{{ t('menu.notices') }}</template>
        </el-menu-item>

        <el-sub-menu index="/config">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>{{ t('menu.config') }}</span>
          </template>
          <el-menu-item index="/config/system" :route="{ name: 'SystemConfig' }">
            <el-icon><Tools /></el-icon>
            <template #title>{{ t('menu.systemConfig') }}</template>
          </el-menu-item>
          <el-menu-item index="/config/payment" :route="{ name: 'PaymentConfig' }">
            <el-icon><CreditCard /></el-icon>
            <template #title>{{ t('menu.paymentConfig') }}</template>
          </el-menu-item>
          <el-menu-item index="/config/theme" :route="{ name: 'ThemeConfig' }">
            <el-icon><Brush /></el-icon>
            <template #title>{{ t('menu.themeConfig') }}</template>
          </el-menu-item>
          <el-menu-item index="/config/plugin" :route="{ name: 'PluginConfig' }">
            <el-icon><Grid /></el-icon>
            <template #title>{{ t('menu.pluginConfig') }}</template>
          </el-menu-item>
          <el-menu-item index="/config/monitoring" :route="{ name: 'SystemMonitoring' }">
            <el-icon><DataAnalysis /></el-icon>
            <template #title>{{ t('menu.monitoring') }}</template>
          </el-menu-item>
          <el-menu-item index="/config/traffic-reset" :route="{ name: 'TrafficReset' }">
            <el-icon><RefreshRight /></el-icon>
            <template #title>{{ t('menu.trafficReset') }}</template>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-drawer>

    <!-- Main Content -->
    <el-container>
      <!-- Header -->
      <el-header class="header-container">
        <div class="header-left">
          <!-- Mobile Menu Button -->
          <el-button
            v-if="isMobile"
            :icon="Menu"
            circle
            @click="mobileDrawerVisible = true"
            class="mr-2"
          />
          
          <!-- Desktop Collapse Button -->
          <el-button
            v-else
            :icon="isCollapsed ? Expand : Fold"
            circle
            @click="toggleSidebar"
          />

          <!-- Breadcrumb -->
          <el-breadcrumb separator="/" class="ml-4">
            <el-breadcrumb-item
              v-for="item in breadcrumbs"
              :key="item.path"
              :to="item.path"
            >
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <!-- Language Switcher -->
          <LanguageSwitcher class="mr-2" />

          <!-- Theme Toggle -->
          <el-button
            :icon="isDark ? Sunny : Moon"
            circle
            @click="toggleTheme"
            class="mr-2"
          />

          <!-- User Dropdown -->
          <el-dropdown @command="handleCommand">
            <span class="user-dropdown">
              <el-avatar :size="32" class="mr-2">
                <el-icon><User /></el-icon>
              </el-avatar>
              <span class="user-email">{{ authStore.userEmail }}</span>
              <el-icon class="ml-1"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  Profile
                </el-dropdown-item>
                <el-dropdown-item command="settings">
                  <el-icon><Setting /></el-icon>
                  Settings
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  Logout
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- Main Content Area -->
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
    
    <!-- Global Error Notification -->
    <ErrorNotification />
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  HomeFilled,
  Fold,
  Expand,
  Menu,
  User,
  Setting,
  SwitchButton,
  ArrowDown,
  Sunny,
  Moon,
  Tickets,
  Monitor,
  FolderOpened,
  Connection,
  ShoppingCart,
  PriceTag,
  ChatDotRound,
  Document,
  Bell,
  Tools,
  CreditCard,
  Brush,
  Grid,
  DataAnalysis,
  RefreshRight,
  Share
} from '@element-plus/icons-vue'
import ErrorNotification from '@/components/common/ErrorNotification.vue'
import { useAuthStore } from '../stores/auth'
import LanguageSwitcher from '../components/LanguageSwitcher.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

// Mobile detection
const isMobile = ref(false)
const mobileDrawerVisible = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// Sidebar state
const isCollapsed = ref(false)
const sidebarWidth = computed(() => isCollapsed.value ? '64px' : '200px')

// Theme state
const isDark = ref(false)

// Active menu
const activeMenu = computed(() => route.path)

// Breadcrumbs
const breadcrumbs = computed(() => {
  const matched = route.matched.filter(item => item.meta && item.meta.title)
  return matched.map(item => ({
    path: item.path,
    title: item.meta.title as string
  }))
})

// Initialize theme from localStorage
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
}

// Initialize sidebar state from localStorage
const initializeSidebar = () => {
  const savedState = localStorage.getItem('sidebar_collapsed')
  if (savedState === 'true') {
    isCollapsed.value = true
  }
}

// Toggle sidebar
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
  localStorage.setItem('sidebar_collapsed', isCollapsed.value.toString())
}

// Handle mobile menu selection
const handleMobileMenuSelect = () => {
  mobileDrawerVisible.value = false
}

// Toggle theme
const toggleTheme = () => {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

// Handle dropdown commands
const handleCommand = async (command: string) => {
  switch (command) {
    case 'profile':
      ElMessage.info('Profile page coming soon')
      break
    case 'settings':
      ElMessage.info('Settings page coming soon')
      break
    case 'logout':
      try {
        await ElMessageBox.confirm(
          'Are you sure you want to logout?',
          'Confirm Logout',
          {
            confirmButtonText: 'Logout',
            cancelButtonText: 'Cancel',
            type: 'warning'
          }
        )
        
        await authStore.logout()
        ElMessage.success('Logged out successfully')
        router.push({ name: 'Login' })
      } catch (error) {
        // User cancelled or error occurred
        if (error !== 'cancel') {
          ElMessage.error('Logout failed')
        }
      }
      break
  }
}

// Initialize on mount
initializeTheme()
initializeSidebar()
</script>

<style scoped>
.sidebar-container {
  background-color: #001529;
  overflow-x: hidden;
  transition: width 0.3s;
}

.sidebar-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background-color: #001529;
}

.sidebar-menu {
  border-right: none;
  height: calc(100vh - 64px);
}

/* Mobile drawer styles */
.mobile-drawer :deep(.el-drawer__body) {
  padding: 0;
  background-color: #001529;
}

.mobile-drawer .sidebar-menu {
  height: calc(100vh - 64px);
  border-right: none;
}

.header-container {
  background-color: #ffffff;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.dark .header-container {
  background-color: #1f1f1f;
  border-bottom-color: #303030;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-dropdown {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-dropdown:hover {
  background-color: #f5f5f5;
}

.dark .user-dropdown:hover {
  background-color: #303030;
}

.user-email {
  font-size: 14px;
  color: #333;
}

.dark .user-email {
  color: #fff;
}

.main-content {
  background-color: #f0f2f5;
  min-height: calc(100vh - 64px);
  padding: 24px;
}

.dark .main-content {
  background-color: #141414;
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .user-email {
    display: none;
  }
  
  .header-container {
    padding: 0 12px;
  }
  
  .main-content {
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .header-left .el-breadcrumb {
    display: none;
  }
  
  .main-content {
    padding: 8px;
  }
}
</style>
