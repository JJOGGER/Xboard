import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RevenueChart from '@/components/dashboard/RevenueChart.vue'
import type { OrderStats } from '@xboard/shared'

describe('RevenueChart Component', () => {
  const mockData: OrderStats[] = [
    { date: '2024-01-01', total: 1000, commission_total: 100 },
    { date: '2024-01-02', total: 1500, commission_total: 150 },
    { date: '2024-01-03', total: 2000, commission_total: 200 }
  ]

  it('should render chart when data is provided', () => {
    const wrapper = mount(RevenueChart, {
      props: {
        data: mockData,
        loading: false
      }
    })

    expect(wrapper.find('.v-chart').exists()).toBe(true)
  })

  it('should transform data correctly for chart', () => {
    const wrapper = mount(RevenueChart, {
      props: {
        data: mockData,
        loading: false
      }
    })

    const chartOption = (wrapper.vm as any).chartOption
    
    // Check that dates are extracted correctly
    expect(chartOption.xAxis.data).toEqual(['2024-01-01', '2024-01-02', '2024-01-03'])
    
    // Check that revenue data is extracted correctly
    expect(chartOption.series[0].data).toEqual([1000, 1500, 2000])
    
    // Check that commission data is extracted correctly
    expect(chartOption.series[1].data).toEqual([100, 150, 200])
  })

  it('should have correct series configuration', () => {
    const wrapper = mount(RevenueChart, {
      props: {
        data: mockData,
        loading: false
      }
    })

    const chartOption = (wrapper.vm as any).chartOption
    
    // Check series names
    expect(chartOption.series[0].name).toBe('Revenue')
    expect(chartOption.series[1].name).toBe('Commission')
    
    // Check series types
    expect(chartOption.series[0].type).toBe('line')
    expect(chartOption.series[1].type).toBe('line')
    
    // Check smooth property
    expect(chartOption.series[0].smooth).toBe(true)
    expect(chartOption.series[1].smooth).toBe(true)
  })

  it('should emit dateChange event when date range changes', async () => {
    const wrapper = mount(RevenueChart, {
      props: {
        data: mockData,
        loading: false
      }
    })

    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-01-31')
    
    await (wrapper.vm as any).handleDateChange([startDate, endDate])

    expect(wrapper.emitted('dateChange')).toBeTruthy()
    expect(wrapper.emitted('dateChange')?.[0]).toEqual(['2024-01-01', '2024-01-31'])
  })

  it('should not emit dateChange event when date range is null', async () => {
    const wrapper = mount(RevenueChart, {
      props: {
        data: mockData,
        loading: false
      }
    })

    await (wrapper.vm as any).handleDateChange(null)

    expect(wrapper.emitted('dateChange')).toBeFalsy()
  })

  it('should handle empty data array gracefully', () => {
    const wrapper = mount(RevenueChart, {
      props: {
        data: [],
        loading: false
      }
    })

    const chartOption = (wrapper.vm as any).chartOption
    
    expect(chartOption.xAxis.data).toEqual([])
    expect(chartOption.series[0].data).toEqual([])
    expect(chartOption.series[1].data).toEqual([])
  })

  it('should configure tooltip correctly', () => {
    const wrapper = mount(RevenueChart, {
      props: {
        data: mockData,
        loading: false
      }
    })

    const chartOption = (wrapper.vm as any).chartOption
    
    expect(chartOption.tooltip.trigger).toBe('axis')
    expect(chartOption.tooltip.axisPointer.type).toBe('cross')
    expect(typeof chartOption.tooltip.formatter).toBe('function')
  })

  it('should configure legend correctly', () => {
    const wrapper = mount(RevenueChart, {
      props: {
        data: mockData,
        loading: false
      }
    })

    const chartOption = (wrapper.vm as any).chartOption
    
    expect(chartOption.legend.data).toEqual(['Revenue', 'Commission'])
    expect(chartOption.legend.bottom).toBe(0)
  })
})
