import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import RecentOrdersTable from '@/components/dashboard/RecentOrdersTable.vue'
import type { Order } from '@xboard/shared'
import ElementPlus from 'element-plus'

// Create a mock router
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'Dashboard', component: { template: '<div>Dashboard</div>' } },
    { path: '/orders', name: 'Orders', component: { template: '<div>Orders</div>' } }
  ]
})

describe('RecentOrdersTable Component', () => {
  const mockOrders: Order[] = [
    {
      id: 1,
      user_id: 1,
      plan_id: 1,
      period: 'month',
      trade_no: 'TRD20240101001',
      callback_no: null,
      total_amount: 1000,
      discount_amount: 0,
      balance_amount: 0,
      surplus_amount: 0,
      refund_amount: 0,
      status: 3, // Completed
      commission_status: 0,
      commission_balance: 0,
      actual_commission_balance: 0,
      surplus_order_ids: null,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      user: {
        id: 1,
        email: 'user1@example.com',
        balance: 0,
        commission_balance: 0,
        plan_id: 1,
        expired_at: null,
        u: 0,
        d: 0,
        transfer_enable: 0,
        banned: 0,
        is_admin: false,
        is_staff: false,
        invite_user_id: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      },
      plan: {
        id: 1,
        name: 'Basic Plan',
        content: 'Basic plan description',
        month_price: 1000,
        quarter_price: 2700,
        half_year_price: 5400,
        year_price: 10800,
        two_year_price: 20000,
        three_year_price: 28000,
        onetime_price: 0,
        reset_price: 0,
        transfer_enable: 100000000000,
        speed_limit: null,
        device_limit: null,
        group_id: [1],
        show: 1,
        sort: 0,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      }
    },
    {
      id: 2,
      user_id: 2,
      plan_id: 2,
      period: 'quarter',
      trade_no: 'TRD20240101002',
      callback_no: null,
      total_amount: 2700,
      discount_amount: 0,
      balance_amount: 0,
      surplus_amount: 0,
      refund_amount: 0,
      status: 0, // Pending
      commission_status: 0,
      commission_balance: 0,
      actual_commission_balance: 0,
      surplus_order_ids: null,
      created_at: '2024-01-02T10:00:00Z',
      updated_at: '2024-01-02T10:00:00Z',
      user: {
        id: 2,
        email: 'user2@example.com',
        balance: 0,
        commission_balance: 0,
        plan_id: 2,
        expired_at: null,
        u: 0,
        d: 0,
        transfer_enable: 0,
        banned: 0,
        is_admin: false,
        is_staff: false,
        invite_user_id: null,
        created_at: '2024-01-02T10:00:00Z',
        updated_at: '2024-01-02T10:00:00Z'
      },
      plan: {
        id: 2,
        name: 'Pro Plan',
        content: 'Pro plan description',
        month_price: 1000,
        quarter_price: 2700,
        half_year_price: 5400,
        year_price: 10800,
        two_year_price: 20000,
        three_year_price: 28000,
        onetime_price: 0,
        reset_price: 0,
        transfer_enable: 200000000000,
        speed_limit: null,
        device_limit: null,
        group_id: [1, 2],
        show: 1,
        sort: 1,
        created_at: '2024-01-02T10:00:00Z',
        updated_at: '2024-01-02T10:00:00Z'
      }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should compute table data from props', () => {
    const wrapper = shallowMount(RecentOrdersTable, {
      props: {
        data: mockOrders,
        loading: false
      },
      global: {
        plugins: [router, ElementPlus],
        stubs: {
          'el-card': true,
          'el-table': true,
          'el-table-column': true,
          'el-button': true,
          'el-tag': true
        }
      }
    })

    const vm = wrapper.vm as any
    expect(vm.tableData).toEqual(mockOrders)
    expect(vm.tableData.length).toBe(2)
  })

  it('should return correct status type for different statuses', () => {
    const wrapper = shallowMount(RecentOrdersTable, {
      props: {
        data: mockOrders,
        loading: false
      },
      global: {
        plugins: [router, ElementPlus],
        stubs: {
          'el-card': true,
          'el-table': true,
          'el-table-column': true,
          'el-button': true,
          'el-tag': true
        }
      }
    })

    const vm = wrapper.vm as any
    
    expect(vm.getStatusType(0)).toBe('info') // Pending
    expect(vm.getStatusType(1)).toBe('warning') // Processing
    expect(vm.getStatusType(2)).toBe('danger') // Cancelled
    expect(vm.getStatusType(3)).toBe('success') // Completed
  })

  it('should return correct status text for different statuses', () => {
    const wrapper = shallowMount(RecentOrdersTable, {
      props: {
        data: mockOrders,
        loading: false
      },
      global: {
        plugins: [router, ElementPlus],
        stubs: {
          'el-card': true,
          'el-table': true,
          'el-table-column': true,
          'el-button': true,
          'el-tag': true
        }
      }
    })

    const vm = wrapper.vm as any
    
    expect(vm.getStatusText(0)).toBe('Pending')
    expect(vm.getStatusText(1)).toBe('Processing')
    expect(vm.getStatusText(2)).toBe('Cancelled')
    expect(vm.getStatusText(3)).toBe('Completed')
    expect(vm.getStatusText(4)).toBe('Discounted')
    expect(vm.getStatusText(999)).toBe('Unknown')
  })

  it('should navigate to orders page when View All is clicked', async () => {
    const pushSpy = vi.spyOn(router, 'push')
    
    const wrapper = shallowMount(RecentOrdersTable, {
      props: {
        data: mockOrders,
        loading: false
      },
      global: {
        plugins: [router, ElementPlus],
        stubs: {
          'el-card': true,
          'el-table': true,
          'el-table-column': true,
          'el-button': true,
          'el-tag': true
        }
      }
    })

    await (wrapper.vm as any).handleViewAll()
    
    expect(pushSpy).toHaveBeenCalledWith({ name: 'Orders' })
  })

  it('should handle empty data array', () => {
    const wrapper = shallowMount(RecentOrdersTable, {
      props: {
        data: [],
        loading: false
      },
      global: {
        plugins: [router, ElementPlus],
        stubs: {
          'el-card': true,
          'el-table': true,
          'el-table-column': true,
          'el-button': true,
          'el-tag': true
        }
      }
    })

    const vm = wrapper.vm as any
    expect(vm.tableData).toEqual([])
    expect(vm.tableData.length).toBe(0)
  })
})
