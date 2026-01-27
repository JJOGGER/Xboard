<template>
  <div class="server-routes-page">
    <el-card shadow="never">
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold">{{ t('servers.routingRules') }}</h2>
          <el-button type="primary" @click="handleAdd">
            <el-icon class="mr-1"><Plus /></el-icon>
            {{ t('servers.addRoute') }}
          </el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="routes" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="remarks" :label="t('servers.routeRemarks')" />
        <el-table-column :label="t('servers.matchRules')" min-width="200">
          <template #default="{ row }">
            <el-tag
              v-for="(rule, index) in row.match"
              :key="index"
              size="small"
              class="mr-1 mb-1"
            >
              {{ rule }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="action" :label="t('servers.action')" width="120" />
        <el-table-column
          prop="action_value"
          :label="t('servers.actionValue')"
          width="150"
        />
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

    <!-- Route Form Dialog -->
    <el-dialog
      v-model="showDialog"
      :title="isEdit ? t('servers.editRoute') : t('servers.addRoute')"
      width="600px"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="120px"
      >
        <el-form-item :label="t('servers.routeRemarks')" prop="remarks">
          <el-input
            v-model="formData.remarks"
            :placeholder="t('servers.routeRemarksPlaceholder')"
          />
        </el-form-item>

        <el-form-item :label="t('servers.matchRules')" prop="match">
          <el-select
            v-model="formData.match"
            multiple
            filterable
            allow-create
            default-first-option
            :placeholder="t('servers.matchRulesPlaceholder')"
            class="w-full"
          >
            <el-option
              v-for="rule in commonMatchRules"
              :key="rule"
              :label="rule"
              :value="rule"
            />
          </el-select>
          <div class="text-xs text-gray-500 mt-1">
            {{ t('servers.matchRulesHint') }}
          </div>
        </el-form-item>

        <el-form-item :label="t('servers.action')" prop="action">
          <el-select
            v-model="formData.action"
            :placeholder="t('servers.selectAction')"
            class="w-full"
          >
            <el-option label="block" value="block" />
            <el-option label="dns" value="dns" />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('servers.actionValue')" prop="action_value">
          <el-input
            v-model="formData.action_value"
            :placeholder="t('servers.actionValuePlaceholder')"
          />
          <div class="text-xs text-gray-500 mt-1">
            {{ t('servers.actionValueHint') }}
          </div>
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
import type { ServerRoute } from '@xboard/shared/types';
import { formatDate } from '@xboard/shared/utils';

const { t } = useI18n();
const serverStore = useServerStore();

// State
const formRef = ref<FormInstance>();
const showDialog = ref(false);
const saving = ref(false);
const formData = ref({
  id: undefined as number | undefined,
  remarks: '',
  match: [] as string[],
  action: 'block',
  action_value: null as string | null,
});

// Common match rules
const commonMatchRules = [
  'geoip:cn',
  'geoip:private',
  'geosite:cn',
  'geosite:category-ads-all',
  'domain:google.com',
  'domain:facebook.com',
];

// Validation rules
const rules: FormRules = {
  remarks: [
    { required: true, message: t('servers.routeRemarksRequired'), trigger: 'blur' },
  ],
  match: [
    {
      required: true,
      message: t('servers.matchRulesRequired'),
      trigger: 'change',
      type: 'array',
      min: 1,
    },
  ],
  action: [
    { required: true, message: t('servers.actionRequired'), trigger: 'change' },
  ],
};

// Computed
const loading = computed(() => serverStore.loading);
const routes = computed(() => serverStore.routes);
const isEdit = computed(() => !!formData.value.id);

// Methods
function handleAdd() {
  formData.value = {
    id: undefined,
    remarks: '',
    match: [],
    action: 'block',
    action_value: null,
  };
  showDialog.value = true;
}

function handleEdit(route: ServerRoute) {
  formData.value = {
    id: route.id,
    remarks: route.remarks,
    match: route.match || [],
    action: route.action,
    action_value: route.action_value,
  };
  showDialog.value = true;
}

async function handleSubmit() {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    saving.value = true;

    await serverStore.saveRoute(formData.value);

    ElMessage.success(
      isEdit.value ? t('servers.routeUpdateSuccess') : t('servers.routeCreateSuccess')
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

async function handleDelete(route: ServerRoute) {
  try {
    await ElMessageBox.confirm(
      t('servers.confirmDeleteRoute', { remarks: route.remarks }),
      t('common.warning'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await serverStore.deleteRoute(route.id);
    ElMessage.success(t('servers.routeDeleteSuccess'));
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || t('servers.routeDeleteFailed'));
    }
  }
}

// Lifecycle
onMounted(async () => {
  try {
    await serverStore.fetchRoutes();
  } catch (error: any) {
    ElMessage.error(error.message || t('servers.fetchRoutesFailed'));
  }
});
</script>

<style scoped>
.server-routes-page {
  padding: 20px;
}
</style>
