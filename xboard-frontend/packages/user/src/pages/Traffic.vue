<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ t('traffic.title') }}
      </h1>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {{ t('traffic.subtitle') }}
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <n-spin size="large" />
    </div>

    <!-- Error State -->
    <n-alert v-else-if="error" type="error" :title="t('traffic.error')">
      {{ error }}
    </n-alert>

    <!-- Traffic Content -->
    <template v-else>
      <!-- Current Usage Overview -->
      <n-card :title="t('traffic.overview.title')">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div class="text-sm text-blue-600 dark:text-blue-400 mb-1">
              {{ t('traffic.overview.upload') }}
            </div>
            <div class="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {{ formatBytes(totalUpload) }}
            </div>
          </div>

          <div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div class="text-sm text-green-600 dark:text-green-400 mb-1">
              {{ t('traffic.overview.download') }}
            </div>
            <div class="text-2xl font-bold text-green-700 dark:text-green-300">
              {{ formatBytes(totalDownload) }}
            </div>
          </div>

          <div class="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div class="text-sm text-purple-600 dark:text-purple-400 mb-1">
              {{ t('traffic.overview.total') }}
            </div>
            <div class="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {{ formatBytes(totalTraffic) }}
            </div>
          </div>

          <div class="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div class="text-sm text-orange-600 dark:text-orange-400 mb-1">
              {{ t('traffic.overview.remaining') }}
            </div>
            <div class="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {{ formatBytes(userStore.remainingTraffic) }}
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="mt-6">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ t('traffic.overview.quota') }}
            </span>
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ userStore.trafficPercentage }}% {{ t('traffic.overview.percentage') }}
            </span>
          </div>
          <n-progress
            type="line"
            :percentage="userStore.trafficPercentage"
            :status="userStore.trafficPercentage > 90 ? 'error' : userStore.trafficPercentage > 70 ? 'warning' : 'success'"
          />
        </div>
      </n-card>

      <!-- Traffic Statistics -->
      <n-card v-if="trafficStats" :title="t('traffic.stats.title')">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {{ t('traffic.stats.today') }}
            </div>
            <div class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ formatBytes(trafficStats.today) }}
            </div>
          </div>

          <div class="text-center">
            <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {{ t('traffic.stats.yesterday') }}
            </div>
            <div class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ formatBytes(trafficStats.yesterday) }}
            </div>
          </div>

          <div class="text-center">
            <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {{ t('traffic.stats.thisMonth') }}
            </div>
            <div class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ formatBytes(trafficStats.month) }}
            </div>
          </div>

          <div class="text-center">
            <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {{ t('traffic.stats.lastMonth') }}
            </div>
            <div class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ formatBytes(trafficStats.last_month) }}
            </div>
          </div>
        </div>
      </n-card>

      <!-- Filters -->
      <n-card :title="t('traffic.filters.title')">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <n-space vertical>
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ t('traffic.filters.dateRange') }}
            </label>
            <n-date-picker
              v-model:value="dateRangeValue"
              type="daterange"
              clearable
              :placeholder="t('traffic.filters.dateRange')"
              @update:value="handleDateRangeChange"
            />
          </n-space>

          <n-space vertical>
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ t('traffic.filters.server') }}
            </label>
            <n-select
              v-model:value="selectedServer"
              :options="serverOptions"
              :placeholder="t('traffic.filters.allServers')"
              clearable
              filterable
              @update:value="handleServerChange"
            />
          </n-space>

          <n-space vertical class="flex items-end">
            <n-button-group>
              <n-button @click="applyQuickFilter('last7Days')">
                {{ t('traffic.filters.last7Days') }}
              </n-button>
              <n-button @click="applyQuickFilter('last30Days')">
                {{ t('traffic.filters.last30Days') }}
              </n-button>
              <n-button @click="clearFilters">
                {{ t('traffic.filters.clear') }}
              </n-button>
            </n-button-group>
          </n-space>
        </div>
      </n-card>

      <!-- Traffic History Chart -->
      <n-card :title="t('traffic.chart.title')">
        <div v-if="trafficByDate.length === 0" class="text-center py-12 text-gray-500">
          {{ t('traffic.chart.noData') }}
        </div>
        <div v-else class="h-80">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </n-card>

      <!-- Usage by Server -->
      <n-card :title="t('traffic.breakdown.title')">
        <div v-if="trafficByServer.length === 0" class="text-center py-12 text-gray-500">
          {{ t('traffic.breakdown.noData') }}
        </div>
        <n-data-table
          v-else
          :columns="serverColumns"
          :data="trafficByServer"
          :pagination="false"
        />
      </n-card>

      <!-- Traffic Reset Info -->
      <n-card v-if="userStore.profile?.plan_id" :title="t('traffic.resetInfo.title')">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {{ t('traffic.resetInfo.resetDay') }}
            </div>
            <div class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ subscriptionStore.resetDay ? `${t('traffic.resetInfo.description')} ${subscriptionStore.resetDay}` : '-' }}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {{ t('traffic.resetInfo.nextReset') }}
            </div>
            <div class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ getNextResetDate() }}
            </div>
          </div>
        </div>
      </n-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NCard,
  NAlert,
  NSpin,
  NProgress,
  NSpace,
  NDatePicker,
  NSelect,
  NButton,
  NButtonGroup,
  NDataTable,
  NTag,
  type DataTableColumns
} from 'naive-ui'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { useTrafficStore } from '../stores/traffic'
import { useUserStore } from '../stores/user'
import { useSubscriptionStore } from '../stores/subscription'
import { formatBytes } from '@xboard/shared'
import dayjs from 'dayjs'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const { t } = useI18n()

const trafficStore = useTrafficStore()
const userStore = useUserStore()
const subscriptionStore = useSubscriptionStore()

// State
const dateRangeValue = ref<[number, number] | null>(null)
const selectedServer = ref<number | null>(null)

// Computed
const loading = computed(() => trafficStore.loading)
const error = computed(() => trafficStore.error)
const trafficStats = computed(() => trafficStore.trafficStats)
const totalUpload = computed(() => trafficStore.totalUpload)
const totalDownload = computed(() => trafficStore.totalDownload)
const totalTraffic = computed(() => trafficStore.totalTraffic)
const trafficByDate = computed(() => trafficStore.trafficByDate)
const trafficByServer = computed(() => trafficStore.trafficByServer)

// Server options for filter
const serverOptions = computed(() => {
  const servers = subscriptionStore.availableNodes.map(node => ({
    label: node.name,
    value: node.id
  }))
  return [
    ...servers
  ]
})

// Chart data
const chartData = computed(() => ({
  labels: trafficByDate.value.map(item => dayjs(item.date).format('MM/DD')),
  datasets: [
    {
      label: t('traffic.chart.upload'),
      data: trafficByDate.value.map(item => item.upload),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4
    },
    {
      label: t('traffic.chart.download'),
      data: trafficByDate.value.map(item => item.download),
      borderColor: 'rgb(34, 197, 94)',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      fill: true,
      tension: 0.4
    }
  ]
}))

// Chart options
const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const label = context.dataset.label || ''
          const value = formatBytes(context.parsed.y)
          return `${label}: ${value}`
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: any) => formatBytes(value)
      }
    }
  }
}))

// Server breakdown table columns
const serverColumns: DataTableColumns<any> = [
  {
    title: t('traffic.breakdown.server'),
    key: 'server_name'
  },
  {
    title: t('traffic.breakdown.upload'),
    key: 'upload',
    render: (row) => formatBytes(row.upload)
  },
  {
    title: t('traffic.breakdown.download'),
    key: 'download',
    render: (row) => formatBytes(row.download)
  },
  {
    title: t('traffic.breakdown.total'),
    key: 'total',
    render: (row) => formatBytes(row.total)
  },
  {
    title: t('traffic.breakdown.percentage'),
    key: 'percentage',
    render: (row) => h(NTag, { type: 'info' }, { default: () => `${row.percentage}%` })
  }
]

// Methods
const handleDateRangeChange = (value: [number, number] | null) => {
  if (value) {
    const [start, end] = value
    trafficStore.setDateRange(
      dayjs(start).format('YYYY-MM-DD'),
      dayjs(end).format('YYYY-MM-DD')
    )
  } else {
    trafficStore.setDateRange()
  }
}

const handleServerChange = (value: number | null) => {
  trafficStore.setServerFilter(value || undefined)
}

const applyQuickFilter = (filter: string) => {
  const now = dayjs()
  let start: string
  let end: string

  switch (filter) {
    case 'last7Days':
      start = now.subtract(7, 'day').format('YYYY-MM-DD')
      end = now.format('YYYY-MM-DD')
      break
    case 'last30Days':
      start = now.subtract(30, 'day').format('YYYY-MM-DD')
      end = now.format('YYYY-MM-DD')
      break
    case 'thisMonth':
      start = now.startOf('month').format('YYYY-MM-DD')
      end = now.format('YYYY-MM-DD')
      break
    case 'lastMonth':
      start = now.subtract(1, 'month').startOf('month').format('YYYY-MM-DD')
      end = now.subtract(1, 'month').endOf('month').format('YYYY-MM-DD')
      break
    default:
      return
  }

  dateRangeValue.value = [dayjs(start).valueOf(), dayjs(end).valueOf()]
  trafficStore.setDateRange(start, end)
}

const clearFilters = () => {
  dateRangeValue.value = null
  selectedServer.value = null
  trafficStore.clearFilters()
}

const getNextResetDate = () => {
  const resetDay = subscriptionStore.resetDay
  if (!resetDay) return '-'

  const now = dayjs()
  let nextReset = now.date(resetDay)

  // If the reset day has passed this month, move to next month
  if (now.date() >= resetDay) {
    nextReset = nextReset.add(1, 'month')
  }

  return nextReset.format('YYYY-MM-DD')
}

// Initialize
onMounted(async () => {
  await Promise.all([
    trafficStore.initialize(),
    subscriptionStore.fetchSubscription()
  ])
})
</script>
