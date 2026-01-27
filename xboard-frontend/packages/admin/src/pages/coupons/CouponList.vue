<template>
  <div class="coupon-list-container">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('coupons.title') }}</h1>
        <p class="page-description">{{ t('coupons.description') }}</p>
      </div>
      <div>
        <el-button type="primary" @click="handleCreate">
          {{ t('coupons.actions.create') }}
        </el-button>
        <el-button type="success" @click="handleGenerate">
          {{ t('coupons.actions.generate') }}
        </el-button>
      </div>
    </div>

    <!-- Filters -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filterForm">
        <el-form-item :label="t('coupons.filters.visibility')">
          <el-select
            v-model="filterForm.show"
            :placeholder="t('coupons.filters.allVisibility')"
            clearable
            style="width: 150px"
            @change="handleFilter"
          >
            <el-option :label="t('common.visible')" :value="1" />
            <el-option :label="t('common.hidden')" :value="0" />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('coupons.filters.search')">
          <el-input
            v-model="filterForm.search"
            :placeholder="t('coupons.filters.searchPlaceholder')"
            clearable
            style="width: 250px"
            @clear="handleFilter"
            @keyup.enter="handleFilter"
          >
            <template #append>
              <el-button :icon="Search" @click="handleFilter" />
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleFilter">
            {{ t('common.search') }}
          </el-button>
          <el-button @click="handleReset">
            {{ t('common.reset') }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Coupon List -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="couponStore.loading"
        :data="couponStore.coupons"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        
        <el-table-column :label="t('coupons.table.code')" width="150">
          <template #default="{ row }">
            <el-tag>{{ row.code }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="t('coupons.table.name')" min-width="150">
          <template #default="{ row }">
            {{ row.name }}
          </template>
        </el-table-column>

        <el-table-column :label="t('coupons.table.type')" width="120">
          <template #default="{ row }">
            <el-tag :type="row.type === 1 ? 'success' : 'warning'">
              {{ row.type === 1 ? t('coupons.type.percentage') : t('coupons.type.fixed') }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="t('coupons.table.value')" width="120">
          <template #default="{ row }">
            {{ row.type === 1 ? `${row.value}%` : `$${row.value}` }}
          </template>
        </el-table-column>

        <el-table-column :label="t('coupons.table.usage')" width="150">
          <template #default="{ row }">
            <span v-if="row.limit_use">
              {{ row.limit_use - (row.used_count || 0) }} / {{ row.limit_use }}
            </span>
            <span v-else>{{ t('coupons.unlimited') }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="t('coupons.table.validity')" width="200">
          <template #default="{ row }">
            <div class="validity-dates">
              <div>{{ formatDate(row.started_at * 1000) }}</div>
              <div>{{ formatDate(row.ended_at * 1000) }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="t('coupons.table.visibility')" width="100">
          <template #default="{ row }">
            <el-switch
              :model-value="row.show === 1"
              @change="handleToggleVisibility(row)"
            />
          </template>
        </el-table-column>

        <el-table-column :label="t('common.actions')" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              link
              @click="handleEdit(row)"
            >
              {{ t('common.edit') }}
            </el-button>
            <el-button
              type="danger"
              size="small"
              link
              @click="handleDelete(row)"
            >
              {{ t('common.delete') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="couponStore.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- Coupon Form Modal -->
    <coupon-form-modal
      v-model:visible="formVisible"
      :coupon="selectedCoupon"
      @saved="handleSaved"
    />

    <!-- Generate Coupons Modal -->
    <generate-coupons-modal
      v-model:visible="generateVisible"
      @generated="handleGenerated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { useCouponStore } from '@/stores/coupon';
import { formatDate } from '@xboard/shared/utils';
import type { Coupon } from '@xboard/shared/types';
// Lazy load modal components
import { defineAsyncComponent } from 'vue';
const CouponFormModal = defineAsyncComponent(() => import('@/components/coupons/CouponFormModal.vue'));
const GenerateCouponsModal = defineAsyncComponent(() => import('@/components/coupons/GenerateCouponsModal.vue'));

const { t } = useI18n();
const couponStore = useCouponStore();

// Filter form
const filterForm = reactive({
  show: undefined as number | undefined,
  search: '',
});

// Pagination
const pagination = reactive({
  page: 1,
  pageSize: 20,
});

// Modal state
const formVisible = ref(false);
const generateVisible = ref(false);
const selectedCoupon = ref<Coupon | null>(null);

// Handle filter
async function handleFilter() {
  pagination.page = 1;
  await fetchCoupons();
}

// Handle reset
async function handleReset() {
  filterForm.show = undefined;
  filterForm.search = '';
  pagination.page = 1;
  await fetchCoupons();
}

// Handle page change
async function handlePageChange(page: number) {
  pagination.page = page;
  await fetchCoupons();
}

// Handle page size change
async function handleSizeChange(pageSize: number) {
  pagination.pageSize = pageSize;
  pagination.page = 1;
  await fetchCoupons();
}

// Fetch coupons
async function fetchCoupons() {
  try {
    await couponStore.fetchCoupons({
      page: pagination.page,
      page_size: pagination.pageSize,
      filters: {
        show: filterForm.show,
        search: filterForm.search || undefined,
      },
    });
  } catch (error) {
    ElMessage.error(t('coupons.messages.fetchError'));
  }
}

// Handle create
function handleCreate() {
  selectedCoupon.value = null;
  formVisible.value = true;
}

// Handle edit
function handleEdit(coupon: Coupon) {
  selectedCoupon.value = coupon;
  formVisible.value = true;
}

// Handle generate
function handleGenerate() {
  generateVisible.value = true;
}

// Handle delete
async function handleDelete(coupon: Coupon) {
  try {
    await ElMessageBox.confirm(
      t('coupons.messages.deleteConfirm', { code: coupon.code }),
      t('common.warning'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await couponStore.deleteCoupon(coupon.id);
    ElMessage.success(t('coupons.messages.deleteSuccess'));
    await fetchCoupons();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(t('coupons.messages.deleteError'));
    }
  }
}

// Handle toggle visibility
async function handleToggleVisibility(coupon: Coupon) {
  try {
    const newShow = coupon.show === 1 ? 0 : 1;
    await couponStore.toggleVisibility(coupon.id, newShow);
    ElMessage.success(t('coupons.messages.visibilityUpdated'));
  } catch (error) {
    ElMessage.error(t('coupons.messages.visibilityUpdateError'));
    await fetchCoupons();
  }
}

// Handle saved
function handleSaved() {
  fetchCoupons();
}

// Handle generated
function handleGenerated() {
  fetchCoupons();
}

// Initialize
onMounted(() => {
  fetchCoupons();
});
</script>

<style scoped lang="scss">
.coupon-list-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}

.page-description {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.filter-card {
  margin-bottom: 20px;
}

.table-card {
  :deep(.el-card__body) {
    padding: 0;
  }

  .el-table {
    :deep(.el-table__header) {
      th {
        background-color: var(--el-fill-color-light);
      }
    }
  }
}

.validity-dates {
  font-size: 12px;
  line-height: 1.5;
  
  div:first-child {
    color: var(--el-text-color-primary);
  }
  
  div:last-child {
    color: var(--el-text-color-secondary);
  }
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  padding: 20px;
}
</style>
