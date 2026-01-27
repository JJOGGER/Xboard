<template>
  <div class="server-list-page">
    <el-card shadow="never" class="mb-4">
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold">{{ t('servers.title') }}</h2>
          <div class="flex gap-2">
            <el-button type="primary" @click="handleAdd">
              <el-icon class="mr-1"><Plus /></el-icon>
              {{ t('servers.addNode') }}
            </el-button>
            <el-button @click="handleRefresh">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
        </div>
      </template>

      <!-- Server Type Tabs -->
      <el-tabs v-model="activeType" @tab-change="handleTypeChange">
        <el-tab-pane
          v-for="type in serverTypes"
          :key="type.value"
          :label="`${type.label} (${getNodeCountByType(type.value)})`"
          :name="type.value"
        >
          <!-- Server Nodes List -->
          <div v-loading="loading" class="min-h-[200px]">
            <el-empty
              v-if="currentTypeNodes.length === 0"
              :description="t('servers.noNodes')"
            />

            <div v-else class="space-y-2">
              <el-card
                v-for="node in currentTypeNodes"
                :key="node.id"
                shadow="hover"
                class="server-node-card cursor-pointer"
                :class="{ 'opacity-50': !node.show }"
              >
                <div class="flex items-center justify-between">
                  <!-- Node Info -->
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <h3 class="text-lg font-medium">{{ node.name }}</h3>
                      <el-tag v-if="!node.show" type="info" size="small">
                        {{ t('common.hidden') }}
                      </el-tag>
                      <el-tag
                        v-if="node.is_online === 1"
                        type="success"
                        size="small"
                      >
                        {{ t('servers.online') }}
                      </el-tag>
                      <el-tag
                        v-else-if="node.is_online === 0"
                        type="danger"
                        size="small"
                      >
                        {{ t('servers.offline') }}
                      </el-tag>
                    </div>

                    <div class="text-sm text-gray-600 space-y-1">
                      <div>
                        <span class="font-medium">{{ t('servers.host') }}:</span>
                        {{ node.host }}:{{ node.port }}
                      </div>
                      <div v-if="node.groups && node.groups.length > 0">
                        <span class="font-medium">{{ t('servers.groups') }}:</span>
                        <el-tag
                          v-for="group in node.groups"
                          :key="group.id"
                          size="small"
                          class="ml-1"
                        >
                          {{ group.name }}
                        </el-tag>
                      </div>
                      <div v-if="node.tags && node.tags.length > 0">
                        <span class="font-medium">{{ t('servers.tags') }}:</span>
                        <el-tag
                          v-for="tag in node.tags"
                          :key="tag"
                          size="small"
                          type="info"
                          class="ml-1"
                        >
                          {{ tag }}
                        </el-tag>
                      </div>
                      <div>
                        <span class="font-medium">{{ t('servers.rate') }}:</span>
                        {{ node.rate }}x
                      </div>
                      <div v-if="node.total !== undefined">
                        <span class="font-medium">{{ t('servers.traffic') }}:</span>
                        {{ formatBytes(node.u || 0) }} ↑ /
                        {{ formatBytes(node.d || 0) }} ↓ /
                        {{ formatBytes(node.total || 0) }} Total
                      </div>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center gap-2">
                    <el-tooltip :content="t('servers.edit')">
                      <el-button
                        type="primary"
                        size="small"
                        circle
                        @click.stop="handleEdit(node)"
                      >
                        <el-icon><Edit /></el-icon>
                      </el-button>
                    </el-tooltip>

                    <el-tooltip
                      :content="node.show ? t('servers.hide') : t('servers.show')"
                    >
                      <el-button
                        :type="node.show ? 'warning' : 'success'"
                        size="small"
                        circle
                        @click.stop="handleToggleVisibility(node)"
                      >
                        <el-icon>
                          <View v-if="!node.show" />
                          <Hide v-else />
                        </el-icon>
                      </el-button>
                    </el-tooltip>

                    <el-tooltip :content="t('servers.copy')">
                      <el-button
                        type="info"
                        size="small"
                        circle
                        @click.stop="handleCopy(node)"
                      >
                        <el-icon><DocumentCopy /></el-icon>
                      </el-button>
                    </el-tooltip>

                    <el-tooltip :content="t('servers.delete')">
                      <el-button
                        type="danger"
                        size="small"
                        circle
                        @click.stop="handleDelete(node)"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </el-tooltip>
                  </div>
                </div>
              </el-card>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- Server Node Form Modal -->
    <ServerNodeFormModal
      v-model="showFormModal"
      :node="selectedNode"
      @success="handleFormSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus,
  Refresh,
  Edit,
  Delete,
  View,
  Hide,
  DocumentCopy,
} from '@element-plus/icons-vue';
import { useServerStore } from '@/stores/server';
import type { ServerNode, ServerType } from '@xboard/shared/types';
import { formatBytes } from '@xboard/shared/utils';
// Lazy load modal component
import { defineAsyncComponent } from 'vue';
const ServerNodeFormModal = defineAsyncComponent(() => import('@/components/servers/ServerNodeFormModal.vue'));

const { t } = useI18n();
const serverStore = useServerStore();

// State
const activeType = ref<ServerType>('vmess');
const showFormModal = ref(false);
const selectedNode = ref<ServerNode | null>(null);

// Server types configuration
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

// Computed
const loading = computed(() => serverStore.loading);
const currentTypeNodes = computed(() => {
  return serverStore.nodesByType[activeType.value] || [];
});

// Methods
function getNodeCountByType(type: ServerType): number {
  return serverStore.nodesByType[type]?.length || 0;
}

function handleTypeChange(type: ServerType) {
  activeType.value = type;
}

function handleAdd() {
  selectedNode.value = null;
  showFormModal.value = true;
}

function handleEdit(node: ServerNode) {
  selectedNode.value = node;
  showFormModal.value = true;
}

async function handleToggleVisibility(node: ServerNode) {
  try {
    await serverStore.updateNodeVisibility(node.id, !node.show);
    ElMessage.success(t('servers.visibilityUpdated'));
  } catch (error: any) {
    ElMessage.error(error.message || t('servers.visibilityUpdateFailed'));
  }
}

async function handleCopy(node: ServerNode) {
  try {
    await ElMessageBox.confirm(
      t('servers.confirmCopy', { name: node.name }),
      t('common.confirm'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'info',
      }
    );

    await serverStore.copyNode(node.id);
    ElMessage.success(t('servers.copySuccess'));
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || t('servers.copyFailed'));
    }
  }
}

async function handleDelete(node: ServerNode) {
  try {
    await ElMessageBox.confirm(
      t('servers.confirmDelete', { name: node.name }),
      t('common.warning'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await serverStore.deleteNode(node.id);
    ElMessage.success(t('servers.deleteSuccess'));
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || t('servers.deleteFailed'));
    }
  }
}

async function handleRefresh() {
  try {
    await serverStore.fetchNodes();
    ElMessage.success(t('common.refreshSuccess'));
  } catch (error: any) {
    ElMessage.error(error.message || t('common.refreshFailed'));
  }
}

function handleFormSuccess() {
  showFormModal.value = false;
  selectedNode.value = null;
}

// Lifecycle
onMounted(async () => {
  try {
    await Promise.all([serverStore.fetchNodes(), serverStore.fetchGroups()]);
  } catch (error: any) {
    ElMessage.error(error.message || t('servers.fetchFailed'));
  }
});
</script>

<style scoped>
.server-list-page {
  padding: 20px;
}

.server-node-card {
  transition: all 0.3s;
}

.server-node-card:hover {
  transform: translateY(-2px);
}
</style>
