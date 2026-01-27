<template>
  <div class="payment-management-page">
    <el-card class="page-header" shadow="never">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">{{ t('payment.title') }}</h2>
          <p class="mt-1 text-sm text-gray-600">{{ t('payment.description') }}</p>
        </div>
        <el-button type="primary" @click="handleCreate">
          <el-icon class="mr-2"><Plus /></el-icon>
          {{ t('payment.addPayment') }}
        </el-button>
      </div>
    </el-card>

    <el-card class="mt-4" shadow="never" v-loading="paymentStore.loading">
      <el-table
        :data="paymentStore.payments"
        row-key="id"
        class="payment-table"
      >
        <el-table-column type="index" width="60" :label="t('common.index')" />
        
        <el-table-column prop="name" :label="t('payment.name')" min-width="150" />
        
        <el-table-column prop="payment" :label="t('payment.gateway')" min-width="120" />
        
        <el-table-column :label="t('payment.icon')" width="80">
          <template #default="{ row }">
            <el-image
              v-if="row.icon"
              :src="row.icon"
              fit="contain"
              style="width: 40px; height: 40px"
            />
            <span v-else class="text-gray-400">-</span>
          </template>
        </el-table-column>
        
        <el-table-column :label="t('payment.handlingFee')" min-width="150">
          <template #default="{ row }">
            <div class="text-sm">
              <div v-if="row.handling_fee_fixed">
                {{ t('payment.fixed') }}: {{ formatCurrency(row.handling_fee_fixed) }}
              </div>
              <div v-if="row.handling_fee_percent">
                {{ t('payment.percent') }}: {{ row.handling_fee_percent }}%
              </div>
              <span v-if="!row.handling_fee_fixed && !row.handling_fee_percent" class="text-gray-400">
                {{ t('common.none') }}
              </span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column :label="t('payment.status')" width="100">
          <template #default="{ row }">
            <el-tag :type="row.show === 1 ? 'success' : 'info'" size="small">
              {{ row.show === 1 ? t('common.visible') : t('common.hidden') }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="sort" :label="t('payment.sort')" width="100" />
        
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
              type="warning"
              size="small"
              link
              @click="handleToggleShow(row)"
            >
              {{ row.show === 1 ? t('common.hide') : t('common.show') }}
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
    </el-card>

    <!-- Payment Form Modal -->
    <PaymentFormModal
      v-model="showFormModal"
      :payment="currentPayment"
      @success="handleFormSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { usePaymentStore } from '../../stores/payment';
import PaymentFormModal from '../../components/config/PaymentFormModal.vue';
import type { PaymentMethod } from '@xboard/shared/src/types/payment';
import { formatCurrency } from '@xboard/shared/src/utils/number';

const { t } = useI18n();
const paymentStore = usePaymentStore();

// State
const showFormModal = ref(false);
const currentPayment = ref<PaymentMethod | null>(null);

// Methods
async function loadPayments() {
  await paymentStore.fetchPayments();
}

function handleCreate() {
  currentPayment.value = null;
  showFormModal.value = true;
}

function handleEdit(payment: PaymentMethod) {
  currentPayment.value = payment;
  showFormModal.value = true;
}

async function handleToggleShow(payment: PaymentMethod) {
  try {
    await paymentStore.toggleShow(payment.id);
  } catch (error) {
    // Error handled by store
  }
}

async function handleDelete(payment: PaymentMethod) {
  try {
    await ElMessageBox.confirm(
      t('payment.deleteConfirm', { name: payment.name }),
      t('common.confirm'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );
    
    await paymentStore.deletePayment(payment.id);
  } catch (error) {
    // User cancelled or error occurred
  }
}

function handleFormSuccess() {
  showFormModal.value = false;
  loadPayments();
}

// Lifecycle
onMounted(() => {
  loadPayments();
});
</script>

<style scoped lang="scss">
.payment-management-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.payment-table {
  width: 100%;
}
</style>
