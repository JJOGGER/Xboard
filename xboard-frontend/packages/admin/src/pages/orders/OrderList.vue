<template>
  <div class="order-list-page">
    <!-- Page Header -->
    <div class="page-header">
      <h1 class="page-title">{{ t('orders.title') }}</h1>
    </div>

    

    <!-- Filters -->
    <el-card class="filter-card">
      <el-form :model="filters" inline>
        <el-form-item :label="t('common.search')">
          <el-input
            v-model="filters.search"
            :placeholder="t('orders.tradeNo')"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          >
            <template #append>
              <el-button :icon="Search" @click="handleSearch" />
            </template>
          </el-input>
        </el-form-item>

        <el-form-item :label="t('orders.filterByStatus')">
          <el-select
            v-model="filters.status"
            :placeholder="t('orders.allStatuses')"
            clearable
            @change="handleSearch"
          >
            <el-option :label="t('orders.pending')" :value="0" />
            <el-option :label="t('orders.processing')" :value="1" />
            <el-option :label="t('orders.cancelled')" :value="2" />
            <el-option :label="t('orders.completed')" :value="3" />
            <el-option :label="t('orders.discounted')" :value="4" />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('orders.dateRange')">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            :start-placeholder="t('orders.startDate')"
            :end-placeholder="t('orders.endDate')"
            value-format="YYYY-MM-DD"
            @change="handleDateRangeChange"
          />
        </el-form-item>

        <el-form-item>
          <el-button @click="handleReset">{{ t('common.reset') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Orders Table -->
    <el-card class="table-card">
      <el-table
        v-loading="orderStore.loading"
        :data="orderStore.orders"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" :label="t('orders.orderId')" width="80" />
        
        <el-table-column prop="trade_no" :label="t('orders.tradeNo')" width="180" />
        
        <el-table-column :label="t('orders.user')" width="200">
          <template #default="{ row }">
            <div v-if="row.user">
              <div>{{ row.user.email }}</div>
              <div class="text-secondary">ID: {{ row.user_id }}</div>
            </div>
            <div v-else class="text-secondary">ID: {{ row.user_id }}</div>
          </template>
        </el-table-column>
        
        <el-table-column :label="t('orders.plan')" width="150">
          <template #default="{ row }">
            <div v-if="row.plan">{{ row.plan.name }}</div>
            <div v-else class="text-secondary">ID: {{ row.plan_id }}</div>
          </template>
        </el-table-column>
        
        <el-table-column :label="t('orders.period')" width="100">
          <template #default="{ row }">
            {{ getPeriodLabel(row.period) }}
          </template>
        </el-table-column>
        
        <el-table-column :label="t('orders.totalAmount')" width="120">
          <template #default="{ row }">
            ¥{{ formatCurrency(row.total_amount) }}
          </template>
        </el-table-column>
        
        <el-table-column :label="t('common.status')" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column :label="t('common.createdAt')" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column :label="t('common.actions')" fixed="right" width="200">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              @click="handleViewDetail(row)"
            >
              {{ t('orders.viewDetail') }}
            </el-button>
            
            <el-button
              v-if="row.status === 0"
              link
              type="success"
              size="small"
              @click="handleConfirmPayment(row)"
            >
              {{ t('orders.confirmPayment') }}
            </el-button>
            
            <el-button
              v-if="row.status === 0 || row.status === 1"
              link
              type="danger"
              size="small"
              @click="handleCancelOrder(row)"
            >
              {{ t('orders.cancelOrder') }}
            </el-button>
            
            <el-dropdown trigger="click">
              <el-button link type="primary" size="small">
                {{ t('common.actions') }}
                <el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleAssignOrder(row)">
                    {{ t('orders.assignOrder') }}
                  </el-dropdown-item>
                  <el-dropdown-item @click="handleUpdateOrder(row)">
                    {{ t('orders.updateOrder') }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="orderStore.currentPage"
          v-model:page-size="orderStore.pageSize"
          :total="orderStore.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- Order Detail Modal -->
    <OrderDetailModal
      v-model:visible="detailModalVisible"
      :order-id="selectedOrderId"
    />

    <!-- Assign Order Modal -->
    <AssignOrderModal
      v-model:visible="assignModalVisible"
      :order-id="selectedOrderId"
      @success="handleOperationSuccess"
    />

    <!-- Update Order Modal -->
    <UpdateOrderModal
      v-model:visible="updateModalVisible"
      :order="selectedOrder"
      @success="handleOperationSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, ArrowDown } from '@element-plus/icons-vue';
import { useOrderStore } from '@/stores/order';
import { formatDate, formatCurrency } from '@xboard/shared';
import type { Order, OrderFilters } from '@xboard/shared';
// Lazy load modal components
import { defineAsyncComponent } from 'vue';
const OrderDetailModal = defineAsyncComponent(() => import('@/components/orders/OrderDetailModal.vue'));
const AssignOrderModal = defineAsyncComponent(() => import('@/components/orders/AssignOrderModal.vue'));
const UpdateOrderModal = defineAsyncComponent(() => import('@/components/orders/UpdateOrderModal.vue'));

const { t } = useI18n();
const orderStore = useOrderStore();

// State
const filters = reactive<OrderFilters>({
  search: '',
  status: undefined,
  date_start: undefined,
  date_end: undefined,
});

const dateRange = ref<[string, string] | null>(null);
const detailModalVisible = ref(false);
const assignModalVisible = ref(false);
const updateModalVisible = ref(false);
const selectedOrderId = ref<number | null>(null);
const selectedOrder = ref<Order | null>(null);

// Methods
const handleSearch = async () => {
  orderStore.setFilters(filters);
  orderStore.setPage(1);
  await loadOrders();
};

const handleReset = async () => {
  filters.search = '';
  filters.status = undefined;
  filters.date_start = undefined;
  filters.date_end = undefined;
  dateRange.value = null;
  orderStore.clearFilters();
  orderStore.setPage(1);
  await loadOrders();
};

const handleDateRangeChange = (value: [string, string] | null) => {
  if (value) {
    filters.date_start = value[0];
    filters.date_end = value[1];
  } else {
    filters.date_start = undefined;
    filters.date_end = undefined;
  }
  handleSearch();
};

const handlePageChange = async (page: number) => {
  orderStore.setPage(page);
  await loadOrders();
};

const handleSizeChange = async (size: number) => {
  orderStore.pageSize = size;
  orderStore.setPage(1);
  await loadOrders();
};

const handleViewDetail = (order: Order) => {
  selectedOrderId.value = order.id;
  detailModalVisible.value = true;
};

const handleConfirmPayment = async (order: Order) => {
  try {
    await ElMessageBox.confirm(
      t('orders.confirmPaymentMessage', { tradeNo: order.trade_no }),
      t('orders.confirmPaymentTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await orderStore.confirmPayment(order.id);
    ElMessage.success(t('orders.paymentConfirmed'));
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || t('orders.confirmPaymentFailed'));
    }
  }
};

const handleCancelOrder = async (order: Order) => {
  try {
    await ElMessageBox.confirm(
      t('orders.confirmCancelMessage', { tradeNo: order.trade_no }),
      t('orders.confirmCancelTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await orderStore.cancelOrder(order.trade_no, order.id);
    ElMessage.success(t('orders.orderCancelled'));
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || t('orders.cancelOrderFailed'));
    }
  }
};

const handleAssignOrder = (order: Order) => {
  selectedOrderId.value = order.id;
  assignModalVisible.value = true;
};

const handleUpdateOrder = (order: Order) => {
  selectedOrder.value = order;
  updateModalVisible.value = true;
};

const handleOperationSuccess = async () => {
  await loadOrders();
};

const loadOrders = async () => {
  try {
    await orderStore.fetchOrders();
  } catch (error: any) {
    ElMessage.error(error.message || t('orders.fetchFailed'));
  }
};

const getStatusLabel = (status: number): string => {
  const statusMap: Record<number, string> = {
    0: t('orders.pending'),
    1: t('orders.processing'),
    2: t('orders.cancelled'),
    3: t('orders.completed'),
    4: t('orders.discounted'),
  };
  return statusMap[status] || '';
};

const getStatusType = (status: number): string => {
  const typeMap: Record<number, string> = {
    0: 'warning',
    1: 'info',
    2: 'danger',
    3: 'success',
    4: 'success',
  };
  return typeMap[status] || '';
};

const getPeriodLabel = (period: string): string => {
  const periodMap: Record<string, string> = {
    month_price: t('orders.monthly'),
    quarter_price: t('orders.quarterly'),
    half_year_price: t('orders.halfYearly'),
    year_price: t('orders.yearly'),
    two_year_price: t('orders.twoYears'),
    three_year_price: t('orders.threeYears'),
    onetime_price: t('orders.onetime'),
    reset_price: t('orders.reset'),
  };
  return periodMap[period] || period;
};

// Lifecycle
onMounted(async () => {
  await loadOrders();
});
</script>

<style scoped>
.order-list-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  cursor: default;
}

.stat-content {
  text-align: center;
}

.stat-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.filter-card {
  margin-bottom: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.text-secondary {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
