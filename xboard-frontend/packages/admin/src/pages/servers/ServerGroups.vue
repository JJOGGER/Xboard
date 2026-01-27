<template>
  <div class="server-groups-page">
    <el-card shadow="never">
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold">{{ t('servers.serverGroups') }}</h2>
          <el-button type="primary" @click="handleAdd">
            <el-icon class="mr-1"><Plus /></el-icon>
            {{ t('servers.addGroup') }}
          </el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="groups" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" :label="t('servers.groupName')" />
        <el-table-column :label="t('servers.serverCount')" width="120">
          <template #default="{ row }">
            {{ row.server_count || 0 }}
          </template>
        </el-table-column>
        <el-table-column :label="t('servers.userCount')" width="120">
          <template #default="{ row }">
            {{ row.users_count || 0 }}
          </template>
        </el-table-column>
        <el-table-column :label="t('common.createdAt')" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="handleEdit(row)"
            >
              {{ t('common.edit') }}
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="handleDelete(row)"
            >
              {{ t('common.delete') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Group Form Dialog -->
    <el-dialog
      v-model="showDialog"
      :title="isEdit ? t('servers.editGroup') : t('servers.addGroup')"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item :label="t('servers.groupName')" prop="name">
          <el-input
            v-model="formData.name"
            :placeholder="t('servers.groupNamePlaceholder')"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">
          {{ t('common.save') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { useServerStore } from '@/stores/server';
import type { ServerGroup } from '@xboard/shared/types';
import { formatDate } from '@xboard/shared/utils';

const { t } = useI18n();
const serverStore = useServerStore();

// State
const formRef = ref<FormInstance>();
const showDialog = ref(false);
const saving = ref(false);
const formData = ref({
  id: undefined as number | undefined,
  name: '',
});

// Validation rules
const rules: FormRules = {
  name: [
    { required: true, message: t('servers.groupNameRequired'), trigger: 'blur' },
  ],
};

// Computed
const loading = computed(() => serverStore.loading);
const groups = computed(() => serverStore.groups);
const isEdit = computed(() => !!formData.value.id);

// Methods
function handleAdd() {
  formData.value = {
    id: undefined,
    name: '',
  };
  showDialog.value = true;
}

function handleEdit(group: ServerGroup) {
  formData.value = {
    id: group.id,
    name: group.name,
  };
  showDialog.value = true;
}

async function handleSubmit() {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    saving.value = true;

    await serverStore.saveGroup(formData.value);

    ElMessage.success(
      isEdit.value ? t('servers.groupUpdateSuccess') : t('servers.groupCreateSuccess')
    );

    showDialog.value = false;
  } catch (error: any) {
    if (error.message) {
      ElMessage.error(error.message);
    }
  } finally {
    saving.value = false;
  }
}

async function handleDelete(group: ServerGroup) {
  try {
    await ElMessageBox.confirm(
      t('servers.confirmDeleteGroup', { name: group.name }),
      t('common.warning'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await serverStore.deleteGroup(group.id);
    ElMessage.success(t('servers.groupDeleteSuccess'));
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || t('servers.groupDeleteFailed'));
    }
  }
}

// Lifecycle
onMounted(async () => {
  try {
    await serverStore.fetchGroups();
  } catch (error: any) {
    ElMessage.error(error.message || t('servers.fetchGroupsFailed'));
  }
});
</script>

<style scoped>
.server-groups-page {
  padding: 20px;
}
</style>
