<template>
  <div class="plugin-management-page">
    <el-card class="page-header" shadow="never">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">{{ t('plugin.title') }}</h2>
          <p class="mt-1 text-sm text-gray-600">{{ t('plugin.description') }}</p>
        </div>
        <el-button type="primary" @click="handleUpload">
          <el-icon class="mr-2"><Upload /></el-icon>
          {{ t('plugin.uploadPlugin') }}
        </el-button>
      </div>
    </el-card>

    <el-card class="mt-4" shadow="never" v-loading="pluginStore.loading">
      <el-table
        :data="pluginStore.plugins"
        row-key="id"
        class="plugin-table"
      >
        <el-table-column type="index" width="60" :label="t('common.index')" />
        
        <el-table-column prop="name" :label="t('plugin.name')" min-width="150" />
        
        <el-table-column prop="description" :label="t('plugin.description')" min-width="200">
          <template #default="{ row }">
            <span class="text-gray-600">{{ row.description || t('plugin.noDescription') }}</span>
          </template>
        </el-table-column>
        
        <el-table-column :label="t('plugin.type')" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">
              {{ t(`plugin.types.${row.type}`) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="version" :label="t('plugin.version')" width="100" />
        
        <el-table-column prop="author" :label="t('plugin.author')" width="120">
          <template #default="{ row }">
            <span class="text-gray-600">{{ row.author || t('plugin.unknown') }}</span>
          </template>
        </el-table-column>
        
        <el-table-column :label="t('plugin.status')" width="100">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
              {{ row.enabled ? t('plugin.enabled') : t('plugin.disabled') }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column :label="t('common.actions')" width="280" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              link
              @click="handleConfigure(row)"
            >
              {{ t('plugin.configure') }}
            </el-button>
            <el-button
              :type="row.enabled ? 'warning' : 'success'"
              size="small"
              link
              @click="handleToggleEnable(row)"
            >
              {{ row.enabled ? t('plugin.disable') : t('plugin.enable') }}
            </el-button>
            <el-button
              type="info"
              size="small"
              link
              @click="handleUpgrade(row)"
            >
              {{ t('plugin.upgrade') }}
            </el-button>
            <el-button
              type="danger"
              size="small"
              link
              @click="handleUninstall(row)"
            >
              {{ t('plugin.uninstall') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <el-empty v-if="pluginStore.plugins.length === 0" :description="t('plugin.noPlugins')" />
    </el-card>

    <!-- Upload Plugin Modal -->
    <el-dialog
      v-model="showUploadModal"
      :title="t('plugin.uploadPlugin')"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-upload
        ref="uploadRef"
        drag
        :auto-upload="false"
        :limit="1"
        accept=".zip"
        :on-change="handleFileChange"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          {{ t('plugin.dropFile') }} <em>{{ t('plugin.clickUpload') }}</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            {{ t('plugin.uploadTip') }}
          </div>
        </template>
      </el-upload>
      
      <template #footer>
        <el-button @click="showUploadModal = false">{{ t('common.cancel') }}</el-button>
        <el-button
          type="primary"
          :loading="pluginStore.uploading"
          :disabled="!selectedFile"
          @click="handleUploadSubmit"
        >
          {{ t('common.upload') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Configure Plugin Modal -->
    <PluginConfigModal
      v-model="showConfigModal"
      :plugin="currentPlugin"
      @success="handleConfigSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Upload, UploadFilled } from '@element-plus/icons-vue';
import { usePluginStore } from '../../stores/plugin';
import PluginConfigModal from '../../components/config/PluginConfigModal.vue';
import type { Plugin } from '@xboard/shared/types/plugin';
import type { UploadFile } from 'element-plus';

const { t } = useI18n();
const pluginStore = usePluginStore();

// State
const showUploadModal = ref(false);
const showConfigModal = ref(false);
const currentPlugin = ref<Plugin | null>(null);
const selectedFile = ref<File | null>(null);
const uploadRef = ref();

// Methods
async function loadPlugins() {
  await pluginStore.fetchPlugins();
}

function getTypeTagType(type: string) {
  const typeMap: Record<string, any> = {
    payment: 'success',
    notification: 'warning',
    other: 'info',
  };
  return typeMap[type] || 'info';
}

function handleUpload() {
  selectedFile.value = null;
  showUploadModal.value = true;
}

function handleFileChange(file: UploadFile) {
  selectedFile.value = file.raw || null;
}

async function handleUploadSubmit() {
  if (!selectedFile.value) {
    ElMessage.warning(t('plugin.selectFile'));
    return;
  }
  
  try {
    await pluginStore.uploadPlugin({ file: selectedFile.value });
    showUploadModal.value = false;
    selectedFile.value = null;
    uploadRef.value?.clearFiles();
  } catch (error) {
    // Error handled by store
  }
}

function handleConfigure(plugin: Plugin) {
  currentPlugin.value = plugin;
  showConfigModal.value = true;
}

async function handleToggleEnable(plugin: Plugin) {
  try {
    await pluginStore.updatePlugin(plugin.id, { enabled: !plugin.enabled });
  } catch (error) {
    // Error handled by store
  }
}

async function handleUpgrade(plugin: Plugin) {
  try {
    await ElMessageBox.confirm(
      t('plugin.upgradeConfirm', { name: plugin.name }),
      t('common.confirm'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );
    
    await pluginStore.upgradePlugin(plugin.id);
  } catch (error) {
    // User cancelled or error occurred
  }
}

async function handleUninstall(plugin: Plugin) {
  try {
    await ElMessageBox.confirm(
      t('plugin.uninstallConfirm', { name: plugin.name }),
      t('common.confirm'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );
    
    await pluginStore.uninstallPlugin(plugin.id);
  } catch (error) {
    // User cancelled or error occurred
  }
}

function handleConfigSuccess() {
  showConfigModal.value = false;
  loadPlugins();
}

// Lifecycle
onMounted(() => {
  loadPlugins();
});
</script>

<style scoped lang="scss">
.plugin-management-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.plugin-table {
  width: 100%;
}
</style>
