<template>
  <el-dialog
    v-model="visible"
    :title="t('theme.configureTheme', { name: theme?.name })"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form label-width="120px">
      <el-form-item :label="t('theme.configuration')">
        <el-input
          v-model="configJson"
          type="textarea"
          :rows="12"
          :placeholder="t('theme.configPlaceholder')"
        />
        <div class="text-xs text-gray-500 mt-1">{{ t('theme.configHint') }}</div>
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
import { useThemeStore } from '../../stores/theme';
import type { Theme } from '@xboard/shared/types/theme';

const { t } = useI18n();
const themeStore = useThemeStore();

// Props
interface Props {
  modelValue: boolean;
  theme?: Theme | null;
}

const props = withDefaults(defineProps<Props>(), {
  theme: null,
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  success: [];
}>();

// State
const loading = ref(false);
const configJson = ref('{}');

// Computed
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

// Methods
function loadThemeConfig() {
  if (props.theme) {
    configJson.value = JSON.stringify(props.theme.config || {}, null, 2);
  } else {
    configJson.value = '{}';
  }
}

async function handleSubmit() {
  if (!props.theme) return;
  
  loading.value = true;
  try {
    // Parse config JSON
    let config = {};
    try {
      config = JSON.parse(configJson.value);
    } catch (error) {
      ElMessage.error(t('theme.invalidJson'));
      loading.value = false;
      return;
    }
    
    await themeStore.updateConfig(props.theme.id, config);
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
}

// Watch
watch(() => props.modelValue, (value) => {
  if (value) {
    loadThemeConfig();
  }
});
</script>

<style scoped lang="scss">
:deep(.el-textarea) {
  width: 100%;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
}
</style>
