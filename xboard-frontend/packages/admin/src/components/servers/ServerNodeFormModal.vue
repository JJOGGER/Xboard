<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? t('servers.editNode') : t('servers.addNode')"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="140px"
      label-position="left"
    >
      <!-- Basic Information -->
      <el-divider content-position="left">
        {{ t('servers.basicInfo') }}
      </el-divider>

      <el-form-item :label="t('servers.nodeName')" prop="name">
        <el-input
          v-model="formData.name"
          :placeholder="t('servers.nodeNamePlaceholder')"
        />
      </el-form-item>

      <el-form-item :label="t('servers.nodeType')" prop="type">
        <el-select
          v-model="formData.type"
          :placeholder="t('servers.selectType')"
          :disabled="isEdit"
          class="w-full"
        >
          <el-option
            v-for="type in serverTypes"
            :key="type.value"
            :label="type.label"
            :value="type.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item :label="t('servers.host')" prop="host">
        <el-input
          v-model="formData.host"
          :placeholder="t('servers.hostPlaceholder')"
        />
      </el-form-item>

      <el-form-item :label="t('servers.port')" prop="port">
        <el-input-number
          v-model="formData.port"
          :min="1"
          :max="65535"
          class="w-full"
        />
      </el-form-item>

      <el-form-item :label="t('servers.serverPort')" prop="server_port">
        <el-input-number
          v-model="formData.server_port"
          :min="1"
          :max="65535"
          class="w-full"
        />
      </el-form-item>

      <!-- Groups and Routes -->
      <el-divider content-position="left">
        {{ t('servers.groupsAndRoutes') }}
      </el-divider>

      <el-form-item :label="t('servers.serverGroups')" prop="group_ids">
        <el-select
          v-model="formData.group_ids"
          multiple
          :placeholder="t('servers.selectGroups')"
          class="w-full"
        >
          <el-option
            v-for="group in groups"
            :key="group.id"
            :label="group.name"
            :value="group.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item :label="t('servers.routes')" prop="route_ids">
        <el-select
          v-model="formData.route_ids"
          multiple
          :placeholder="t('servers.selectRoutes')"
          class="w-full"
        >
          <el-option
            v-for="route in routes"
            :key="route.id"
            :label="route.remarks"
            :value="route.id"
          />
        </el-select>
      </el-form-item>

      <!-- Configuration -->
      <el-divider content-position="left">
        {{ t('servers.configuration') }}
      </el-divider>

      <el-form-item :label="t('servers.rate')" prop="rate">
        <el-input-number
          v-model="formData.rate"
          :min="0"
          :step="0.1"
          :precision="1"
          class="w-full"
        />
      </el-form-item>

      <el-form-item :label="t('servers.tags')" prop="tags">
        <el-select
          v-model="formData.tags"
          multiple
          filterable
          allow-create
          default-first-option
          :placeholder="t('servers.tagsPlaceholder')"
          class="w-full"
        />
      </el-form-item>

      <el-form-item :label="t('servers.show')" prop="show">
        <el-switch v-model="formData.show" />
      </el-form-item>

      <el-form-item :label="t('servers.parentNode')" prop="parent_id">
        <el-select
          v-model="formData.parent_id"
          clearable
          :placeholder="t('servers.selectParentNode')"
          class="w-full"
        >
          <el-option
            v-for="node in availableParentNodes"
            :key="node.id"
            :label="node.name"
            :value="node.id"
          />
        </el-select>
      </el-form-item>

      <!-- Protocol Settings -->
      <el-divider content-position="left">
        {{ t('servers.protocolSettings') }}
      </el-divider>

      <el-form-item :label="t('servers.protocolConfig')">
        <el-input
          v-model="protocolSettingsJson"
          type="textarea"
          :rows="6"
          :placeholder="t('servers.protocolConfigPlaceholder')"
        />
        <div class="text-xs text-gray-500 mt-1">
          {{ t('servers.protocolConfigHint') }}
        </div>
      </el-form-item>

      <!-- Rate Time Ranges -->
      <el-divider content-position="left">
        {{ t('servers.rateTimeRanges') }}
      </el-divider>

      <el-form-item :label="t('servers.enableRateTime')" prop="rate_time_enable">
        <el-switch v-model="formData.rate_time_enable" />
      </el-form-item>

      <el-form-item
        v-if="formData.rate_time_enable"
        :label="t('servers.timeRanges')"
      >
        <el-input
          v-model="rateTimeRangesJson"
          type="textarea"
          :rows="4"
          :placeholder="t('servers.timeRangesPlaceholder')"
        />
        <div class="text-xs text-gray-500 mt-1">
          {{ t('servers.timeRangesHint') }}
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">
        {{ t('common.save') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { useServerStore } from '@/stores/server';
import type { ServerNode, ServerType } from '@xboard/shared/types';

const props = defineProps<{
  modelValue: boolean;
  node?: ServerNode | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'success'): void;
}>();

const { t } = useI18n();
const serverStore = useServerStore();

// State
const formRef = ref<FormInstance>();
const loading = ref(false);
const protocolSettingsJson = ref('{}');
const rateTimeRangesJson = ref('[]');

// Server types
const serverTypes = [
  { label: 'VMess', value: 'vmess' as ServerType },
  { label: 'VLESS', value: 'vless' as ServerType },
  { label: 'Trojan', value: 'trojan' as ServerType },
  { label: 'Shadowsocks', value: 'shadowsocks' as ServerType },
  { label: 'Hysteria', value: 'hysteria' as ServerType },
  { label: 'TUIC', value: 'tuic' as ServerType },
  { label: 'Naive', value: 'naive' as ServerType },
  { label: 'SOCKS', value: 'socks' as ServerType },
  { label: 'HTTP', value: 'http' as ServerType },
  { label: 'AnyTLS', value: 'anytls' as ServerType },
  { label: 'Mieru', value: 'mieru' as ServerType },
];

// Form data
const formData = ref({
  id: undefined as number | undefined,
  name: '',
  type: 'vmess' as ServerType,
  host: '',
  port: 443,
  server_port: null as number | null,
  group_ids: [] as number[],
  route_ids: [] as number[],
  tags: [] as string[],
  show: true,
  parent_id: null as number | null,
  rate: 1.0,
  rate_time_enable: false,
  rate_time_ranges: null as any[] | null,
  sort: 0,
  protocol_settings: {} as any,
});

// Validation rules
const rules: FormRules = {
  name: [
    { required: true, message: t('servers.nameRequired'), trigger: 'blur' },
  ],
  type: [
    { required: true, message: t('servers.typeRequired'), trigger: 'change' },
  ],
  host: [
    { required: true, message: t('servers.hostRequired'), trigger: 'blur' },
  ],
  port: [
    { required: true, message: t('servers.portRequired'), trigger: 'blur' },
    {
      type: 'number',
      min: 1,
      max: 65535,
      message: t('servers.portRange'),
      trigger: 'blur',
    },
  ],
  rate: [
    { required: true, message: t('servers.rateRequired'), trigger: 'blur' },
    {
      type: 'number',
      min: 0,
      message: t('servers.rateMin'),
      trigger: 'blur',
    },
  ],
};

// Computed
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const isEdit = computed(() => !!props.node);

const groups = computed(() => serverStore.groups);
const routes = computed(() => serverStore.routes);

const availableParentNodes = computed(() => {
  return serverStore.nodes.filter((node) => {
    // Exclude current node if editing
    if (isEdit.value && node.id === props.node?.id) {
      return false;
    }
    // Only show nodes of the same type
    return node.type === formData.value.type;
  });
});

// Methods
function resetForm() {
  formData.value = {
    id: undefined,
    name: '',
    type: 'vmess',
    host: '',
    port: 443,
    server_port: null,
    group_ids: [],
    route_ids: [],
    tags: [],
    show: true,
    parent_id: null,
    rate: 1.0,
    rate_time_enable: false,
    rate_time_ranges: null,
    sort: 0,
    protocol_settings: {},
  };
  protocolSettingsJson.value = '{}';
  rateTimeRangesJson.value = '[]';
  formRef.value?.clearValidate();
}

function loadNodeData(node: ServerNode) {
  formData.value = {
    id: node.id,
    name: node.name,
    type: node.type,
    host: node.host,
    port: node.port,
    server_port: node.server_port,
    group_ids: node.group_ids || [],
    route_ids: node.route_ids || [],
    tags: node.tags || [],
    show: node.show,
    parent_id: node.parent_id,
    rate: node.rate,
    rate_time_enable: node.rate_time_enable,
    rate_time_ranges: node.rate_time_ranges,
    sort: node.sort,
    protocol_settings: node.protocol_settings || {},
  };

  // Convert objects to JSON strings for textarea
  try {
    protocolSettingsJson.value = JSON.stringify(
      node.protocol_settings || {},
      null,
      2
    );
  } catch {
    protocolSettingsJson.value = '{}';
  }

  try {
    rateTimeRangesJson.value = JSON.stringify(
      node.rate_time_ranges || [],
      null,
      2
    );
  } catch {
    rateTimeRangesJson.value = '[]';
  }
}

async function handleSubmit() {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();

    // Parse JSON strings
    try {
      formData.value.protocol_settings = JSON.parse(protocolSettingsJson.value);
    } catch {
      ElMessage.error(t('servers.invalidProtocolSettings'));
      return;
    }

    if (formData.value.rate_time_enable) {
      try {
        formData.value.rate_time_ranges = JSON.parse(rateTimeRangesJson.value);
      } catch {
        ElMessage.error(t('servers.invalidTimeRanges'));
        return;
      }
    } else {
      formData.value.rate_time_ranges = null;
    }

    loading.value = true;

    await serverStore.saveNode(formData.value);

    ElMessage.success(
      isEdit.value ? t('servers.updateSuccess') : t('servers.createSuccess')
    );

    emit('success');
  } catch (error: any) {
    if (error.message) {
      ElMessage.error(error.message);
    }
  } finally {
    loading.value = false;
  }
}

function handleClose() {
  resetForm();
  visible.value = false;
}

// Watch for node changes
watch(
  () => props.node,
  (node) => {
    if (node) {
      loadNodeData(node);
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

// Watch for dialog visibility
watch(visible, (newVal) => {
  if (newVal) {
    // Load groups and routes when dialog opens
    if (groups.value.length === 0) {
      serverStore.fetchGroups();
    }
    if (routes.value.length === 0) {
      serverStore.fetchRoutes();
    }
  }
});
</script>

<style scoped>
:deep(.el-form-item__label) {
  font-weight: 500;
}
</style>
