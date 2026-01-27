<template>
  <div class="user-list-page">
    <!-- Page Header -->
    <div class="page-header">
      <h1 class="page-title">{{ t('users.title') }}</h1>
      <div class="header-actions">
        <el-button type="primary" @click="showGenerateDialog = true">
          <el-icon><Plus /></el-icon>
          {{ t('users.generateUsers') }}
        </el-button>
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>
          {{ t('common.export') }} CSV
        </el-button>
        <el-button @click="showBulkEmailDialog = true" :disabled="selectedUsers.length === 0">
          <el-icon><Message /></el-icon>
          {{ t('users.sendBulkEmail') }} ({{ selectedUsers.length }})
        </el-button>
      </div>
    </div>

    <!-- Filters -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="filterForm" inline>
        <el-form-item :label="t('users.search')">
          <el-input
            v-model="filterForm.search"
            :placeholder="t('users.searchPlaceholder')"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          >
            <template #append>
              <el-button :icon="Search" @click="handleSearch" />
            </template>
          </el-input>
        </el-form-item>

        <el-form-item :label="t('users.plan')">
          <el-select
            v-model="filterForm.plan_id"
            :placeholder="t('users.allPlans')"
            clearable
            @change="handleSearch"
          >
            <el-option
              v-for="plan in plans"
              :key="plan.id"
              :label="plan.name"
              :value="plan.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('users.status')">
          <el-select
            v-model="filterForm.banned"
            :placeholder="t('users.allStatus')"
            clearable
            @change="handleSearch"
          >
            <el-option :label="t('users.active')" :value="0" />
            <el-option :label="t('users.banned')" :value="1" />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('users.dateRange')">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            :range-separator="t('users.to')"
            :start-placeholder="t('users.startDate')"
            :end-placeholder="t('users.endDate')"
            @change="handleDateRangeChange"
          />
        </el-form-item>

        <el-form-item>
          <el-button @click="handleReset">{{ t('common.reset') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- User Table -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="userStore.loading"
        :data="userStore.users"
        stripe
        @selection-change="handleSelectionChange"
        @sort-change="handleSortChange"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column prop="id" :label="t('users.id')" width="80" sortable="custom" />
        
        <el-table-column prop="email" :label="t('users.email')" min-width="200" sortable="custom">
          <template #default="{ row }">
            <div class="user-email">
              <span>{{ row.email }}</span>
              <el-tag v-if="row.is_admin" type="danger" size="small">Admin</el-tag>
              <el-tag v-else-if="row.is_staff" type="warning" size="small">Staff</el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="t('users.plan')" width="150">
          <template #default="{ row }">
            <span v-if="row.plan_id">{{ getPlanName(row.plan_id) }}</span>
            <el-tag v-else type="info" size="small">{{ t('common.none') }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="t('users.traffic')" width="180">
          <template #default="{ row }">
            <div class="traffic-info">
              <div class="traffic-used">
                {{ formatBytes(row.u + row.d) }} / {{ formatBytes(row.transfer_enable) }}
              </div>
              <el-progress
                :percentage="getTrafficPercentage(row)"
                :status="getTrafficStatus(row)"
                :show-text="false"
              />
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="t('users.balance')" width="120" sortable="custom" prop="balance">
          <template #default="{ row }">
            {{ formatCurrency(row.balance) }}
          </template>
        </el-table-column>

        <el-table-column :label="t('users.commission')" width="120" sortable="custom" prop="commission_balance">
          <template #default="{ row }">
            {{ formatCurrency(row.commission_balance) }}
          </template>
        </el-table-column>

        <el-table-column :label="t('users.expiredAt')" width="180" sortable="custom" prop="expired_at">
          <template #default="{ row }">
            <span v-if="row.expired_at">
              {{ formatDate(row.expired_at * 1000) }}
            </span>
            <el-tag v-else type="info" size="small">{{ t('common.never') }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="t('users.status')" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.banned" type="danger" size="small">{{ t('users.banned') }}</el-tag>
            <el-tag v-else type="success" size="small">{{ t('users.active') }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="t('users.created')" width="180" sortable="custom" prop="created_at">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column :label="t('users.actions')" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleViewDetails(row)">
              {{ t('users.viewDetails') }}
            </el-button>
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              {{ t('users.edit') }}
            </el-button>
            <el-button
              link
              :type="row.banned ? 'success' : 'danger'"
              size="small"
              @click="handleToggleBan(row)"
            >
              {{ row.banned ? t('users.unban') : t('users.ban') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="userStore.currentPage"
          v-model:page-size="userStore.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="userStore.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- Generate Users Dialog -->
    <el-dialog
      v-model="showGenerateDialog"
      :title="t('users.generateUsers')"
      width="600px"
    >
      <el-form
        ref="generateFormRef"
        :model="generateForm"
        :rules="generateRules"
        label-width="140px"
      >
        <el-form-item :label="t('users.emailPrefix')" prop="email_prefix">
          <el-input v-model="generateForm.email_prefix" :placeholder="t('users.emailPrefixPlaceholder')" />
        </el-form-item>

        <el-form-item :label="t('users.emailSuffix')" prop="email_suffix">
          <el-input v-model="generateForm.email_suffix" :placeholder="t('users.emailSuffixPlaceholder')" />
        </el-form-item>

        <el-form-item :label="t('users.plan')" prop="plan_id">
          <el-select v-model="generateForm.plan_id" :placeholder="t('users.selectPlan')">
            <el-option
              v-for="plan in plans"
              :key="plan.id"
              :label="plan.name"
              :value="plan.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('users.expiredAt')" prop="expired_at">
          <el-date-picker
            v-model="generateForm.expired_at"
            type="datetime"
            :placeholder="t('users.selectExpirationDate')"
          />
        </el-form-item>

        <el-form-item :label="t('plans.traffic') + ' (GB)'" prop="transfer_enable">
          <el-input-number
            v-model="generateForm.transfer_enable"
            :min="1"
            :max="10000"
          />
        </el-form-item>

        <el-form-item :label="t('users.count')" prop="count">
          <el-input-number
            v-model="generateForm.count"
            :min="1"
            :max="100"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showGenerateDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="userStore.loading" @click="handleGenerate">
          {{ t('common.generate') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Bulk Email Dialog -->
    <el-dialog
      v-model="showBulkEmailDialog"
      :title="t('users.sendBulkEmail')"
      width="700px"
    >
      <el-form
        ref="emailFormRef"
        :model="emailForm"
        :rules="emailRules"
        label-width="100px"
      >
        <el-form-item :label="t('users.recipients')">
          <el-tag
            v-for="user in selectedUsers"
            :key="user.id"
            closable
            @close="handleRemoveRecipient(user.id)"
          >
            {{ user.email }}
          </el-tag>
        </el-form-item>

        <el-form-item :label="t('users.subject')" prop="subject">
          <el-input v-model="emailForm.subject" :placeholder="t('users.subjectPlaceholder')" />
        </el-form-item>

        <el-form-item :label="t('users.content')" prop="content">
          <el-input
            v-model="emailForm.content"
            type="textarea"
            :rows="10"
            :placeholder="t('users.contentPlaceholder')"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showBulkEmailDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="userStore.loading" @click="handleSendEmail">
          {{ t('common.send') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- User Detail Modal -->
    <UserDetailModal
      v-model="showDetailModal"
      :user-id="selectedUserId"
    />

    <!-- User Edit Modal -->
    <UserEditModal
      v-model="showEditModal"
      :user-id="editUserId"
      @updated="handleUserUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus, Download, Message, Search } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { usePlanStore } from '@/stores/plan';
import type { User, GenerateUserData } from '@xboard/shared/types';
import { formatBytes, formatCurrency, formatDate } from '@xboard/shared/utils';
// Lazy load modal components
import { defineAsyncComponent } from 'vue';
const UserDetailModal = defineAsyncComponent(() => import('@/components/users/UserDetailModal.vue'));
const UserEditModal = defineAsyncComponent(() => import('@/components/users/UserEditModal.vue'));

const { t } = useI18n();
const userStore = useUserStore();
const planStore = usePlanStore();

// User detail modal
const showDetailModal = ref(false);
const selectedUserId = ref<number | null>(null);

// User edit modal
const showEditModal = ref(false);
const editUserId = ref<number | null>(null);

// Filter form
const filterForm = reactive({
  search: '',
  plan_id: undefined as number | undefined,
  banned: undefined as number | undefined,
});

const dateRange = ref<[Date, Date] | null>(null);

// Selected users for bulk actions
const selectedUsers = ref<User[]>([]);

// Generate users dialog
const showGenerateDialog = ref(false);
const generateFormRef = ref<FormInstance>();
const generateForm = reactive<GenerateUserData>({
  email_prefix: '',
  email_suffix: '',
  plan_id: 0,
  expired_at: 0,
  transfer_enable: 0,
  count: 1,
});

const generateRules: FormRules = {
  email_prefix: [{ required: true, message: t('common.required'), trigger: 'blur' }],
  email_suffix: [{ required: true, message: t('common.required'), trigger: 'blur' }],
  plan_id: [{ required: true, message: t('common.required'), trigger: 'change' }],
  expired_at: [{ required: true, message: t('common.required'), trigger: 'change' }],
  transfer_enable: [{ required: true, message: t('common.required'), trigger: 'blur' }],
  count: [{ required: true, message: t('common.required'), trigger: 'blur' }],
};

// Bulk email dialog
const showBulkEmailDialog = ref(false);
const emailFormRef = ref<FormInstance>();
const emailForm = reactive({
  subject: '',
  content: '',
});

const emailRules: FormRules = {
  subject: [{ required: true, message: t('common.required'), trigger: 'blur' }],
  content: [{ required: true, message: t('common.required'), trigger: 'blur' }],
};

// Computed
const plans = computed(() => planStore.plans);

// Methods
function getPlanName(planId: number): string {
  const plan = plans.value.find((p) => p.id === planId);
  return plan?.name || 'Unknown';
}

function getTrafficPercentage(user: User): number {
  if (user.transfer_enable === 0) return 0;
  return Math.min(100, Math.round(((user.u + user.d) / user.transfer_enable) * 100));
}

function getTrafficStatus(user: User): 'success' | 'warning' | 'exception' | undefined {
  const percentage = getTrafficPercentage(user);
  if (percentage >= 90) return 'exception';
  if (percentage >= 70) return 'warning';
  return 'success';
}

function handleSearch(): void {
  userStore.setFilters({
    search: filterForm.search || undefined,
    plan_id: filterForm.plan_id,
    banned: filterForm.banned,
  });
  userStore.setPage(1);
  loadUsers();
}

function handleReset(): void {
  filterForm.search = '';
  filterForm.plan_id = undefined;
  filterForm.banned = undefined;
  dateRange.value = null;
  userStore.clearFilters();
  userStore.setPage(1);
  loadUsers();
}

function handleDateRangeChange(value: [Date, Date] | null): void {
  if (value) {
    userStore.setFilters({
      date_start: value[0].toISOString().split('T')[0],
      date_end: value[1].toISOString().split('T')[0],
    });
  } else {
    userStore.setFilters({
      date_start: undefined,
      date_end: undefined,
    });
  }
  loadUsers();
}

function handleSelectionChange(selection: User[]): void {
  selectedUsers.value = selection;
}

function handleSortChange({ prop, order }: { prop: string; order: string | null }): void {
  if (order) {
    userStore.setSort(prop, order === 'ascending' ? 'asc' : 'desc');
    loadUsers();
  }
}

function handlePageChange(page: number): void {
  userStore.setPage(page);
  loadUsers();
}

function handlePageSizeChange(size: number): void {
  userStore.setPageSize(size);
  userStore.setPage(1);
  loadUsers();
}

function handleViewDetails(user: User): void {
  selectedUserId.value = user.id;
  showDetailModal.value = true;
}

function handleEdit(user: User): void {
  editUserId.value = user.id;
  showEditModal.value = true;
}

function handleUserUpdated(): void {
  loadUsers();
}

async function handleToggleBan(user: User): Promise<void> {
  try {
    const action = user.banned ? 'unban' : 'ban';
    await ElMessageBox.confirm(
      t('users.confirmToggleBan', { action: t(`users.${action}`) }),
      t('common.confirm'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    if (user.banned) {
      await userStore.unbanUser(user.id);
      ElMessage.success(t('users.unbanSuccess'));
    } else {
      await userStore.banUser(user.id);
      ElMessage.success(t('users.banSuccess'));
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || t('common.operationFailed'));
    }
  }
}

async function handleGenerate(): Promise<void> {
  if (!generateFormRef.value) return;

  try {
    await generateFormRef.value.validate();

    const data: GenerateUserData = {
      ...generateForm,
      expired_at: Math.floor(new Date(generateForm.expired_at).getTime() / 1000),
      transfer_enable: generateForm.transfer_enable * 1024 * 1024 * 1024, // Convert GB to bytes
    };

    const users = await userStore.generateUsers(data);
    ElMessage.success(t('users.generateSuccess', { count: users.length }));
    showGenerateDialog.value = false;
    generateFormRef.value.resetFields();
    loadUsers();
  } catch (error: any) {
    ElMessage.error(error.message || t('users.generateFailed'));
  }
}

async function handleExport(): Promise<void> {
  try {
    const blob = await userStore.exportUsers();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_${Date.now()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    ElMessage.success(t('users.exportSuccess'));
  } catch (error: any) {
    ElMessage.error(error.message || t('users.exportFailed'));
  }
}

async function handleSendEmail(): Promise<void> {
  if (!emailFormRef.value) return;

  try {
    await emailFormRef.value.validate();

    const userIds = selectedUsers.value.map((u) => u.id);
    await userStore.sendBulkEmail(userIds, emailForm.subject, emailForm.content);
    
    ElMessage.success(t('users.emailSent'));
    showBulkEmailDialog.value = false;
    emailFormRef.value.resetFields();
  } catch (error: any) {
    ElMessage.error(error.message || t('users.emailFailed'));
  }
}

function handleRemoveRecipient(userId: number): void {
  selectedUsers.value = selectedUsers.value.filter((u) => u.id !== userId);
}

async function loadUsers(): Promise<void> {
  try {
    await userStore.fetchUsers();
  } catch (error: any) {
    ElMessage.error(error.message || t('users.loadFailed'));
  }
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    loadUsers(),
    planStore.fetchPlans(),
  ]);
});
</script>

<style scoped lang="scss">
.user-list-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  .page-title {
    font-size: 24px;
    font-weight: 600;
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 10px;
  }
}

.filter-card {
  margin-bottom: 20px;
}

.table-card {
  .user-email {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .traffic-info {
    .traffic-used {
      font-size: 12px;
      margin-bottom: 4px;
    }
  }

  .pagination-container {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
  }
}
</style>

