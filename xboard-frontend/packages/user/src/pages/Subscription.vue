<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ t('subscription.title') }}
      </h1>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {{ t('subscription.subtitle') }}
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <n-spin size="large" />
    </div>

    <!-- Error State -->
    <n-alert v-else-if="error" type="error" :title="t('subscription.error')">
      {{ error }}
    </n-alert>

    <!-- No Subscription -->
    <n-alert
      v-else-if="!hasAnySubscription"
      type="warning"
      :title="t('subscription.noSubscription')"
    >
      <template #default>
        <p class="mb-4">{{ t('subscription.noSubscription') }}</p>
        <n-button type="primary" @click="router.push('/plans')">
          {{ t('plans.title') }}
        </n-button>
      </template>
    </n-alert>

    <!-- Subscription Content -->
    <template v-else>
      <!-- Subscription Link Card -->
      <n-card v-if="false" :title="t('subscription.subscriptionLink.title')">
        <template #header-extra>
          <n-button
            text
            type="primary"
            @click="showQR = !showQR"
          >
            {{ showQR ? t('subscription.subscriptionLink.hideQR') : t('subscription.subscriptionLink.showQR') }}
          </n-button>
        </template>

        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {{ t('subscription.subscriptionLink.description') }}
        </p>

        <!-- Subscription URL -->
        <n-input-group>
          <n-input
            :value="effectiveSubscriptionUrl"
            readonly
            type="text"
            placeholder="Loading..."
          />
          <n-button type="primary" @click="copySubscriptionLink">
            <template #icon>
              <n-icon>
                <copy-outline />
              </n-icon>
            </template>
            {{ copied ? t('subscription.subscriptionLink.copied') : t('subscription.subscriptionLink.copy') }}
          </n-button>
        </n-input-group>

        <!-- QR Code -->
        <n-collapse-transition :show="showQR">
          <div class="mt-6 flex flex-col items-center">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {{ t('subscription.subscriptionLink.scanQR') }}
            </p>
            <div class="bg-white p-4 rounded-lg">
              <canvas ref="qrCanvas" />
            </div>
          </div>
        </n-collapse-transition>

        <!-- Reset Secret Button (only for traditional subscription) -->
        <div v-if="!hasSharedSubscription" class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <n-alert type="warning" :title="t('subscription.resetSecret.warning')" class="mb-4">
            {{ t('subscription.resetSecret.confirm') }}
          </n-alert>
          <n-button
            type="error"
            ghost
            :loading="resetting"
            @click="handleResetSecret"
          >
            {{ t('subscription.resetSecret.button') }}
          </n-button>
        </div>
      </n-card>

      <!-- Subscription Info Card -->
      <n-card :title="t('subscription.subscriptionInfo.title')">
        <n-descriptions :column="2" bordered>
          <n-descriptions-item :label="t('subscription.subscriptionInfo.plan')">
            {{ effectivePlanName || '-' }}
          </n-descriptions-item>
          <n-descriptions-item :label="t('subscription.subscriptionInfo.status')">
            <n-tag :type="effectiveIsExpired ? 'error' : 'success'">
              {{ effectiveIsExpired ? t('subscription.subscriptionInfo.expired') : t('subscription.subscriptionInfo.active') }}
            </n-tag>
          </n-descriptions-item>
          <n-descriptions-item :label="t('subscription.subscriptionInfo.expiresAt')">
            {{ effectiveExpiredAtDisplay || '-' }}
            <span v-if="!effectiveIsExpired && effectiveExpiredAt" class="text-sm text-gray-500 ml-2">
              ({{ effectiveDaysUntilExpiry }} {{ t('subscription.subscriptionInfo.daysRemaining') }})
            </span>
          </n-descriptions-item>
          <n-descriptions-item :label="t('subscription.subscriptionInfo.resetDay')">
            {{ resetDay ? `${t('subscription.subscriptionInfo.everyMonth')} ${resetDay}` : '-' }}
          </n-descriptions-item>
        </n-descriptions>
      </n-card>

      <!-- Server Nodes Card -->
      <n-card :title="t('subscription.serverNodes.title')">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {{ t('subscription.serverNodes.description') }}
        </p>

        <!-- Shared subscription nodes -->
        <div v-if="hasSharedSubscription">
          <div v-if="sharedNodes.length === 0" class="text-center py-8 text-gray-500">
            {{ t('subscription.serverNodes.noServers') }}
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="(node, idx) in sharedNodes"
              :key="node.id || node.name || idx"
              class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium text-gray-900 dark:text-white">
                  {{ node.name || node.ps || `Node ${idx + 1}` }}
                </span>
                <n-tag type="success" size="small">
                  正常
                </n-tag>
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400">
                <div class="font-medium">{{ getProtocolFromNode(node) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Traditional subscription nodes -->
        <template v-else>
          <div v-if="availableNodes.length === 0" class="text-center py-8 text-gray-500">
            {{ t('subscription.serverNodes.noServers') }}
          </div>
          <div v-else class="space-y-6">
            <div v-for="(nodes, region) in nodesByRegion" :key="region">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {{ region }}
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                  v-for="node in nodes"
                  :key="node.id"
                  class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-500 dark:hover:border-primary-500 transition-colors"
                >
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-medium text-gray-900 dark:text-white">
                      {{ node.name }}
                    </span>
                    <n-tag :type="node.show === true ? 'success' : 'default'" size="small">
                      {{ node.show === true ? t('subscription.serverNodes.online') : t('subscription.serverNodes.offline') }}
                    </n-tag>
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">
                    <div>{{ node.host }}:{{ node.port }}</div>
                    <div v-if="node.rate !== 1" class="mt-1">
                      {{ t('subscription.serverNodes.rate') }}: {{ node.rate }}x
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </n-card>

      <!-- Client Configuration Card (traditional only) -->
      <n-card v-if="!hasSharedSubscription" :title="t('subscription.clientConfig.title')">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {{ t('subscription.clientConfig.description') }}
        </p>

        <n-tabs type="line" animated>
          <n-tab-pane name="ios" :tab="t('subscription.clientConfig.platforms.ios')">
            <div class="space-y-4">
              <h4 class="font-medium text-gray-900 dark:text-white">
                {{ t('subscription.clientConfig.recommendedClients') }}
              </h4>
              <ul class="list-disc list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>Shadowrocket</li>
                <li>Quantumult X</li>
                <li>Surge</li>
              </ul>
              <div class="mt-4">
                <h4 class="font-medium text-gray-900 dark:text-white mb-2">
                  {{ t('subscription.clientConfig.steps.download') }}
                </h4>
                <ol class="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>{{ t('subscription.clientConfig.steps.download') }}</li>
                  <li>{{ t('subscription.clientConfig.steps.import') }}</li>
                  <li>{{ t('subscription.clientConfig.steps.connect') }}</li>
                </ol>
              </div>
            </div>
          </n-tab-pane>

          <n-tab-pane name="android" :tab="t('subscription.clientConfig.platforms.android')">
            <div class="space-y-4">
              <h4 class="font-medium text-gray-900 dark:text-white">
                {{ t('subscription.clientConfig.recommendedClients') }}
              </h4>
              <ul class="list-disc list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>v2rayNG</li>
                <li>Clash for Android</li>
                <li>SagerNet</li>
              </ul>
              <div class="mt-4">
                <h4 class="font-medium text-gray-900 dark:text-white mb-2">
                  {{ t('subscription.clientConfig.steps.download') }}
                </h4>
                <ol class="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>{{ t('subscription.clientConfig.steps.download') }}</li>
                  <li>{{ t('subscription.clientConfig.steps.import') }}</li>
                  <li>{{ t('subscription.clientConfig.steps.connect') }}</li>
                </ol>
              </div>
            </div>
          </n-tab-pane>

          <n-tab-pane name="windows" :tab="t('subscription.clientConfig.platforms.windows')">
            <div class="space-y-4">
              <h4 class="font-medium text-gray-900 dark:text-white">
                {{ t('subscription.clientConfig.recommendedClients') }}
              </h4>
              <ul class="list-disc list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>v2rayN</li>
                <li>Clash for Windows</li>
                <li>Qv2ray</li>
              </ul>
              <div class="mt-4">
                <h4 class="font-medium text-gray-900 dark:text-white mb-2">
                  {{ t('subscription.clientConfig.steps.download') }}
                </h4>
                <ol class="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>{{ t('subscription.clientConfig.steps.download') }}</li>
                  <li>{{ t('subscription.clientConfig.steps.import') }}</li>
                  <li>{{ t('subscription.clientConfig.steps.connect') }}</li>
                </ol>
              </div>
            </div>
          </n-tab-pane>

          <n-tab-pane name="macos" :tab="t('subscription.clientConfig.platforms.macos')">
            <div class="space-y-4">
              <h4 class="font-medium text-gray-900 dark:text-white">
                {{ t('subscription.clientConfig.recommendedClients') }}
              </h4>
              <ul class="list-disc list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>ClashX</li>
                <li>V2RayU</li>
                <li>Qv2ray</li>
              </ul>
              <div class="mt-4">
                <h4 class="font-medium text-gray-900 dark:text-white mb-2">
                  {{ t('subscription.clientConfig.steps.download') }}
                </h4>
                <ol class="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>{{ t('subscription.clientConfig.steps.download') }}</li>
                  <li>{{ t('subscription.clientConfig.steps.import') }}</li>
                  <li>{{ t('subscription.clientConfig.steps.connect') }}</li>
                </ol>
              </div>
            </div>
          </n-tab-pane>

          <n-tab-pane name="linux" :tab="t('subscription.clientConfig.platforms.linux')">
            <div class="space-y-4">
              <h4 class="font-medium text-gray-900 dark:text-white">
                {{ t('subscription.clientConfig.recommendedClients') }}
              </h4>
              <ul class="list-disc list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>v2rayA</li>
                <li>Qv2ray</li>
                <li>Clash</li>
              </ul>
              <div class="mt-4">
                <h4 class="font-medium text-gray-900 dark:text-white mb-2">
                  {{ t('subscription.clientConfig.steps.download') }}
                </h4>
                <ol class="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>{{ t('subscription.clientConfig.steps.download') }}</li>
                  <li>{{ t('subscription.clientConfig.steps.import') }}</li>
                  <li>{{ t('subscription.clientConfig.steps.connect') }}</li>
                </ol>
              </div>
            </div>
          </n-tab-pane>
        </n-tabs>
      </n-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  NCard,
  NAlert,
  NSpin,
  NButton,
  NInput,
  NInputGroup,
  NIcon,
  NTag,
  NDescriptions,
  NDescriptionsItem,
  NProgress,
  NTabs,
  NTabPane,
  NCollapseTransition,
  useDialog,
  useMessage
} from 'naive-ui'
import { CopyOutline } from '@vicons/ionicons5'
import QRCode from 'qrcode'
import ClipboardJS from 'clipboard'
import { useSubscriptionStore } from '../stores/subscription'
import { useSharedPlanStore } from '../stores/sharedPlan'
import { formatBytes, formatDate } from '@xboard/shared'

const router = useRouter()
const { t } = useI18n()
const dialog = useDialog()
const message = useMessage()

const subscriptionStore = useSubscriptionStore()
const sharedPlanStore = useSharedPlanStore()

// State
const showQR = ref(false)
const copied = ref(false)
const resetting = ref(false)
const qrCanvas = ref<HTMLCanvasElement | null>(null)

// Computed
const loading = computed(() => subscriptionStore.loading)
const error = computed(() => subscriptionStore.error)
const subscription = computed(() => subscriptionStore.subscription)
const subscriptionUrl = computed(() => subscriptionStore.subscriptionUrl)
const hasSubscription = computed(() => subscriptionStore.hasSubscription)
const isExpired = computed(() => subscriptionStore.isExpired)
const daysUntilExpiry = computed(() => subscriptionStore.daysUntilExpiry)
const trafficUsed = computed(() => subscriptionStore.trafficUsed)
const trafficRemaining = computed(() => subscriptionStore.trafficRemaining)
const trafficPercentage = computed(() => subscriptionStore.trafficPercentage)
const resetDay = computed(() => subscriptionStore.resetDay)
const availableNodes = computed(() => subscriptionStore.availableNodes)
const nodesByRegion = computed(() => subscriptionStore.nodesByRegion)

const sharedSubscriptions = computed(() => sharedPlanStore.userSubscriptions)
const hasSharedSubscription = computed(() => sharedSubscriptions.value.length > 0)

const primarySharedSubscription = computed(() => {
  if (sharedSubscriptions.value.length === 0) return null
  // Prefer active slot
  return sharedSubscriptions.value.find((s: any) => s?.slot?.status === 'active') || sharedSubscriptions.value[0]
})

const hasAnySubscription = computed(() => {
  return hasSharedSubscription.value || hasSubscription.value
})

const effectiveSubscriptionUrl = computed(() => {
  return primarySharedSubscription.value?.subscription_url || subscriptionUrl.value
})

const effectivePlanName = computed(() => {
  return primarySharedSubscription.value?.plan?.name || (subscription.value as any)?.plan_name || '-'
})

const effectiveExpiredAt = computed(() => {
  const sharedExpire = primarySharedSubscription.value?.slot?.expire_at
  if (sharedExpire) {
    // shared expire_at is usually ISO string
    const ts = Math.floor(new Date(sharedExpire).getTime() / 1000)
    return Number.isFinite(ts) ? ts : null
  }
  const legacyExpire = (subscription.value as any)?.expired_at
  return legacyExpire ? Number(legacyExpire) : null
})

const effectiveExpiredAtDisplay = computed(() => {
  const sharedExpire = primarySharedSubscription.value?.slot?.expire_at
  if (sharedExpire) {
    // Keep shared subscription display based on its ISO string
    return new Date(sharedExpire).toLocaleString()
  }
  if (effectiveExpiredAt.value) {
    return formatDate(effectiveExpiredAt.value)
  }
  return ''
})

const effectiveIsExpired = computed(() => {
  if (!effectiveExpiredAt.value) return true
  return effectiveExpiredAt.value < Date.now() / 1000
})

const effectiveDaysUntilExpiry = computed(() => {
  if (!effectiveExpiredAt.value) return 0
  const now = Date.now() / 1000
  const diff = effectiveExpiredAt.value - now
  return Math.max(0, Math.ceil(diff / 86400))
})

const sharedNodes = computed(() => {
  const nodes = (primarySharedSubscription.value as any)?.plan?.nodes_config
  if (!Array.isArray(nodes)) return []
  
  // Filter out nodes where server is an IP address
  const filteredNodes = nodes.filter((node: any) => {
    const server = node.server || node.host
    if (!server) return false
    
    // Check if server is an IP address (IPv4 or IPv6)
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/
    
    return !ipv4Regex.test(server) && !ipv6Regex.test(server)
  })
  
  return filteredNodes
})

const getProtocolFromNode = (node: any): string => {
  // Try to determine protocol from node properties
  if (node.type) return node.type.toUpperCase();
  if (node.protocol) return node.protocol.toUpperCase();
  
  // Fallback: check common node properties
  if (node.v) return 'VMESS';
  if (node.ss) return 'SHADOWSOCKS';
  if (node.trojan) return 'TROJAN';
  if (node.hysteria) return 'HYSTERIA';
  if (node.hysteria2) return 'HYSTERIA2';
  if (node.vless) return 'VLESS';
  
  return 'UNKNOWN';
};

// Methods
const copySubscriptionLink = () => {
  const clipboard = new ClipboardJS('.n-button', {
    text: () => effectiveSubscriptionUrl.value
  })

  clipboard.on('success', () => {
    copied.value = true
    message.success(t('subscription.subscriptionLink.copied'))
    setTimeout(() => {
      copied.value = false
    }, 2000)
    clipboard.destroy()
  })

  clipboard.on('error', () => {
    message.error('Failed to copy')
    clipboard.destroy()
  })
}

const generateQRCode = async () => {
  if (!qrCanvas.value || !effectiveSubscriptionUrl.value) return

  try {
    await QRCode.toCanvas(qrCanvas.value, effectiveSubscriptionUrl.value, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
  } catch (err) {
    console.error('Failed to generate QR code:', err)
  }
}

const handleResetSecret = () => {
  dialog.warning({
    title: t('subscription.resetSecret.button'),
    content: t('subscription.resetSecret.confirm'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      resetting.value = true
      try {
        await subscriptionStore.resetSecret()
        message.success(t('subscription.resetSecret.success'))
        // Regenerate QR code with new URL
        if (showQR.value) {
          await nextTick()
          await generateQRCode()
        }
      } catch (err: any) {
        message.error(err.message || t('subscription.resetSecret.error'))
      } finally {
        resetting.value = false
      }
    }
  })
}

// Watch for QR code visibility
watch(showQR, async (show) => {
  if (show) {
    await nextTick()
    await generateQRCode()
  }
})

// Initialize
onMounted(async () => {
  await Promise.all([
    subscriptionStore.initialize(),
    sharedPlanStore.fetchUserSubscriptions(),
  ])
})
</script>
