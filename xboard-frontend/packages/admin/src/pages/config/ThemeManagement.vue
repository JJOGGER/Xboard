<template>
  <div class="theme-management-page">
    <el-card class="page-header" shadow="never">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">{{ t('theme.title') }}</h2>
          <p class="mt-1 text-sm text-gray-600">{{ t('theme.description') }}</p>
        </div>
        <el-button type="primary" @click="handleUpload">
          <el-icon class="mr-2"><Upload /></el-icon>
          {{ t('theme.uploadTheme') }}
        </el-button>
      </div>
    </el-card>

    <el-card class="mt-4" shadow="never" v-loading="themeStore.loading">
      <div class="theme-grid">
        <div
          v-for="theme in themeStore.themes"
          :key="theme.id"
          class="theme-card"
          :class="{ 'theme-card-active': theme.is_active }"
        >
          <div class="theme-preview">
            <el-image
              v-if="theme.preview_url"
              :src="theme.preview_url"
              fit="cover"
              class="preview-image"
            />
            <div v-else class="preview-placeholder">
              <el-icon :size="48"><Picture /></el-icon>
            </div>
            
            <div v-if="theme.is_active" class="active-badge">
              <el-tag type="success" size="small">{{ t('theme.active') }}</el-tag>
            </div>
          </div>
          
          <div class="theme-info">
            <h3 class="theme-name">{{ theme.name }}</h3>
            <p class="theme-description">{{ theme.description || t('theme.noDescription') }}</p>
            
            <div class="theme-meta">
              <span class="meta-item">
                <el-icon><User /></el-icon>
                {{ theme.author || t('theme.unknown') }}
              </span>
              <span class="meta-item">
                <el-icon><Document /></el-icon>
                v{{ theme.version || '1.0.0' }}
              </span>
            </div>
          </div>
          
          <div class="theme-actions">
            <el-button
              v-if="!theme.is_active"
              type="primary"
              size="small"
              @click="handleActivate(theme)"
            >
              {{ t('theme.activate') }}
            </el-button>
            <el-button
              size="small"
              @click="handleConfigure(theme)"
            >
              {{ t('theme.configure') }}
            </el-button>
            <el-button
              v-if="!theme.is_active"
              type="danger"
              size="small"
              @click="handleDelete(theme)"
            >
              {{ t('common.delete') }}
            </el-button>
          </div>
        </div>
      </div>
      
      <el-empty v-if="themeStore.themes.length === 0" :description="t('theme.noThemes')" />
    </el-card>

    <!-- Upload Theme Modal -->
    <el-dialog
      v-model="showUploadModal"
      :title="t('theme.uploadTheme')"
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
          {{ t('theme.dropFile') }} <em>{{ t('theme.clickUpload') }}</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            {{ t('theme.uploadTip') }}
          </div>
        </template>
      </el-upload>
      
      <template #footer>
        <el-button @click="showUploadModal = false">{{ t('common.cancel') }}</el-button>
        <el-button
          type="primary"
          :loading="themeStore.uploading"
          :disabled="!selectedFile"
          @click="handleUploadSubmit"
        >
          {{ t('common.upload') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Configure Theme Modal -->
    <ThemeConfigModal
      v-model="showConfigModal"
      :theme="currentTheme"
      @success="handleConfigSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Upload, UploadFilled, Picture, User, Document } from '@element-plus/icons-vue';
import { useThemeStore } from '../../stores/theme';
import ThemeConfigModal from '../../components/config/ThemeConfigModal.vue';
import type { Theme } from '@xboard/shared/src/types/theme';
import type { UploadFile } from 'element-plus';

const { t } = useI18n();
const themeStore = useThemeStore();

// State
const showUploadModal = ref(false);
const showConfigModal = ref(false);
const currentTheme = ref<Theme | null>(null);
const selectedFile = ref<File | null>(null);
const uploadRef = ref();

// Methods
async function loadThemes() {
  await themeStore.fetchThemes();
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
    ElMessage.warning(t('theme.selectFile'));
    return;
  }
  
  try {
    await themeStore.uploadTheme({ file: selectedFile.value });
    showUploadModal.value = false;
    selectedFile.value = null;
    uploadRef.value?.clearFiles();
  } catch (error) {
    // Error handled by store
  }
}

async function handleActivate(theme: Theme) {
  try {
    await ElMessageBox.confirm(
      t('theme.activateConfirm', { name: theme.name }),
      t('common.confirm'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );
    
    await themeStore.activateTheme(theme.id);
  } catch (error) {
    // User cancelled or error occurred
  }
}

function handleConfigure(theme: Theme) {
  currentTheme.value = theme;
  showConfigModal.value = true;
}

async function handleDelete(theme: Theme) {
  try {
    await ElMessageBox.confirm(
      t('theme.deleteConfirm', { name: theme.name }),
      t('common.confirm'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );
    
    await themeStore.deleteTheme(theme.id);
  } catch (error) {
    // User cancelled or error occurred
  }
}

function handleConfigSuccess() {
  showConfigModal.value = false;
  loadThemes();
}

// Lifecycle
onMounted(() => {
  loadThemes();
});
</script>

<style scoped lang="scss">
.theme-management-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.theme-card {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
  cursor: pointer;
  
  &:hover {
    border-color: #409eff;
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  }
  
  &-active {
    border-color: #67c23a;
    
    &:hover {
      border-color: #67c23a;
      box-shadow: 0 4px 12px rgba(103, 194, 58, 0.15);
    }
  }
}

.theme-preview {
  position: relative;
  width: 100%;
  height: 180px;
  background: #f5f7fa;
  
  .preview-image {
    width: 100%;
    height: 100%;
  }
  
  .preview-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c0c4cc;
  }
  
  .active-badge {
    position: absolute;
    top: 10px;
    right: 10px;
  }
}

.theme-info {
  padding: 16px;
  
  .theme-name {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 8px 0;
  }
  
  .theme-description {
    font-size: 14px;
    color: #606266;
    margin: 0 0 12px 0;
    line-height: 1.5;
    min-height: 42px;
  }
  
  .theme-meta {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: #909399;
    
    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
}

.theme-actions {
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
