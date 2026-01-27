<template>
  <el-card>
    <template #header>
      <div class="chart-header">
        <span class="chart-title">{{ t('dashboard.revenueTrend') }}</span>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          :range-separator="t('dashboard.to')"
          :start-placeholder="t('dashboard.startDate')"
          :end-placeholder="t('dashboard.endDate')"
          size="small"
          @change="handleDateChange"
        />
      </div>
    </template>
    <div v-loading="loading" class="chart-container">
      <v-chart
        v-if="!loading && chartData.length > 0"
        :option="chartOption"
        :autoresize="true"
        class="chart"
      />
      <el-empty
        v-else-if="!loading && chartData.length === 0"
        :description="t('dashboard.noDataAvailable')"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import type { OrderStats } from '@xboard/shared'
import { formatCurrency } from '@xboard/shared'
import dayjs from 'dayjs'

// Register ECharts components
use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

interface Props {
  data: OrderStats[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  dateChange: [start: string, end: string]
}>()

const { t } = useI18n()
const dateRange = ref<[Date, Date] | null>(null)

const chartData = computed(() => props.data)

const chartOption = computed<EChartsOption>(() => {
  const dates = chartData.value.map(item => item.date)
  const revenues = chartData.value.map(item => item.total)
  const commissions = chartData.value.map(item => item.commission_total)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      },
      formatter: (params: any) => {
        let result = `<div style="font-weight: 600; margin-bottom: 8px;">${params[0].axisValue}</div>`
        params.forEach((param: any) => {
          result += `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${param.color};"></span>
              <span>${param.seriesName}:</span>
              <span style="font-weight: 600; margin-left: auto;">${formatCurrency(param.value)}</span>
            </div>
          `
        })
        return result
      }
    },
    legend: {
      data: [t('dashboard.revenue'), t('dashboard.commission')],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '50px',
      top: '20px',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: {
        formatter: (value: string) => {
          return dayjs(value).format('MMM DD')
        }
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => {
          return formatCurrency(value)
        }
      }
    },
    series: [
      {
        name: t('dashboard.revenue'),
        type: 'line',
        smooth: true,
        data: revenues,
        itemStyle: {
          color: '#409EFF'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: 'rgba(64, 158, 255, 0.3)'
              },
              {
                offset: 1,
                color: 'rgba(64, 158, 255, 0.05)'
              }
            ]
          }
        }
      },
      {
        name: t('dashboard.commission'),
        type: 'line',
        smooth: true,
        data: commissions,
        itemStyle: {
          color: '#67C23A'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: 'rgba(103, 194, 58, 0.3)'
              },
              {
                offset: 1,
                color: 'rgba(103, 194, 58, 0.05)'
              }
            ]
          }
        }
      }
    ]
  }
})

const handleDateChange = (value: [Date, Date] | null) => {
  if (value && value.length === 2) {
    const start = dayjs(value[0]).format('YYYY-MM-DD')
    const end = dayjs(value[1]).format('YYYY-MM-DD')
    emit('dateChange', start, end)
  }
}
</script>

<style scoped>
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
}

.chart-container {
  min-height: 350px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart {
  width: 100%;
  height: 350px;
}
</style>
