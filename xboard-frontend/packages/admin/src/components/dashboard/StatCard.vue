<template>
  <el-card class="stat-card" :body-style="{ padding: '20px' }">
    <div class="stat-card-content">
      <div class="stat-icon" :style="{ backgroundColor: iconBgColor }">
        <el-icon :size="24" :color="iconColor">
          <component :is="icon" />
        </el-icon>
      </div>
      <div class="stat-info">
        <div class="stat-label">{{ label }}</div>
        <div class="stat-value">{{ formattedValue }}</div>
        <div v-if="growth !== undefined" class="stat-growth" :class="growthClass">
          <el-icon :size="14">
            <component :is="growth >= 0 ? ArrowUp : ArrowDown" />
          </el-icon>
          <span>{{ Math.abs(growth).toFixed(1) }}%</span>
          <span class="stat-growth-label">{{ growthLabel }}</span>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { formatCurrency, formatNumber } from '@xboard/shared'

interface Props {
  label: string
  value: number
  icon: any
  iconColor?: string
  iconBgColor?: string
  growth?: number
  growthLabel?: string
  format?: 'currency' | 'number'
}

const props = withDefaults(defineProps<Props>(), {
  iconColor: '#409EFF',
  iconBgColor: '#ecf5ff',
  format: 'number',
  growthLabel: 'vs last period'
})

const formattedValue = computed(() => {
  if (props.format === 'currency') {
    return formatCurrency(props.value)
  }
  return formatNumber(props.value)
})

const growthClass = computed(() => {
  if (props.growth === undefined) return ''
  return props.growth >= 0 ? 'stat-growth-positive' : 'stat-growth-negative'
})
</script>

<style scoped>
.stat-card {
  height: 100%;
  transition: all 0.3s ease;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-card-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.stat-growth {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
}

.stat-growth-positive {
  color: var(--el-color-success);
}

.stat-growth-negative {
  color: var(--el-color-danger);
}

.stat-growth-label {
  color: var(--el-text-color-secondary);
  margin-left: 4px;
}
</style>
