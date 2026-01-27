import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PlanFormModal from '@/components/plans/PlanFormModal.vue'
import { usePlanStore } from '@/stores/plan'
import type { Plan } from '@xboard/shared/types'

// Mock Element Plus components
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus')
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn()
    }
  }
})

describe('PlanFormModal Component - Form Validation', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  it('should validate required plan name field', async () => {
    const wrapper = mount(PlanFormModal, {
      props: {
        visible: true
      },
      global: {
        plugins: [pinia],
        stubs: {
          'el-dialog': {
            template: '<div><slot></slot><slot name="footer"></slot></div>',
            props: ['modelValue', 'title', 'width']
          },
          'el-form': {
            template: '<form><slot></slot></form>',
            props: ['model', 'rules', 'labelWidth', 'labelPosition']
          },
          'el-form-item': {
            template: '<div class="el-form-item"><label>{{ label }}</label><slot></slot></div>',
            props: ['label', 'prop']
          },
          'el-input': {
            template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ['modelValue', 'placeholder', 'maxlength', 'showWordLimit', 'type', 'rows']
          },
          'el-input-number': {
            template: '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
            props: ['modelValue', 'min', 'step', 'precision', 'controlsPosition', 'placeholder']
          },
          'el-switch': {
            template: '<input type="checkbox" :checked="modelValue === activeValue" @change="$emit(\'update:modelValue\', $event.target.checked ? activeValue : inactiveValue)" />',
            props: ['modelValue', 'activeValue', 'inactiveValue', 'activeText', 'inactiveText']
          },
          'el-select': {
            template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', Array.from($event.target.selectedOptions).map(o => Number(o.value)))" multiple><slot></slot></select>',
            props: ['modelValue', 'multiple', 'placeholder', 'loading']
          },
          'el-option': {
            template: '<option :value="value"><slot></slot></option>',
            props: ['label', 'value']
          },
          'el-button': {
            template: '<button @click="$emit(\'click\')"><slot></slot></button>',
            props: ['type', 'loading']
          }
        }
      }
    })

    await flushPromises()

    // Find the form ref and trigger validation
    const formRef = wrapper.vm.$refs.formRef as any
    
    // Test that name is required
    expect(wrapper.vm.rules.name).toBeDefined()
    expect(wrapper.vm.rules.name[0].required).toBe(true)
    expect(wrapper.vm.rules.name[0].message).toBe('Please enter plan name')
  })

  it('should validate plan name length constraints', () => {
    const wrapper = mount(PlanFormModal, {
      props: {
        visible: true
      },
      global: {
        plugins: [pinia],
        stubs: {
          'el-dialog': { template: '<div><slot></slot></div>' },
          'el-form': { template: '<form><slot></slot></form>' },
          'el-form-item': { template: '<div><slot></slot></div>' },
          'el-input': { template: '<input />' },
          'el-input-number': { template: '<input type="number" />' },
          'el-switch': { template: '<input type="checkbox" />' },
          'el-select': { template: '<select><slot></slot></select>' },
          'el-option': { template: '<option />' },
          'el-button': { template: '<button />' }
        }
      }
    })

    // Check name length validation rules
    expect(wrapper.vm.rules.name[1].min).toBe(2)
    expect(wrapper.vm.rules.name[1].max).toBe(50)
    expect(wrapper.vm.rules.name[1].message).toBe('Name must be between 2 and 50 characters')
  })

  it('should validate description length constraint', () => {
    const wrapper = mount(PlanFormModal, {
      props: {
        visible: true
      },
      global: {
        plugins: [pinia],
        stubs: {
          'el-dialog': { template: '<div><slot></slot></div>' },
          'el-form': { template: '<form><slot></slot></form>' },
          'el-form-item': { template: '<div><slot></slot></div>' },
          'el-input': { template: '<input />' },
          'el-input-number': { template: '<input type="number" />' },
          'el-switch': { template: '<input type="checkbox" />' },
          'el-select': { template: '<select><slot></slot></select>' },
          'el-option': { template: '<option />' },
          'el-button': { template: '<button />' }
        }
      }
    })

    // Check description length validation
    expect(wrapper.vm.rules.content[0].max).toBe(500)
    expect(wrapper.vm.rules.content[0].message).toBe('Description cannot exceed 500 characters')
  })

  it('should validate required traffic quota field', () => {
    const wrapper = mount(PlanFormModal, {
      props: {
        visible: true
      },
      global: {
        plugins: [pinia],
        stubs: {
          'el-dialog': { template: '<div><slot></slot></div>' },
          'el-form': { template: '<form><slot></slot></form>' },
          'el-form-item': { template: '<div><slot></slot></div>' },
          'el-input': { template: '<input />' },
          'el-input-number': { template: '<input type="number" />' },
          'el-switch': { template: '<input type="checkbox" />' },
          'el-select': { template: '<select><slot></slot></select>' },
          'el-option': { template: '<option />' },
          'el-button': { template: '<button />' }
        }
      }
    })

    // Check transfer_enable validation
    expect(wrapper.vm.rules.transfer_enable[0].required).toBe(true)
    expect(wrapper.vm.rules.transfer_enable[0].message).toBe('Please enter traffic quota')
    expect(wrapper.vm.rules.transfer_enable[1].type).toBe('number')
    expect(wrapper.vm.rules.transfer_enable[1].min).toBe(0)
  })

  it('should validate required server group selection', () => {
    const wrapper = mount(PlanFormModal, {
      props: {
        visible: true
      },
      global: {
        plugins: [pinia],
        stubs: {
          'el-dialog': { template: '<div><slot></slot></div>' },
          'el-form': { template: '<form><slot></slot></form>' },
          'el-form-item': { template: '<div><slot></slot></div>' },
          'el-input': { template: '<input />' },
          'el-input-number': { template: '<input type="number" />' },
          'el-switch': { template: '<input type="checkbox" />' },
          'el-select': { template: '<select><slot></slot></select>' },
          'el-option': { template: '<option />' },
          'el-button': { template: '<button />' }
        }
      }
    })

    // Check group_id validation
    expect(wrapper.vm.rules.group_id[0].required).toBe(true)
    expect(wrapper.vm.rules.group_id[0].message).toBe('Please select at least one server group')
    expect(wrapper.vm.rules.group_id[1].type).toBe('array')
    expect(wrapper.vm.rules.group_id[1].min).toBe(1)
  })
})

describe('PlanFormModal Component - Pricing Calculation', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  it('should initialize all pricing fields to zero', () => {
    const wrapper = mount(PlanFormModal, {
      props: {
        visible: true
      },
      global: {
        plugins: [pinia],
        stubs: {
          'el-dialog': { template: '<div><slot></slot></div>' },
          'el-form': { template: '<form><slot></slot></form>' },
          'el-form-item': { template: '<div><slot></slot></div>' },
          'el-input': { template: '<input />' },
          'el-input-number': { template: '<input type="number" />' },
          'el-switch': { template: '<input type="checkbox" />' },
          'el-select': { template: '<select><slot></slot></select>' },
          'el-option': { template: '<option />' },
          'el-button': { template: '<button />' }
        }
      }
    })

    expect(wrapper.vm.formData.month_price).toBe(0)
    expect(wrapper.vm.formData.quarter_price).toBe(0)
    expect(wrapper.vm.formData.half_year_price).toBe(0)
    expect(wrapper.vm.formData.year_price).toBe(0)
    expect(wrapper.vm.formData.two_year_price).toBe(0)
    expect(wrapper.vm.formData.three_year_price).toBe(0)
    expect(wrapper.vm.formData.onetime_price).toBe(0)
    expect(wrapper.vm.formData.reset_price).toBe(0)
  })

  it('should accept positive pricing values', async () => {
    const wrapper = mount(PlanFormModal, {
      props: {
        visible: true
      },
      global: {
        plugins: [pinia],
        stubs: {
          'el-dialog': { template: '<div><slot></slot></div>' },
          'el-form': { template: '<form><slot></slot></form>' },
          'el-form-item': { template: '<div><slot></slot></div>' },
          'el-input': { template: '<input />' },
          'el-input-number': { template: '<input type="number" />' },
          'el-switch': { template: '<input type="checkbox" />' },
          'el-select': { template: '<select><slot></slot></select>' },
          'el-option': { template: '<option />' },
          'el-button': { template: '<button />' }
        }
      }
    })

    // Set pricing values
    wrapper.vm.formData.month_price = 1000
    wrapper.vm.formData.quarter_price = 2700
    wrapper.vm.formData.year_price = 10000

    await wrapper.vm.$nextTick()

    expect(wrapper.vm.formData.month_price).toBe(1000)
    expect(wrapper.vm.formData.quarter_price).toBe(2700)
    expect(wrapper.vm.formData.year_price).toBe(10000)
  })

  it('should handle zero pricing values', () => {
    const wrapper = mount(PlanFormModal, {
      props: {
        visible: true
      },
      global: {
        plugins: [pinia],
        stubs: {
          'el-dialog': { template: '<div><slot></slot></div>' },
          'el-form': { template: '<form><slot></slot></form>' },
          'el-form-item': { template: '<div><slot></slot></div>' },
          'el-input': { template: '<input />' },
          'el-input-number': { template: '<input type="number" />' },
          'el-switch': { template: '<input type="checkbox" />' },
          'el-select': { template: '<select><slot></slot></select>' },
          'el-option': { template: '<option />' },
          'el-button': { template: '<button />' }
        }
      }
    })

    // All pricing fields should accept zero
    wrapper.vm.formData.month_price = 0
    wrapper.vm.formData.quarter_price = 0
    wrapper.vm.formData.year_price = 0

    expect(wrapper.vm.formData.month_price).toBe(0)
    expect(wrapper.vm.formData.quarter_price).toBe(0)
    expect(wrapper.vm.formData.year_price).toBe(0)
  })

  it('should load existing plan pricing correctly', async () => {
    const existingPlan: Plan = {
      id: 1,
      name: 'Premium Plan',
      content: 'Premium features',
      month_price: 1500,
      quarter_price: 4000,
      half_year_price: 7500,
      year_price: 14000,
      two_year_price: 26000,
      three_year_price: 36000,
      onetime_price: 50000,
      reset_price: 500,
      transfer_enable: 107374182400,
      speed_limit: 100,
      device_limit: 5,
      group_id: [1, 2],
      show: 1,
      sort: 0,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }

    const wrapper = mount(PlanFormModal, {
      props: {
        visible: false,
        plan: null
      },
      global: {
        plugins: [pinia],
        stubs: {
          'el-dialog': { template: '<div><slot></slot></div>' },
          'el-form': { template: '<form><slot></slot></form>' },
          'el-form-item': { template: '<div><slot></slot></div>' },
          'el-input': { template: '<input />' },
          'el-input-number': { template: '<input type="number" />' },
          'el-switch': { template: '<input type="checkbox" />' },
          'el-select': { template: '<select><slot></slot></select>' },
          'el-option': { template: '<option />' },
          'el-button': { template: '<button />' }
        }
      }
    })

    // Update props to trigger the watcher
    await wrapper.setProps({ visible: true, plan: existingPlan })
    await flushPromises()

    expect(wrapper.vm.formData.month_price).toBe(1500)
    expect(wrapper.vm.formData.quarter_price).toBe(4000)
    expect(wrapper.vm.formData.half_year_price).toBe(7500)
    expect(wrapper.vm.formData.year_price).toBe(14000)
    expect(wrapper.vm.formData.two_year_price).toBe(26000)
    expect(wrapper.vm.formData.three_year_price).toBe(36000)
    expect(wrapper.vm.formData.onetime_price).toBe(50000)
    expect(wrapper.vm.formData.reset_price).toBe(500)
  })
})

describe('PlanFormModal Component - Server Group Assignment', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  it('should initialize with empty server group selection', () => {
    const wrapper = mount(PlanFormModal, {
      props: {
        visible: true
      },
      global: {
        plugins: [pinia],
        stubs: {
          'el-dialog': { template: '<div><slot></slot></div>' },
          'el-form': { template: '<form><slot></slot></form>' },
          'el-form-item': { template: '<div><slot></slot></div>' },
          'el-input': { template: '<input />' },
          'el-input-number': { template: '<input type="number" />' },
          'el-switch': { template: '<input type="checkbox" />' },
          'el-select': { template: '<select><slot></slot></select>' },
          'el-option': { template: '<option />' },
          'el-button': { template: '<button />' }
        }
      }
    })

    expect(wrapper.vm.formData.group_id).toEqual([])
  })

  it('should allow selecting single server group', async () => {
    const wrapper = mount(PlanFormModal, {
      props: {
        visible: true
      },
      global: {
        plugins: [pinia],
        stubs: {
          'el-dialog': { template: '<div><slot></slot></div>' },
          'el-form': { template: '<form><slot></slot></form>' },
          'el-form-item': { template: '<div><slot></slot></div>' },
          'el-input': { template: '<input />' },
          'el-input-number': { template: '<input type="number" />' },
          'el-switch': { template: '<input type="checkbox" />' },
          'el-select': { template: '<select><slot></slot></select>' },
          'el-option': { template: '<option />' },
          'el-button': { template: '<button />' }
        }
      }
    })

    wrapper.vm.formData.group_id = [1]
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.formData.group_id).toEqual([1])
    expect(wrapper.vm.formData.group_id.length).toBe(1)
  })

  it('should allow selecting multiple server groups', async () => {
    const wrapper = mount(PlanFormModal, {
      props: {
        visible: true
      },
      global: {
        plugins: [pinia],
        stubs: {
          'el-dialog': { template: '<div><slot></slot></div>' },
          'el-form': { template: '<form><slot></slot></form>' },
          'el-form-item': { template: '<div><slot></slot></div>' },
          'el-input': { template: '<input />' },
          'el-input-number': { template: '<input type="number" />' },
          'el-switch': { template: '<input type="checkbox" />' },
          'el-select': { template: '<select><slot></slot></select>' },
          'el-option': { template: '<option />' },
          'el-button': { template: '<button />' }
        }
      }
    })

    wrapper.vm.formData.group_id = [1, 2, 3]
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.formData.group_id).toEqual([1, 2, 3])
    expect(wrapper.vm.formData.group_id.length).toBe(3)
  })

  it('should load existing plan server groups correctly', async () => {
    const existingPlan: Plan = {
      id: 1,
      name: 'Premium Plan',
      content: 'Premium features',
      month_price: 1500,
      quarter_price: 4000,
      half_year_price: 7500,
      year_price: 14000,
      two_year_price: 26000,
      three_year_price: 36000,
      onetime_price: 50000,
      reset_price: 500,
      transfer_enable: 107374182400,
      speed_limit: 100,
      device_limit: 5,
      group_id: [1, 2, 3],
      show: 1,
      sort: 0,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }

    const wrapper = mount(PlanFormModal, {
      props: {
        visible: false,
        plan: null
      },
      global: {
        plugins: [pinia],
        stubs: {
          'el-dialog': { template: '<div><slot></slot></div>' },
          'el-form': { template: '<form><slot></slot></form>' },
          'el-form-item': { template: '<div><slot></slot></div>' },
          'el-input': { template: '<input />' },
          'el-input-number': { template: '<input type="number" />' },
          'el-switch': { template: '<input type="checkbox" />' },
          'el-select': { template: '<select><slot></slot></select>' },
          'el-option': { template: '<option />' },
          'el-button': { template: '<button />' }
        }
      }
    })

    // Update props to trigger the watcher
    await wrapper.setProps({ visible: true, plan: existingPlan })
    await flushPromises()

    expect(wrapper.vm.formData.group_id).toEqual([1, 2, 3])
    expect(wrapper.vm.formData.group_id.length).toBe(3)
  })

  it('should preserve server group array immutability when loading plan', async () => {
    const originalGroupIds = [1, 2, 3]
    const existingPlan: Plan = {
      id: 1,
      name: 'Premium Plan',
      content: 'Premium features',
      month_price: 1500,
      quarter_price: 4000,
      half_year_price: 7500,
      year_price: 14000,
      two_year_price: 26000,
      three_year_price: 36000,
      onetime_price: 50000,
      reset_price: 500,
      transfer_enable: 107374182400,
      speed_limit: 100,
      device_limit: 5,
      group_id: originalGroupIds,
      show: 1,
      sort: 0,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }

    const wrapper = mount(PlanFormModal, {
      props: {
        visible: false,
        plan: null
      },
      global: {
        plugins: [pinia],
        stubs: {
          'el-dialog': { template: '<div><slot></slot></div>' },
          'el-form': { template: '<form><slot></slot></form>' },
          'el-form-item': { template: '<div><slot></slot></div>' },
          'el-input': { template: '<input />' },
          'el-input-number': { template: '<input type="number" />' },
          'el-switch': { template: '<input type="checkbox" />' },
          'el-select': { template: '<select><slot></slot></select>' },
          'el-option': { template: '<option />' },
          'el-button': { template: '<button />' }
        }
      }
    })

    // Update props to trigger the watcher
    await wrapper.setProps({ visible: true, plan: existingPlan })
    await flushPromises()

    // Modify the form data
    wrapper.vm.formData.group_id.push(4)

    // Original should remain unchanged
    expect(originalGroupIds).toEqual([1, 2, 3])
    expect(wrapper.vm.formData.group_id).toEqual([1, 2, 3, 4])
  })

  it('should clear server groups when form is reset', async () => {
    const wrapper = mount(PlanFormModal, {
      props: {
        visible: true
      },
      global: {
        plugins: [pinia],
        stubs: {
          'el-dialog': { template: '<div><slot></slot></div>' },
          'el-form': { 
            template: '<form ref="formRef"><slot></slot></form>',
            methods: {
              clearValidate: vi.fn()
            }
          },
          'el-form-item': { template: '<div><slot></slot></div>' },
          'el-input': { template: '<input />' },
          'el-input-number': { template: '<input type="number" />' },
          'el-switch': { template: '<input type="checkbox" />' },
          'el-select': { template: '<select><slot></slot></select>' },
          'el-option': { template: '<option />' },
          'el-button': { template: '<button />' }
        }
      }
    })

    // Set some groups
    wrapper.vm.formData.group_id = [1, 2, 3]
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.formData.group_id).toEqual([1, 2, 3])

    // Mock the formRef
    wrapper.vm.$refs.formRef = {
      clearValidate: vi.fn()
    }

    // Reset form
    wrapper.vm.resetForm()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.formData.group_id).toEqual([])
  })
})
