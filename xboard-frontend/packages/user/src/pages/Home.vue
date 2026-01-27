<template>
  <div class="landing-page">
    <!-- Hero Section (Guest) -->
    <section v-if="!authStore.isAuthenticated" class="hero-section">
      <div class="container">
        <div class="hero-content">
          <div class="hero-text">
            <h1 class="hero-title">
              {{ t('home.hero.title') }}
            </h1>
            <p class="hero-subtitle">
              {{ t('home.hero.subtitle') }}
            </p>
            <div class="hero-actions">
              <n-button
                type="primary"
                size="large"
                :loading="loading"
                @click="handleGetStarted"
              >
                {{ t('home.hero.getStarted') }}
              </n-button>
              <n-button
                size="large"
                quaternary
                @click="scrollToPlans"
              >
                {{ t('home.hero.viewPlans') }}
              </n-button>
            </div>
          </div>
          <div class="hero-image">
            <div class="hero-illustration">
              <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Globe -->
                <circle cx="200" cy="150" r="80" stroke="currentColor" stroke-width="2" opacity="0.2"/>
                <ellipse cx="200" cy="150" rx="80" ry="40" stroke="currentColor" stroke-width="2" opacity="0.2"/>
                <ellipse cx="200" cy="150" rx="40" ry="80" stroke="currentColor" stroke-width="2" opacity="0.2"/>
                <!-- Connection lines -->
                <path d="M120 150 Q160 100 200 150 T280 150" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <path d="M200 70 Q220 110 200 150 T200 230" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <!-- Nodes -->
                <circle cx="120" cy="150" r="8" fill="currentColor" opacity="0.6"/>
                <circle cx="280" cy="150" r="8" fill="currentColor" opacity="0.6"/>
                <circle cx="200" cy="70" r="8" fill="currentColor" opacity="0.6"/>
                <circle cx="200" cy="230" r="8" fill="currentColor" opacity="0.6"/>
                <!-- Center shield -->
                <path d="M200 130 L210 140 L200 170 L190 140 Z" fill="currentColor" opacity="0.8"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Hero Section (Authenticated User) -->
    <section v-else class="hero-section">
      <div class="container">
        <div class="hero-content">
          <div class="hero-text">
            <h1 class="hero-title">
              {{ t('home.hero.welcomeBack') }}
            </h1>
            <p class="hero-subtitle">
              {{ t('home.hero.welcomeBackSubtitle') }}
            </p>
            <div class="user-email">
              {{ authStore.userEmail }}
            </div>
            <div class="hero-actions">
              <n-button
                type="primary"
                size="large"
                @click="router.push({ name: 'Dashboard' })"
              >
                {{ t('home.userInfo.goToDashboard') }}
              </n-button>
              <n-button
                size="large"
                @click="scrollToPlans"
              >
                {{ t('home.hero.viewPlans') }}
              </n-button>
              <n-button
                size="large"
                secondary
                :loading="authStore.loading"
                @click="handleLogout"
              >
                {{ t('userMenu.logout') }}
              </n-button>
            </div>
          </div>
          <div class="hero-image">
            <div class="hero-illustration">
              <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Globe -->
                <circle cx="200" cy="150" r="80" stroke="currentColor" stroke-width="2" opacity="0.2"/>
                <ellipse cx="200" cy="150" rx="80" ry="40" stroke="currentColor" stroke-width="2" opacity="0.2"/>
                <ellipse cx="200" cy="150" rx="40" ry="80" stroke="currentColor" stroke-width="2" opacity="0.2"/>
                <!-- Connection lines -->
                <path d="M120 150 Q160 100 200 150 T280 150" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <path d="M200 70 Q220 110 200 150 T200 230" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <!-- Nodes -->
                <circle cx="120" cy="150" r="8" fill="currentColor" opacity="0.6"/>
                <circle cx="280" cy="150" r="8" fill="currentColor" opacity="0.6"/>
                <circle cx="200" cy="70" r="8" fill="currentColor" opacity="0.6"/>
                <circle cx="200" cy="230" r="8" fill="currentColor" opacity="0.6"/>
                <!-- Center shield -->
                <path d="M200 130 L210 140 L200 170 L190 140 Z" fill="currentColor" opacity="0.8"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">{{ t('home.features.title') }}</h2>
          <p class="section-subtitle">{{ t('home.features.subtitle') }}</p>
        </div>
        <div class="features-grid">
          <div
            v-for="feature in features"
            :key="feature.key"
            class="feature-card"
          >
            <div class="feature-icon">
              <component :is="feature.icon" />
            </div>
            <h3 class="feature-title">{{ t(`home.features.items.${feature.key}.title`) }}</h3>
            <p class="feature-description">{{ t(`home.features.items.${feature.key}.description`) }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section ref="pricingSection" class="pricing-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">{{ t('home.pricing.title') }}</h2>
          <p class="section-subtitle">{{ t('home.pricing.subtitle') }}</p>
        </div>
        
        <!-- Loading State -->
        <div v-if="plansLoading" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p class="mt-4 text-gray-600">{{ t('plans.loading') }}</p>
        </div>
        
        <!-- Empty State -->
        <div v-else-if="pricingPlans.length === 0" class="text-center py-12">
          <p class="text-gray-600">{{ t('plans.noPlans') }}</p>
        </div>
        
        <!-- Plans Grid -->
        <div v-else class="pricing-grid">
          <div
            v-for="plan in pricingPlans"
            :key="plan.id"
            class="pricing-card"
            :class="{ featured: plan.featured }"
          >
            <div v-if="plan.featured" class="featured-badge">
              {{ t('home.pricing.popular') }}
            </div>
            <h3 class="plan-name">{{ plan.name }}</h3>
            <div class="plan-price">
              <span class="price-amount">{{ plan.price }}</span>
              <span class="price-period">{{ t('home.pricing.perMonth') }}</span>
            </div>
            <ul class="plan-features">
              <li v-for="(feature, index) in plan.features" :key="index">
                <svg class="check-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                {{ feature }}
              </li>
            </ul>
            <n-button
              :type="plan.featured ? 'primary' : 'default'"
              size="large"
              block
              @click="handleSelectPlan(plan)"
            >
              {{ t('home.pricing.selectPlan') }}
            </n-button>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section (only show if not authenticated) -->
    <section v-if="!authStore.isAuthenticated" class="cta-section">
      <div class="container">
        <div class="cta-content">
          <h2 class="cta-title">{{ t('home.cta.title') }}</h2>
          <p class="cta-subtitle">{{ t('home.cta.subtitle') }}</p>
          <n-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleGetStarted"
          >
            {{ t('home.cta.button') }}
          </n-button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { NButton } from 'naive-ui'
import { useAuthStore } from '../stores/auth'
import { planApi } from '@xboard/shared'
import type { Plan } from '@xboard/shared'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const pricingSection = ref<HTMLElement>()
const plans = ref<Plan[]>([])
const plansLoading = ref(false)

// Feature icons (using simple SVG components)
const ShieldIcon = () => h('svg', {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2
}, [
  h('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' })
])

const ZapIcon = () => h('svg', {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2
}, [
  h('polygon', { points: '13 2 3 14 12 14 11 22 21 10 12 10 13 2' })
])

const GlobeIcon = () => h('svg', {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2
}, [
  h('circle', { cx: 12, cy: 12, r: 10 }),
  h('line', { x1: 2, y1: 12, x2: 22, y2: 12 }),
  h('path', { d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' })
])

const LockIcon = () => h('svg', {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2
}, [
  h('rect', { x: 3, y: 11, width: 18, height: 11, rx: 2, ry: 2 }),
  h('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' })
])

const features = [
  { key: 'security', icon: ShieldIcon },
  { key: 'speed', icon: ZapIcon },
  { key: 'global', icon: GlobeIcon },
  { key: 'privacy', icon: LockIcon }
]

// Computed property to format plans for display
const pricingPlans = computed(() => {
  return plans.value.slice(0, 3).map(plan => {
    // 处理共享套餐的 pricing_tiers 数据结构
    let price = 'N/A'
    let features: string[] = []
    
    if (plan.pricing_tiers && Object.keys(plan.pricing_tiers).length > 0) {
      // 获取第一个定价层级作为显示价格
      const firstTier = Object.values(plan.pricing_tiers)[0]
      if (firstTier && firstTier.price) {
        price = `¥${(firstTier.price / 100).toFixed(2)}`
      }
      
      // 添加可用的订阅周期
      const periods = Object.values(plan.pricing_tiers).map(tier => tier.period.name)
      if (periods.length > 0) {
        features.push(`可选周期: ${periods.join(', ')}`)
      }
    }
    
    // 添加节点数量
    if (plan.nodes_count) {
      features.push(`${plan.nodes_count} 个节点`)
    }
    
    // 添加描述
    if (plan.description) {
      features.push(plan.description)
    }
    
    return {
      id: plan.id,
      name: plan.name,
      price: price,
      featured: false,
      features: features.filter(f => f)
    }
  })
})

// Fetch plans from API
const fetchPlans = async () => {
  plansLoading.value = true
  try {
    // 获取共享套餐而不是普通套餐
    const response = await fetch('/api/v1/guest/shared-plans')

    if (!response.ok) {
      const text = await response.text()
      console.error('Failed to fetch shared plans:', response.status, response.statusText)
      console.error('Response body:', text)
      plans.value = []
      return
    }

    const result = await response.json()
    
    if (result.status === 'success') {
      plans.value = result.data.data || result.data || []
    } else {
      console.error('Failed to fetch shared plans:', result.message)
      plans.value = []
    }
  } catch (error) {
    console.error('Failed to fetch shared plans:', error)
    plans.value = []
  } finally {
    plansLoading.value = false
  }
}

// Initialize on mount
onMounted(() => {
  fetchPlans()
})

const handleGetStarted = () => {
  if (authStore.isAuthenticated) {
    router.push({ name: 'Dashboard' })
  } else {
    router.push({ name: 'Register' })
  }
}

const handleSelectPlan = (plan: any) => {
  if (authStore.isAuthenticated) {
    // 跳转到共享套餐页面
    router.push({ name: 'SharedPlans' })
  } else {
    router.push({ name: 'Register' })
  }
}

const handleLogout = async () => {
  await authStore.logout()
}

const scrollToPlans = () => {
  pricingSection.value?.scrollIntoView({ behavior: 'smooth' })
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
</script>

<style scoped>
.landing-page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f9fafb, #ffffff);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* Hero Section */
.hero-section {
  padding: 4rem 0 3rem;
  min-height: 400px;
  display: flex;
  align-items: center;
}

.hero-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.hero-text {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.1;
  color: #0f172a;
  margin: 0;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: #475569;
  line-height: 1.6;
  margin: 0;
}

.user-email {
  font-size: 0.9375rem;
  color: #64748b;
  word-break: break-all;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.hero-image {
  display: flex;
  justify-content: center;
  align-items: center;
}

.hero-illustration {
  width: 100%;
  max-width: 400px;
  color: #3b82f6;
}

.hero-illustration svg {
  width: 100%;
  height: auto;
}

/* Section Common Styles */
section {
  padding: 4rem 0;
}

.section-header {
  text-align: center;
  margin-bottom: 3rem;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 1rem;
}

.section-subtitle {
  font-size: 1.125rem;
  color: #64748b;
  margin: 0;
}

/* Features Section */
.features-section {
  background: #ffffff;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.feature-card {
  padding: 2rem;
  border-radius: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  cursor: pointer;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  border-color: #3b82f6;
}

.feature-icon {
  width: 48px;
  height: 48px;
  color: #3b82f6;
  margin-bottom: 1rem;
}

.feature-icon svg {
  width: 100%;
  height: 100%;
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 0.5rem;
}

.feature-description {
  font-size: 0.9375rem;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}

/* Pricing Section */
.pricing-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.pricing-section .section-title,
.pricing-section .section-subtitle {
  color: white;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.pricing-card {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  position: relative;
  transition: all 0.3s ease;
  color: #0f172a;
}

.pricing-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.pricing-card.featured {
  border: 2px solid #3b82f6;
  transform: scale(1.05);
}

.pricing-card.featured:hover {
  transform: scale(1.05) translateY(-8px);
}

.featured-badge {
  position: absolute;
  top: -12px;
  right: 20px;
  background: #3b82f6;
  color: white;
  padding: 0.25rem 1rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
}

.plan-name {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 1rem;
}

.plan-price {
  margin-bottom: 1.5rem;
}

.price-amount {
  font-size: 3rem;
  font-weight: 800;
  color: #3b82f6;
}

.price-period {
  font-size: 1rem;
  color: #64748b;
  margin-left: 0.5rem;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 2rem;
}

.plan-features li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  color: #475569;
}

.check-icon {
  width: 20px;
  height: 20px;
  color: #10b981;
  flex-shrink: 0;
}

/* CTA Section */
.cta-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 5rem 0;
}

.cta-content {
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

.cta-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 1rem;
}

.cta-subtitle {
  font-size: 1.125rem;
  margin: 0 0 2rem;
  opacity: 0.9;
}

/* Responsive Design */
@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
  }

  .hero-section {
    padding: 2.5rem 0 2rem;
    min-height: auto;
  }

  .hero-content {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .hero-title {
    font-size: 2.25rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-image {
    order: -1;
  }

  section {
    padding: 2.5rem 0;
  }

  .section-title {
    font-size: 1.75rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .pricing-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .pricing-card {
    padding: 1.5rem;
  }

  .pricing-card.featured {
    transform: scale(1);
  }

  .pricing-card.featured:hover {
    transform: translateY(-8px);
  }
}
</style>
