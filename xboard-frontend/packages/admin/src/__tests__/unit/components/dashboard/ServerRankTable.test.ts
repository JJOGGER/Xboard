import { describe, it, expect } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import ServerRankTable from '@/components/dashboard/ServerRankTable.vue'
import type { ServerRank } from '@xboard/shared'
import ElementPlus from 'element-plus'

describe('ServerRankTable Component', () => {
  const mockServerRanks: ServerRank[] = [
    {
      server_id: 1,
      server_name: 'US Server 1',
      u: 1000000000, // 1GB upload
      d: 5000000000, // 5GB download
      total: 6000000000 // 6GB total
    },
    {
      server_id: 2,
      server_name: 'EU Server 1',
      u: 2000000000, // 2GB upload
      d: 8000000000, // 8GB download
      total: 10000000000 // 10GB total
    },
    {
      server_id: 3,
      server_name: 'Asia Server 1',
      u: 500000000, // 0.5GB upload
      d: 2500000000, // 2.5GB download
      total: 3000000000 // 3GB total
    }
  ]

  it('should compute table data from props', () => {
    const wrapper = shallowMount(ServerRankTable, {
      props: {
        data: mockServerRanks,
        loading: false
      },
      global: {
        plugins: [ElementPlus],
        stubs: {
          'el-card': true,
          'el-table': true,
          'el-table-column': true,
          'el-radio-group': true,
          'el-radio-button': true
        }
      }
    })

    const vm = wrapper.vm as any
    expect(vm.tableData).toEqual(mockServerRanks)
    expect(vm.tableData.length).toBe(3)
  })

  it('should calculate max traffic correctly', () => {
    const wrapper = shallowMount(ServerRankTable, {
      props: {
        data: mockServerRanks,
        loading: false
      },
      global: {
        plugins: [ElementPlus],
        stubs: {
          'el-card': true,
          'el-table': true,
          'el-table-column': true,
          'el-radio-group': true,
          'el-radio-button': true
        }
      }
    })

    const vm = wrapper.vm as any
    expect(vm.maxTraffic).toBe(10000000000) // EU Server has the most traffic
  })

  it('should calculate percentage correctly', () => {
    const wrapper = shallowMount(ServerRankTable, {
      props: {
        data: mockServerRanks,
        loading: false
      },
      global: {
        plugins: [ElementPlus],
        stubs: {
          'el-card': true,
          'el-table': true,
          'el-table-column': true,
          'el-radio-group': true,
          'el-radio-button': true
        }
      }
    })

    const vm = wrapper.vm as any
    
    // EU Server (10GB) should be 100%
    expect(vm.calculatePercentage(10000000000)).toBe(100)
    
    // US Server (6GB) should be 60%
    expect(vm.calculatePercentage(6000000000)).toBe(60)
    
    // Asia Server (3GB) should be 30%
    expect(vm.calculatePercentage(3000000000)).toBe(30)
  })

  it('should return correct progress color based on percentage', () => {
    const wrapper = shallowMount(ServerRankTable, {
      props: {
        data: mockServerRanks,
        loading: false
      },
      global: {
        plugins: [ElementPlus],
        stubs: {
          'el-card': true,
          'el-table': true,
          'el-table-column': true,
          'el-radio-group': true,
          'el-radio-button': true
        }
      }
    })

    const vm = wrapper.vm as any
    
    expect(vm.getProgressColor(85)).toBe('#67C23A') // >= 80
    expect(vm.getProgressColor(60)).toBe('#409EFF') // >= 50
    expect(vm.getProgressColor(40)).toBe('#E6A23C') // >= 30
    expect(vm.getProgressColor(20)).toBe('#F56C6C') // < 30
  })

  it('should emit period-change event when period is changed', async () => {
    const wrapper = shallowMount(ServerRankTable, {
      props: {
        data: mockServerRanks,
        loading: false
      },
      global: {
        plugins: [ElementPlus],
        stubs: {
          'el-card': true,
          'el-table': true,
          'el-table-column': true,
          'el-radio-group': true,
          'el-radio-button': true
        }
      }
    })

    const vm = wrapper.vm as any
    await vm.handlePeriodChange('yesterday')

    expect(wrapper.emitted('periodChange')).toBeTruthy()
    expect(wrapper.emitted('periodChange')?.[0]).toEqual(['yesterday'])
  })

  it('should handle empty data array', () => {
    const wrapper = shallowMount(ServerRankTable, {
      props: {
        data: [],
        loading: false
      },
      global: {
        plugins: [ElementPlus],
        stubs: {
          'el-card': true,
          'el-table': true,
          'el-table-column': true,
          'el-radio-group': true,
          'el-radio-button': true
        }
      }
    })

    const vm = wrapper.vm as any
    expect(vm.tableData).toEqual([])
    expect(vm.maxTraffic).toBe(0)
  })

  it('should handle zero traffic percentage calculation', () => {
    const wrapper = shallowMount(ServerRankTable, {
      props: {
        data: [],
        loading: false
      },
      global: {
        plugins: [ElementPlus],
        stubs: {
          'el-card': true,
          'el-table': true,
          'el-table-column': true,
          'el-radio-group': true,
          'el-radio-button': true
        }
      }
    })

    const vm = wrapper.vm as any
    expect(vm.calculatePercentage(0)).toBe(0)
  })

  it('should handle servers with zero traffic', () => {
    const dataWithZero: ServerRank[] = [
      ...mockServerRanks,
      {
        server_id: 4,
        server_name: 'Inactive Server',
        u: 0,
        d: 0,
        total: 0
      }
    ]

    const wrapper = shallowMount(ServerRankTable, {
      props: {
        data: dataWithZero,
        loading: false
      },
      global: {
        plugins: [ElementPlus],
        stubs: {
          'el-card': true,
          'el-table': true,
          'el-table-column': true,
          'el-radio-group': true,
          'el-radio-button': true
        }
      }
    })

    const vm = wrapper.vm as any
    expect(vm.tableData.length).toBe(4)
    expect(vm.calculatePercentage(0)).toBe(0)
  })
})
