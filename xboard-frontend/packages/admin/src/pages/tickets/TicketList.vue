<template>
  <div class="ticket-list-container">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('tickets.title') }}</h1>
        <p class="page-description">{{ t('tickets.description') }}</p>
      </div>
    </div>

    <!-- Filters -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filterForm">
        <el-form-item :label="t('tickets.filters.status')">
          <el-select
            v-model="filterForm.status"
            :placeholder="t('tickets.filters.allStatus')"
            clearable
            style="width: 150px"
            @change="handleFilter"
          >
            <el-option :label="t('tickets.status.open')" :value="0" />
            <el-option :label="t('tickets.status.closed')" :value="1" />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('tickets.filters.search')">
          <el-input
            v-model="filterForm.search"
            :placeholder="t('tickets.filters.searchPlaceholder')"
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

    <!-- Ticket List -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="ticketStore.loading"
        :data="ticketStore.tickets"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        
        <el-table-column :label="t('tickets.table.subject')" min-width="200">
          <template #default="{ row }">
            <el-link type="primary" @click="handleViewTicket(row)">
              {{ row.subject }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column :label="t('tickets.table.user')" width="200">
          <template #default="{ row }">
            <span v-if="row.user">{{ row.user.email }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column :label="t('tickets.table.level')" width="120">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.level)">
              {{ getLevelText(row.level) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="t('tickets.table.status')" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 0 ? 'success' : 'info'">
              {{ row.status === 0 ? t('tickets.status.open') : t('tickets.status.closed') }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="t('tickets.table.replyStatus')" width="120">
          <template #default="{ row }">
            <el-tag :type="row.reply_status === 0 ? 'warning' : 'success'">
              {{ row.reply_status === 0 ? t('tickets.replyStatus.pending') : t('tickets.replyStatus.replied') }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="t('tickets.table.createdAt')" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column :label="t('common.actions')" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              link
              @click="handleViewTicket(row)"
            >
              {{ t('tickets.actions.view') }}
            </el-button>
            <el-button
              v-if="row.status === 0"
              type="danger"
              size="small"
              link
              @click="handleCloseTicket(row)"
            >
              {{ t('tickets.actions.close') }}
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
          :total="ticketStore.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- Ticket Conversation Modal -->
    <ticket-conversation-modal
      v-model:visible="conversationVisible"
      :ticket-id="selectedTicketId"
      @closed="handleTicketClosed"
      @replied="handleTicketReplied"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { useTicketStore } from '@/stores/ticket';
import { formatDate } from '@xboard/shared/utils';
import type { Ticket } from '@xboard/shared/types';
// Lazy load modal component
import { defineAsyncComponent } from 'vue';
const TicketConversationModal = defineAsyncComponent(() => import('@/components/tickets/TicketConversationModal.vue'));

const { t } = useI18n();
const ticketStore = useTicketStore();

// Filter form
const filterForm = reactive({
  status: undefined as number | undefined,
  search: '',
});

// Pagination
const pagination = reactive({
  page: 1,
  pageSize: 20,
});

// Modal state
const conversationVisible = ref(false);
const selectedTicketId = ref<number | null>(null);

// Get level type for tag
function getLevelType(level: number): 'success' | 'warning' | 'danger' {
  if (level === 0) return 'success';
  if (level === 1) return 'warning';
  return 'danger';
}

// Get level text
function getLevelText(level: number): string {
  const levels = ['Low', 'Medium', 'High'];
  return levels[level] || 'Unknown';
}

// Handle filter
async function handleFilter() {
  pagination.page = 1;
  await fetchTickets();
}

// Handle reset
async function handleReset() {
  filterForm.status = undefined;
  filterForm.search = '';
  pagination.page = 1;
  await fetchTickets();
}

// Handle page change
async function handlePageChange(page: number) {
  pagination.page = page;
  await fetchTickets();
}

// Handle page size change
async function handleSizeChange(pageSize: number) {
  pagination.pageSize = pageSize;
  pagination.page = 1;
  await fetchTickets();
}

// Fetch tickets
async function fetchTickets() {
  try {
    await ticketStore.fetchTickets({
      page: pagination.page,
      page_size: pagination.pageSize,
      filters: {
        status: filterForm.status,
        search: filterForm.search || undefined,
      },
    });
  } catch (error) {
    ElMessage.error(t('tickets.messages.fetchError'));
  }
}

// Handle view ticket
function handleViewTicket(ticket: Ticket) {
  selectedTicketId.value = ticket.id;
  conversationVisible.value = true;
}

// Handle close ticket
async function handleCloseTicket(ticket: Ticket) {
  try {
    await ElMessageBox.confirm(
      t('tickets.messages.closeConfirm'),
      t('common.warning'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await ticketStore.closeTicket(ticket.id);
    ElMessage.success(t('tickets.messages.closeSuccess'));
    await fetchTickets();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(t('tickets.messages.closeError'));
    }
  }
}

// Handle ticket closed event
function handleTicketClosed() {
  fetchTickets();
}

// Handle ticket replied event
function handleTicketReplied() {
  fetchTickets();
}

// Initialize
onMounted(() => {
  fetchTickets();
  ticketStore.fetchUnreadCount();
});
</script>

<style scoped lang="scss">
.ticket-list-container {
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

.pagination-container {
  display: flex;
  justify-content: flex-end;
  padding: 20px;
}
</style>
