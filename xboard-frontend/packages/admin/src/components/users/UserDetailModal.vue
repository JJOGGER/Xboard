<template>
  <el-dialog
    v-model="visible"
    :title="`User Details - ${user?.email || ''}`"
    width="900px"
    @close="handleClose"
  >
    <div v-loading="loading" class="user-detail-modal">
      <el-tabs v-model="activeTab" v-if="user">
        <!-- User Info Tab -->
        <el-tab-pane label="User Info" name="info">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="ID">
              {{ user.id }}
            </el-descriptions-item>

            <el-descriptions-item label="Email">
              {{ user.email }}
            </el-descriptions-item>

            <el-descriptions-item label="Role">
              <el-tag v-if="user.is_admin" type="danger">Admin</el-tag>
              <el-tag v-else-if="user.is_staff" type="warning">Staff</el-tag>
              <el-tag v-else type="info">User</el-tag>
            </el-descriptions-item>

            <el-descriptions-item label="Status">
              <el-tag v-if="user.banned" type="danger">Banned</el-tag>
              <el-tag v-else type="success">Active</el-tag>
            </el-descriptions-item>

            <el-descriptions-item label="Balance">
              {{ formatCurrency(user.balance) }}
            </el-descriptions-item>

            <el-descriptions-item label="Commission Balance">
              {{ formatCurrency(user.commission_balance) }}
            </el-descriptions-item>

            <el-descriptions-item label="Created At">
              {{ formatDate(user.created_at) }}
            </el-descriptions-item>

            <el-descriptions-item label="Updated At">
              {{ formatDate(user.updated_at) }}
            </el-descriptions-item>

            <el-descriptions-item label="Referrer">
              <span v-if="user.invite_user_id">
                User #{{ user.invite_user_id }}
              </span>
              <el-tag v-else type="info" size="small">None</el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <!-- Subscription Tab -->
        <el-tab-pane label="Subscription" name="subscription">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="Plan">
              <span v-if="user.plan_id">{{ getPlanName(user.plan_id) }}</span>
              <el-tag v-else type="info" size="small">No Plan</el-tag>
            </el-descriptions-item>

            <el-descriptions-item label="Expired At">
              <span v-if="user.expired_at">
                {{ formatDate(user.expired_at * 1000) }}
              </span>
              <el-tag v-else type="info" size="small">Never</el-tag>
            </el-descriptions-item>

            <el-descriptions-item label="Upload Traffic">
              {{ formatBytes(user.u) }}
            </el-descriptions-item>

            <el-descriptions-item label="Download Traffic">
              {{ formatBytes(user.d) }}
            </el-descriptions-item>

            <el-descriptions-item label="Total Used">
              {{ formatBytes(user.u + user.d) }}
            </el-descriptions-item>

            <el-descriptions-item label="Traffic Quota">
              {{ formatBytes(user.transfer_enable) }}
            </el-descriptions-item>

            <el-descriptions-item label="Remaining Traffic" :span="2">
              <div class="traffic-progress">
                <span class="traffic-text">
                  {{ formatBytes(user.transfer_enable - user.u - user.d) }}
                </span>
                <el-progress
                  :percentage="getTrafficPercentage(user)"
                  :status="getTrafficStatus(user)"
                  class="mt-2"
                />
              </div>
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <!-- Orders Tab -->
        <el-tab-pane label="Orders" name="orders">
          <el-table
            v-loading="ordersLoading"
            :data="orders"
            stripe
            max-height="400"
          >
            <el-table-column prop="id" label="Order ID" width="100" />
            
            <el-table-column label="Plan" width="150">
              <template #default="{ row }">
                {{ getPlanName(row.plan_id) }}
              </template>
            </el-table-column>

            <el-table-column prop="period" label="Period" width="120" />

            <el-table-column label="Amount" width="120">
              <template #default="{ row }">
                {{ formatCurrency(row.total_amount) }}
              </template>
            </el-table-column>

            <el-table-column label="Status" width="120">
              <template #default="{ row }">
                <el-tag :type="getOrderStatusType(row.status)" size="small">
                  {{ getOrderStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="Created At" width="180">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
          </el-table>

          <div v-if="orders.length === 0 && !ordersLoading" class="empty-state">
            <el-empty description="No orders found" />
          </div>
        </el-tab-pane>

        <!-- Commission Logs Tab -->
        <el-tab-pane label="Commission Logs" name="commissions">
          <el-table
            v-loading="commissionsLoading"
            :data="commissions"
            stripe
            max-height="400"
          >
            <el-table-column prop="id" label="Log ID" width="100" />

            <el-table-column label="Type" width="120">
              <template #default="{ row }">
                <el-tag :type="row.get_amount > 0 ? 'success' : 'danger'" size="small">
                  {{ row.get_amount > 0 ? 'Earned' : 'Withdrawn' }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="Amount" width="120">
              <template #default="{ row }">
                {{ formatCurrency(Math.abs(row.get_amount)) }}
              </template>
            </el-table-column>

            <el-table-column label="Balance After" width="150">
              <template #default="{ row }">
                {{ formatCurrency(row.balance_after) }}
              </template>
            </el-table-column>

            <el-table-column prop="trade_no" label="Trade No" min-width="200" />

            <el-table-column label="Created At" width="180">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
          </el-table>

          <div v-if="commissions.length === 0 && !commissionsLoading" class="empty-state">
            <el-empty description="No commission logs found" />
          </div>
        </el-tab-pane>

        <!-- Traffic Logs Tab -->
        <el-tab-pane label="Traffic Logs" name="traffic">
          <el-table
            v-loading="trafficLogsLoading"
            :data="trafficLogs"
            stripe
            max-height="400"
          >
            <el-table-column prop="id" label="Log ID" width="100" />

            <el-table-column label="Server" min-width="150">
              <template #default="{ row }">
                Server #{{ row.server_id }}
              </template>
            </el-table-column>

            <el-table-column label="Upload" width="120">
              <template #default="{ row }">
                {{ formatBytes(row.u) }}
              </template>
            </el-table-column>

            <el-table-column label="Download" width="120">
              <template #default="{ row }">
                {{ formatBytes(row.d) }}
              </template>
            </el-table-column>

            <el-table-column label="Total" width="120">
              <template #default="{ row }">
                {{ formatBytes(row.u + row.d) }}
              </template>
            </el-table-column>

            <el-table-column prop="server_rate" label="Rate" width="100" />

            <el-table-column label="Record At" width="180">
              <template #default="{ row }">
                {{ formatDate(row.record_at * 1000) }}
              </template>
            </el-table-column>
          </el-table>

          <div v-if="trafficLogs.length === 0 && !trafficLogsLoading" class="empty-state">
            <el-empty description="No traffic logs found" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <el-button @click="handleClose">Close</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import type { User, Order, TrafficLog } from '@xboard/shared/types';
import { apiClient } from '@xboard/shared/api';
import { formatBytes, formatCurrency, formatDate } from '@xboard/shared/utils';
import { usePlanStore } from '@/stores/plan';

interface CommissionLog {
  id: number;
  user_id: number;
  get_amount: number;
  balance_after: number;
  trade_no: string;
  created_at: string;
}

interface Props {
  modelValue: boolean;
  userId: number | null;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const planStore = usePlanStore();

// State
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const activeTab = ref('info');
const loading = ref(false);
const user = ref<User | null>(null);

// Orders
const orders = ref<Order[]>([]);
const ordersLoading = ref(false);

// Commission logs
const commissions = ref<CommissionLog[]>([]);
const commissionsLoading = ref(false);

// Traffic logs
const trafficLogs = ref<TrafficLog[]>([]);
const trafficLogsLoading = ref(false);

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

function getOrderStatusType(status: number): 'info' | 'warning' | 'danger' | 'success' {
  const statusMap: Record<number, 'info' | 'warning' | 'danger' | 'success'> = {
    0: 'info',      // pending
    1: 'warning',   // processing
    2: 'danger',    // cancelled
    3: 'success',   // completed
    4: 'success',   // discounted
  };
  return statusMap[status] || 'info';
}

function getOrderStatusText(status: number): string {
  const statusMap: Record<number, string> = {
    0: 'Pending',
    1: 'Processing',
    2: 'Cancelled',
    3: 'Completed',
    4: 'Discounted',
  };
  return statusMap[status] || 'Unknown';
}

async function fetchUserDetails(): Promise<void> {
  if (!props.userId) return;

  loading.value = true;
  try {
    const response = await apiClient.get<{ data: User }>(`/v2/user/getUserInfoById?id=${props.userId}`);
    user.value = response.data.data;
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to load user details');
  } finally {
    loading.value = false;
  }
}

async function fetchOrders(): Promise<void> {
  if (!props.userId) return;

  ordersLoading.value = true;
  try {
    const response = await apiClient.get<{ data: Order[] }>(`/admin/user/${props.userId}/orders`);
    orders.value = response.data.data;
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to load orders');
  } finally {
    ordersLoading.value = false;
  }
}

async function fetchCommissions(): Promise<void> {
  if (!props.userId) return;

  commissionsLoading.value = true;
  try {
    const response = await apiClient.get<{ data: CommissionLog[] }>(
      `/admin/user/${props.userId}/commissions`
    );
    commissions.value = response.data.data;
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to load commission logs');
  } finally {
    commissionsLoading.value = false;
  }
}

async function fetchTrafficLogs(): Promise<void> {
  if (!props.userId) return;

  trafficLogsLoading.value = true;
  try {
    const response = await apiClient.get<{ data: TrafficLog[] }>(
      `/admin/user/${props.userId}/traffic-logs`
    );
    trafficLogs.value = response.data.data;
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to load traffic logs');
  } finally {
    trafficLogsLoading.value = false;
  }
}

function handleClose(): void {
  visible.value = false;
  activeTab.value = 'info';
  user.value = null;
  orders.value = [];
  commissions.value = [];
  trafficLogs.value = [];
}

// Watch for tab changes to lazy load data
watch(activeTab, (newTab) => {
  if (newTab === 'orders' && orders.value.length === 0) {
    fetchOrders();
  } else if (newTab === 'commissions' && commissions.value.length === 0) {
    fetchCommissions();
  } else if (newTab === 'traffic' && trafficLogs.value.length === 0) {
    fetchTrafficLogs();
  }
});

// Watch for modal open
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue && props.userId) {
      fetchUserDetails();
    }
  },
  { immediate: true }
);
</script>

<style scoped lang="scss">
.user-detail-modal {
  min-height: 400px;

  .traffic-progress {
    width: 100%;

    .traffic-text {
      font-weight: 600;
    }
  }

  .empty-state {
    padding: 40px 0;
    text-align: center;
  }
}
</style>

