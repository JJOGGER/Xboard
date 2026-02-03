import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes: RouteRecordRaw[] = [
  // Public routes
  {
    path: '/',
    name: 'Home',
    component: () => import('../pages/Home.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../pages/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../pages/Register.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('../pages/ForgotPassword.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('../pages/ResetPassword.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/payment/callback',
    name: 'PaymentCallback',
    component: () => import('../pages/PaymentCallback.vue'),
    meta: { requiresAuth: true }
  },
  
  // Protected routes (require authentication)
  {
    path: '/dashboard',
    component: () => import('../layouts/UserLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../pages/Dashboard.vue')
      },
      {
        path: '/shared-plans',
        name: 'SharedPlans',
        component: () => import('../pages/SharedPlans.vue')
      },
      {
        path: '/subscription',
        name: 'Subscription',
        component: () => import('../pages/Subscription.vue')
      },
      {
        path: '/checkout',
        name: 'Checkout',
        component: () => import('../pages/Checkout.vue')
      },
      {
        path: '/orders',
        name: 'Orders',
        component: () => import('../pages/Orders.vue')
      },
      {
        path: '/orders/:trade_no',
        name: 'OrderDetail',
        component: () => import('../pages/OrderDetail.vue')
      },
      {
        path: '/referral',
        name: 'Referral',
        component: () => import('../pages/Referral.vue')
      },
      {
        path: '/tickets',
        name: 'Tickets',
        component: () => import('../pages/Tickets.vue')
      },
      {
        path: '/tickets/new',
        name: 'TicketCreate',
        component: () => import('../pages/TicketCreate.vue')
      },
      {
        path: '/tickets/:id',
        name: 'TicketDetail',
        component: () => import('../pages/TicketDetail.vue')
      },
      {
        path: '/knowledge',
        name: 'Knowledge',
        component: () => import('../pages/Knowledge.vue')
      },
      {
        path: '/gift-cards',
        name: 'GiftCards',
        component: () => import('../pages/GiftCards.vue')
      },
      {
        path: '/settings',
        name: 'Settings',
        component: () => import('../pages/Settings.vue')
      }
    ]
  },

  // Catch-all 404 route
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../pages/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Navigation guard for authentication
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  if (requiresAuth && !authStore.isAuthenticated) {
    // Redirect to login if route requires auth and user is not authenticated
    next({
      name: 'Login',
      query: { redirect: to.fullPath }
    })
  } else if ((to.name === 'Login' || to.name === 'Register') && authStore.isAuthenticated) {
    // Redirect to dashboard if user is already authenticated and trying to access login/register
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

export default router
