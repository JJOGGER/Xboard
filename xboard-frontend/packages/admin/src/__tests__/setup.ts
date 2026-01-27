import { config } from '@vue/test-utils'

// Stub Element Plus components globally
config.global.stubs = {
  'el-card': {
    template: '<div class="el-card"><slot name="header"></slot><slot></slot></div>'
  },
  'el-icon': {
    template: '<span class="el-icon"><slot></slot></span>'
  },
  'el-table': {
    template: '<div class="el-table"><slot></slot></div>',
    props: ['data', 'loading']
  },
  'el-table-column': {
    template: '<div class="el-table-column"><slot></slot></div>',
    props: ['prop', 'label']
  },
  'el-tag': {
    template: '<span class="el-tag"><slot></slot></span>',
    props: ['type', 'size']
  },
  'el-button': {
    template: '<button class="el-button"><slot></slot></button>',
    props: ['type', 'size', 'link']
  },
  'el-date-picker': {
    template: '<div class="el-date-picker"></div>',
    props: ['modelValue', 'type']
  },
  'el-empty': {
    template: '<div class="el-empty"><slot></slot></div>',
    props: ['description']
  },
  'el-radio-group': {
    template: '<div class="el-radio-group"><slot></slot></div>',
    props: ['modelValue', 'size']
  },
  'el-radio-button': {
    template: '<button class="el-radio-button"><slot></slot></button>',
    props: ['value']
  },
  'el-progress': {
    template: '<div class="el-progress"></div>',
    props: ['percentage', 'color', 'showText']
  },
  'v-chart': {
    template: '<div class="v-chart"></div>',
    props: ['option', 'autoresize']
  }
}

// Mock directives
config.global.directives = {
  loading: () => {}
}
