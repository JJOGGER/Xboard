import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatCard from '@/components/dashboard/StatCard.vue'
import { Money } from '@element-plus/icons-vue'

describe('StatCard Component', () => {
  it('should render label and formatted value correctly', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Monthly Revenue',
        value: 12345.67,
        icon: Money,
        format: 'currency'
      }
    })

    expect(wrapper.find('.stat-label').text()).toBe('Monthly Revenue')
    expect(wrapper.find('.stat-value').text()).toContain('12,345.67')
  })

  it('should format value as number when format is "number"', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Total Users',
        value: 1234,
        icon: Money,
        format: 'number'
      }
    })

    expect(wrapper.find('.stat-value').text()).toBe('1,234')
  })

  it('should display positive growth with correct styling', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Revenue',
        value: 1000,
        icon: Money,
        growth: 15.5,
        growthLabel: 'vs last month'
      }
    })

    const growthElement = wrapper.find('.stat-growth')
    expect(growthElement.exists()).toBe(true)
    expect(growthElement.classes()).toContain('stat-growth-positive')
    expect(growthElement.text()).toContain('15.5%')
    expect(growthElement.text()).toContain('vs last month')
  })

  it('should display negative growth with correct styling', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Revenue',
        value: 1000,
        icon: Money,
        growth: -8.3
      }
    })

    const growthElement = wrapper.find('.stat-growth')
    expect(growthElement.exists()).toBe(true)
    expect(growthElement.classes()).toContain('stat-growth-negative')
    expect(growthElement.text()).toContain('8.3%')
  })

  it('should not display growth when growth prop is undefined', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Revenue',
        value: 1000,
        icon: Money
      }
    })

    expect(wrapper.find('.stat-growth').exists()).toBe(false)
  })

  it('should use default icon colors when not provided', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Revenue',
        value: 1000,
        icon: Money
      }
    })

    const iconContainer = wrapper.find('.stat-icon')
    expect(iconContainer.attributes('style')).toContain('#ecf5ff')
  })

  it('should use custom icon colors when provided', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Revenue',
        value: 1000,
        icon: Money,
        iconColor: '#67C23A',
        iconBgColor: '#f0f9ff'
      }
    })

    const iconContainer = wrapper.find('.stat-icon')
    expect(iconContainer.attributes('style')).toContain('#f0f9ff')
  })

  it('should handle zero value correctly', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Revenue',
        value: 0,
        icon: Money,
        format: 'currency'
      }
    })

    expect(wrapper.find('.stat-value').text()).toContain('0')
  })

  it('should handle large numbers correctly', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Revenue',
        value: 1234567890,
        icon: Money,
        format: 'number'
      }
    })

    expect(wrapper.find('.stat-value').text()).toBe('1,234,567,890')
  })
})
