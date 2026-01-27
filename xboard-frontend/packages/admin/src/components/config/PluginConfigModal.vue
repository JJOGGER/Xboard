<template>
  <el-dialog
    v-model="visible"
    :title="t('plugin.configurePlugin', { name: plugin?.name })"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form label-width="120px">
      <el-form-item :label="t('plugin.enabled')">
        <el-switch v-model="enabledSwitch" />
      </el-form-item>
      
      <el-form-item :label="t('plugin.configuration')">
        <el-input
          v-model="configJson"
          type="textarea"
          :rows="12"
          :placeholder="t('plugin.configPlaceholder')"
        />
        <div class="text-xs text-gray-500 mt-1">{{ t('plugin.configHint') }}</div>
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
import { ElMessage } from 'element-plus';
import { usePluginStore } from '../../stores/plugin';
import type { Plugin } from '@xboard/shared/src/types/plugin';

const { t } = useI18n();
const pluginStore = usePluginStore();

// Props
interface Props {
  modelValue: boolean;
  plugin?: Plugin | null;
}

const props = withDefaults(defineProps<Props>(), {
  plugin: null,
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  success: [];
}>();

// State
const loading = ref(false);
const configJson = ref('{}');
const enabledSwitch = ref(true);

// Computed
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

// Methods
function loadPluginConfig() {
  if (props.plugin) {
    configJson.value = JSON.stringify(props.plugin.config || {}, null, 2);
    enabledSwitch.value = props.plugin.enabled;
  } else {
    configJson.value = '{}';
    enabledSwitch.value = true;
  }
}

async function handleSubmit() {
  if (!props.plugin) return;
  
  loading.value = true;
  try {
    // Parse config JSON
    let config = {};
    try {
      config = JSON.parse(configJson.value);
    } catch (error) {
      ElMessage.error(t('plugin.invalidJson'));
      loading.value = false;
      return;
    }
    
    await pluginStore.updatePlugin(props.plugin.id, {
      enabled: enabledSwitch.value,
      config,
    });
    
    emit('success');
    handleClose();
  } catch (error) {
    // Error handled by store
  } finally {
    loading.value = false;
  }
}

function handleClose() {
  visible.value = false;
  configJson.value = '{}';
  enabledSwitch.value = true;
}

// Watch
watch(() => props.modelValue, (value) => {
  if (value) {
    loadPluginConfig();
  }
});
</script>

<style scoped lang="scss">
:deep(.el-textarea) {
  width: 100%;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
}
</style>
