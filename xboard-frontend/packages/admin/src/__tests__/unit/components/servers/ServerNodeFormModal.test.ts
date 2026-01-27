import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import ServerNodeFormModal from '@/components/servers/ServerNodeFormModal.vue'
import type { ServerNode, ServerType } from '@xboard/shared/types'

// Mock Element Plus
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

// Create i18n instance
const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      servers: {
        nameRequired: 'Node name is required',
        typeRequired: 'Node type is required',
        hostRequired: 'Host is required',
        portRequired: 'Port is required',
        portRange: 'Port must be between 1 and 65535',
        rateRequired: 'Rate is required',
        rateMin: 'Rate must be non-negative'
      }
    }
  }
})

const createWrapper = (props: any = {}) => {
  return mount(ServerNodeFormModal, {
    props: {
      modelValue: true,
      ...props
    },
    global: {
      plugins: [createPinia(), i18n],
      stubs: {
        'el-dialog': { template: '<div><slot></slot><slot name="footer"></slot></div>' },
        'el-form': { template: '<form><slot></slot></form>' },
        'el-form-item': { template: '<div><slot></slot></div>' },
        'el-input': { template: '<input />' },
        'el-input-number': { template: '<input type="number" />' },
        'el-switch': { template: '<input type="checkbox" />' },
        'el-select': { template: '<select><slot></slot></select>' },
        'el-option': { template: '<option />' },
        'el-button': { template: '<button />' },
        'el-divider': { template: '<hr />' }
      }
    }
  })
}

describe('ServerNodeFormModal - Protocol-Specific Validation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should validate required node name field', () => {
    const wrapper = createWrapper()
    expect(wrapper.vm.rules.name).toBeDefined()
    expect(wrapper.vm.rules.name[0].required).toBe(true)
  })

  it('should validate required server type field', () => {
    const wrapper = createWrapper()
    expect(wrapper.vm.rules.type).toBeDefined()
    expect(wrapper.vm.rules.type[0].required).toBe(true)
  })

  it('should validate required host field', () => {
    const wrapper = createWrapper()
    expect(wrapper.vm.rules.host).toBeDefined()
    expect(wrapper.vm.rules.host[0].required).toBe(true)
  })

  it('should validate port range (1-65535)', () => {
    const wrapper = createWrapper()
    expect(wrapper.vm.rules.port[0].required).toBe(true)
    expect(wrapper.vm.rules.port[1].type).toBe('number')
    expect(wrapper.vm.rules.port[1].min).toBe(1)
    expect(wrapper.vm.rules.port[1].max).toBe(65535)
  })

  it('should validate rate field is required and non-negative', () => {
    const wrapper = createWrapper()
    expect(wrapper.vm.rules.rate[0].required).toBe(true)
    expect(wrapper.vm.rules.rate[1].type).toBe('number')
    expect(wrapper.vm.rules.rate[1].min).toBe(0)
  })

  it('should support all protocol types', () => {
    const wrapper = createWrapper()
    const supportedTypes = ['vmess', 'vless', 'trojan', 'shadowsocks', 'hysteria']
    const serverTypes = wrapper.vm.serverTypes.map((t: any) => t.value)
    
    supportedTypes.forEach(type => {
      expect(serverTypes).toContain(type)
    })
  })
})

describe('ServerNodeFormModal - Configuration Serialization', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should initialize protocol settings as empty JSON object', () => {
    const wrapper = createWrapper()
    expect(wrapper.vm.protocolSettingsJson).toBe('{}')
    expect(wrapper.vm.formData.protocol_settings).toEqual({})
  })

  it('should serialize protocol settings to JSON string', async () => {
    const wrapper = createWrapper()
    const settings = { network: 'tcp', security: 'tls' }
    wrapper.vm.protocolSettingsJson = JSON.stringify(settings, null, 2)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.protocolSettingsJson).toContain('network')
    expect(wrapper.vm.protocolSettingsJson).toContain('tcp')
  })

  it('should deserialize protocol settings from existing node', async () => {
    const protocolSettings = {
      network: 'ws',
      ws_settings: { path: '/ws' }
    }

    const node: ServerNode = {
      id: 1,
      name: 'Test',
      type: 'vmess' as ServerType,
      host: 'example.com',
      port: 443,
      server_port: 10086,
      group_ids: [],
      route_ids: [],
      tags: [],
      show: true,
      parent_id: null,
      rate: 1.0,
      rate_time_enable: false,
      rate_time_ranges: null,
      sort: 0,
      protocol_settings: protocolSettings,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }

    const wrapper = createWrapper({ node })
    await flushPromises()

    const parsed = JSON.parse(wrapper.vm.protocolSettingsJson)
    expect(parsed.network).toBe('ws')
    expect(parsed.ws_settings.path).toBe('/ws')
  })

  it('should handle empty protocol settings gracefully', async () => {
    const node: ServerNode = {
      id: 1,
      name: 'Test',
      type: 'shadowsocks' as ServerType,
      host: 'example.com',
      port: 443,
      server_port: 8388,
      group_ids: [],
      route_ids: [],
      tags: [],
      show: true,
      parent_id: null,
      rate: 1.0,
      rate_time_enable: false,
      rate_time_ranges: null,
      sort: 0,
      protocol_settings: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }

    const wrapper = createWrapper({ node })
    await flushPromises()

    expect(wrapper.vm.protocolSettingsJson).toBe('{}')
    expect(wrapper.vm.formData.protocol_settings).toEqual({})
  })

  it('should serialize rate time ranges to JSON array', async () => {
    const wrapper = createWrapper()
    const timeRanges = [{ start: '08:00', end: '12:00', rate: 0.5 }]

    wrapper.vm.formData.rate_time_enable = true
    wrapper.vm.rateTimeRangesJson = JSON.stringify(timeRanges, null, 2)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.rateTimeRangesJson).toContain('08:00')
  })

  it('should deserialize rate time ranges from existing node', async () => {
    const timeRanges = [{ start: '00:00', end: '06:00', rate: 0.8 }]

    const node: ServerNode = {
      id: 1,
      name: 'Test',
      type: 'trojan' as ServerType,
      host: 'example.com',
      port: 443,
      server_port: 10443,
      group_ids: [],
      route_ids: [],
      tags: [],
      show: true,
      parent_id: null,
      rate: 1.0,
      rate_time_enable: true,
      rate_time_ranges: timeRanges,
      sort: 0,
      protocol_settings: {},
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }

    const wrapper = createWrapper({ node })
    await flushPromises()

    const parsed = JSON.parse(wrapper.vm.rateTimeRangesJson)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].start).toBe('00:00')
    expect(parsed[0].rate).toBe(0.8)
  })

  it('should preserve protocol settings structure during round-trip', async () => {
    const originalSettings = {
      network: 'grpc',
      grpc_settings: { service_name: 'GunService' }
    }

    const node: ServerNode = {
      id: 1,
      name: 'Test',
      type: 'vmess' as ServerType,
      host: 'example.com',
      port: 443,
      server_port: 10086,
      group_ids: [],
      route_ids: [],
      tags: [],
      show: true,
      parent_id: null,
      rate: 1.0,
      rate_time_enable: false,
      rate_time_ranges: null,
      sort: 0,
      protocol_settings: originalSettings,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }

    const wrapper = createWrapper({ node })
    await flushPromises()

    const parsed = JSON.parse(wrapper.vm.protocolSettingsJson)
    expect(parsed).toEqual(originalSettings)
    expect(parsed.grpc_settings.service_name).toBe('GunService')
  })
})
