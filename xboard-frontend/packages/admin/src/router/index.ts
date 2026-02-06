import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { useAuthStore } from '../stores/auth'

function getSecurePathFromLocationPathname(): string | undefined {
  if (typeof window === 'undefined') return undefined
  // 支持两种模式：/xxx/mazu/ 和 /xxx/
  const mazuMatch = window.location.pathname.match(/^\/([\w-]+)\/mazu(?:\/|$)/)
  if (mazuMatch?.[1]) return mazuMatch?.[1]
  const match = window.location.pathname.match(/^\/([\w-]+)(?:\/|$)/)
  return match?.[1]
}

function normalizeSecurePath(value: string): string {
  return value.replace(/^\/+/, '').replace(/\/+$/, '')
}

function getAdminRouterBase(): string {
  if (import.meta.env.MODE !== 'production') return '/'

  // 兼容旧的路径模式
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin-v2/')) {
    return '/admin-v2/'
  }
  const securePath = (globalThis as any)?.window?.settings?.secure_path
  if (typeof securePath === 'string' && securePath.length > 0) {
    return `/${normalizeSecurePath(securePath)}/mazu/`
  }
  const securePathFromPathname = getSecurePathFromLocationPathname()
  if (typeof securePathFromPathname === 'string' && securePathFromPathname.length > 0) {
    return `/${normalizeSecurePath(securePathFromPathname)}/mazu/`
  }
  return '/admin-v2/'
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../pages/Login.vue'),
    meta: { requiresAuth: false, requiresGuest: true }
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../pages/Dashboard.vue'),
        meta: { title: 'Dashboard' }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('../pages/users/UserList.vue'),
        meta: { title: 'User Management' }
      },
      {
        path: 'plans',
        name: 'Plans',
        component: () => import('../pages/plans/PlanList.vue'),
        meta: { title: 'Plan Management' }
      },
      {
        path: 'servers',
        name: 'Servers',
        component: () => import('../pages/servers/ServerList.vue'),
        meta: { title: 'Server Management' }
      },
      {
        path: 'servers/groups',
        name: 'ServerGroups',
        component: () => import('../pages/servers/ServerGroups.vue'),
        meta: { title: 'Server Groups' }
      },
      {
        path: 'servers/routes',
        name: 'ServerRoutes',
        component: () => import('../pages/servers/ServerRoutes.vue'),
        meta: { title: 'Server Routes' }
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('../pages/orders/OrderList.vue'),
        meta: { title: 'Order Management' }
      },
      {
        path: 'coupons',
        name: 'Coupons',
        component: () => import('../pages/coupons/CouponList.vue'),
        meta: { title: 'Coupon Management' }
      },
      {
        path: 'tickets',
        name: 'Tickets',
        component: () => import('../pages/tickets/TicketList.vue'),
        meta: { title: 'Ticket Management' }
      },
      {
        path: 'knowledge',
        name: 'Knowledge',
        component: () => import('../pages/knowledge/KnowledgeList.vue'),
        meta: { title: 'Knowledge Base' }
      },
      {
        path: 'notices',
        name: 'Notices',
        component: () => import('../pages/notices/NoticeList.vue'),
        meta: { title: 'Notice Management' }
      },
      {
        path: 'config/system',
        name: 'SystemConfig',
        component: () => import('../pages/config/SystemConfig.vue'),
        meta: { title: 'System Configuration' }
      },
      {
        path: 'config/payment',
        name: 'PaymentConfig',
        component: () => import('../pages/config/PaymentManagement.vue'),
        meta: { title: 'Payment Configuration' }
      },
      {
        path: 'config/theme',
        name: 'ThemeConfig',
        component: () => import('../pages/config/ThemeManagement.vue'),
        meta: { title: 'Theme Management' }
      },
      {
        path: 'config/plugin',
        name: 'PluginConfig',
        component: () => import('../pages/config/PluginManagement.vue'),
        meta: { title: 'Plugin Management' }
      },
      {
        path: 'config/monitoring',
        name: 'SystemMonitoring',
        component: () => import('../pages/config/SystemMonitoring.vue'),
        meta: { title: 'System Monitoring' }
      },
      {
        path: 'config/traffic-reset',
        name: 'TrafficReset',
        component: () => import('../pages/config/TrafficResetManagement.vue'),
        meta: { title: 'Traffic Reset Management' }
      },
      {
        path: 'shared-plans',
        name: 'SharedPlans',
        component: () => import('../pages/shared-plans/SharedPlanList.vue'),
        meta: { title: '共享订阅管理' }
      },
      {
        path: 'shared-plans/import',
        name: 'ImportSubscription',
        component: () => import('../pages/shared-plans/ImportSubscription.vue'),
        meta: { title: '导入订阅' }
      },
      
      // More routes will be added as features are implemented
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(getAdminRouterBase()),
  routes
})

// Navigation guard for authentication
router.beforeEach((to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
  const authStore = useAuthStore()
  
  // Check if route requires authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Redirect to login if not authenticated
    next({ 
      name: 'Login',
      query: { redirect: to.fullPath }
    })
    return
  }
  
  // Check if route requires guest (not authenticated)
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    // Redirect to dashboard if already authenticated
    next({ name: 'Dashboard' })
    return
  }
  
  // Check if route requires admin role
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    // Redirect to login if not admin
    next({ name: 'Login' })
    return
  }
  
  // Set page title
  if (to.meta.title) {
    document.title = `${to.meta.title} - XBoard Admin`
  } else {
    document.title = 'XBoard Admin'
  }
  
  next()
})

export default router

