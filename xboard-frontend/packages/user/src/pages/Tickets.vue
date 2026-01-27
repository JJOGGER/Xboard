<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Get help from our support team
        </p>
      </div>
      <n-button type="primary" @click="showCreateModal = true">
        <template #icon>
          <n-icon :component="AddOutline" />
        </template>
        New Ticket
      </n-button>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div class="flex items-center gap-4">
        <div class="flex-1">
          <n-radio-group v-model:value="statusFilter" @update:value="handleFilterChange">
            <n-radio-button :value="undefined">All</n-radio-button>
            <n-radio-button :value="0">Open</n-radio-button>
            <n-radio-button :value="1">Closed</n-radio-button>
          </n-radio-group>
        </div>
        <n-badge :value="unreadCount" :max="99" v-if="unreadCount > 0">
          <n-button text>
            <template #icon>
              <n-icon :component="NotificationsOutline" />
            </template>
            Unread
          </n-button>
        </n-badge>
      </div>
    </div>

    <!-- Tickets List -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
      <n-data-table
        :columns="columns"
        :data="tickets"
        :loading="loading"
        :pagination="{
          page,
          pageSize,
          itemCount: total,
          onChange: handlePageChange,
        }"
        :row-props="rowProps"
      />
    </div>

    <!-- Create Ticket Modal -->
    <n-modal
      v-model:show="showCreateModal"
      preset="card"
      title="Create New Ticket"
      style="width: 600px"
      :mask-closable="false"
    >
      <n-form ref="createFormRef" :model="createForm" :rules="createRules">
        <n-form-item label="Subject" path="subject">
          <n-input
            v-model:value="createForm.subject"
            placeholder="Brief description of your issue"
          />
        </n-form-item>

        <n-form-item label="Priority" path="level">
          <n-select
            v-model:value="createForm.level"
            :options="priorityOptions"
            placeholder="Select priority"
          />
        </n-form-item>

        <n-form-item label="Message" path="message">
          <n-input
            v-model:value="createForm.message"
            type="textarea"
            placeholder="Describe your issue in detail"
            :rows="6"
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showCreateModal = false">Cancel</n-button>
          <n-button type="primary" @click="handleCreateTicket" :loading="loading">
            Create Ticket
          </n-button>
        </div>
      </template>
    </n-modal>

    <!-- Ticket Conversation Modal -->
    <n-modal
      v-model:show="showConversationModal"
      preset="card"
      :title="`Ticket #${currentTicket?.id} - ${currentTicket?.subject}`"
      style="width: 800px"
      :mask-closable="false"
      @after-leave="handleConversationClose"
    >
      <div class="space-y-4">
        <!-- Messages -->
        <div class="space-y-4 max-h-96 overflow-y-auto">
          <div
            v-for="msg in currentTicket?.message"
            :key="msg.id"
            :class="[
              'p-4 rounded-lg',
              msg.is_me
                ? 'bg-blue-50 dark:bg-blue-900/20 ml-8'
                : 'bg-gray-50 dark:bg-gray-700 mr-8',
            ]"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                {{ msg.is_me ? 'You' : 'Support Team' }}
              </span>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatDate(msg.created_at) }}
              </span>
            </div>
            <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {{ msg.message }}
            </p>
          </div>
        </div>

        <!-- Reply Form -->
        <div v-if="currentTicket?.status === 0" class="border-t border-gray-200 dark:border-gray-700 pt-4">
          <n-input
            v-model:value="replyMessage"
            type="textarea"
            placeholder="Type your reply..."
            :rows="4"
          />
          <div class="flex justify-end gap-2 mt-4">
            <n-button @click="handleCloseTicket" :loading="loading">
              Close Ticket
            </n-button>
            <n-button type="primary" @click="handleReply" :loading="loading">
              Send Reply
            </n-button>
          </div>
        </div>

        <!-- Closed Notice -->
        <div v-else class="text-center py-4">
          <n-tag type="info">This ticket is closed</n-tag>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import {
  NButton,
  NIcon,
  NDataTable,
  NTag,
  NBadge,
  NRadioGroup,
  NRadioButton,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  useMessage,
  type FormInst,
  type FormRules,
} from 'naive-ui';
import {
  AddOutline,
  NotificationsOutline,
  ChatbubbleEllipsesOutline,
} from '@vicons/ionicons5';
import { useTicketStore } from '../stores/ticket';
import { formatDate } from '@xboard/shared';
import type { DataTableColumns, DataTableRowKey } from 'naive-ui';
import type { Ticket } from '@xboard/shared';

const message = useMessage();
const ticketStore = useTicketStore();

// Computed properties from store
const tickets = computed(() => ticketStore.tickets);
const currentTicket = computed(() => ticketStore.currentTicket);
const loading = computed(() => ticketStore.loading);
const page = computed(() => ticketStore.page);
const pageSize = computed(() => ticketStore.pageSize);
const total = computed(() => ticketStore.total);
const unreadCount = computed(() => ticketStore.unreadCount);

// Local state
const statusFilter = ref<number | undefined>(undefined);
const showCreateModal = ref(false);
const showConversationModal = ref(false);
const replyMessage = ref('');
const createFormRef = ref<FormInst | null>(null);

const createForm = ref({
  subject: '',
  level: 1,
  message: '',
});

const createRules: FormRules = {
  subject: [
    { required: true, message: 'Please enter a subject', trigger: 'blur' },
    { min: 5, message: 'Subject must be at least 5 characters', trigger: 'blur' },
  ],
  level: [{ required: true, message: 'Please select a priority', trigger: 'change' }],
  message: [
    { required: true, message: 'Please enter a message', trigger: 'blur' },
    { min: 10, message: 'Message must be at least 10 characters', trigger: 'blur' },
  ],
};

const priorityOptions = [
  { label: 'Low', value: 0 },
  { label: 'Normal', value: 1 },
  { label: 'High', value: 2 },
];

// Table columns
const columns: DataTableColumns<Ticket> = [
  {
    title: 'ID',
    key: 'id',
    width: 80,
  },
  {
    title: 'Subject',
    key: 'subject',
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: 'Priority',
    key: 'level',
    width: 100,
    render: (row) => {
      const levelMap = {
        0: { label: 'Low', type: 'default' },
        1: { label: 'Normal', type: 'info' },
        2: { label: 'High', type: 'error' },
      };
      const level = levelMap[row.level as keyof typeof levelMap] || levelMap[1];
      return h(NTag, { type: level.type as any, size: 'small' }, { default: () => level.label });
    },
  },
  {
    title: 'Status',
    key: 'status',
    width: 100,
    render: (row) => {
      const statusMap = {
        0: { label: 'Open', type: 'success' },
        1: { label: 'Closed', type: 'default' },
      };
      const status = statusMap[row.status as keyof typeof statusMap] || statusMap[0];
      return h(NTag, { type: status.type as any, size: 'small' }, { default: () => status.label });
    },
  },
  {
    title: 'Reply Status',
    key: 'reply_status',
    width: 120,
    render: (row) => {
      if (row.status === 1) return '-';
      const replyMap = {
        0: { label: 'Pending', type: 'warning' },
        1: { label: 'Replied', type: 'success' },
      };
      const reply = replyMap[row.reply_status as keyof typeof replyMap] || replyMap[0];
      return h(NTag, { type: reply.type as any, size: 'small' }, { default: () => reply.label });
    },
  },
  {
    title: 'Created',
    key: 'created_at',
    width: 180,
    render: (row) => formatDate(row.created_at),
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 100,
    render: (row) =>
      h(
        NButton,
        {
          size: 'small',
          onClick: () => handleViewTicket(row.id),
        },
        {
          default: () => 'View',
          icon: () => h(NIcon, { component: ChatbubbleEllipsesOutline }),
        }
      ),
  },
];

// Methods
function rowProps(row: Ticket) {
  return {
    style: 'cursor: pointer;',
    onClick: () => handleViewTicket(row.id),
  };
}

function handleFilterChange() {
  ticketStore.setStatusFilter(statusFilter.value);
  ticketStore.fetchTickets(1);
}

function handlePageChange(newPage: number) {
  ticketStore.fetchTickets(newPage);
}

async function handleCreateTicket() {
  try {
    await createFormRef.value?.validate();
    await ticketStore.createTicket(createForm.value);
    message.success('Ticket created successfully');
    showCreateModal.value = false;
    createForm.value = {
      subject: '',
      level: 1,
      message: '',
    };
  } catch (err: any) {
    if (err.message) {
      message.error(err.message);
    }
  }
}

async function handleViewTicket(id: number) {
  try {
    await ticketStore.fetchTicketById(id);
    showConversationModal.value = true;
    replyMessage.value = '';
  } catch (err: any) {
    message.error(err.message || 'Failed to load ticket');
  }
}

async function handleReply() {
  if (!replyMessage.value.trim()) {
    message.warning('Please enter a reply message');
    return;
  }

  if (!currentTicket.value) return;

  try {
    await ticketStore.replyToTicket(currentTicket.value.id, replyMessage.value);
    message.success('Reply sent successfully');
    replyMessage.value = '';
  } catch (err: any) {
    message.error(err.message || 'Failed to send reply');
  }
}

async function handleCloseTicket() {
  if (!currentTicket.value) return;

  try {
    await ticketStore.closeTicket(currentTicket.value.id);
    message.success('Ticket closed successfully');
    showConversationModal.value = false;
  } catch (err: any) {
    message.error(err.message || 'Failed to close ticket');
  }
}

function handleConversationClose() {
  ticketStore.clearCurrentTicket();
}

// Lifecycle
onMounted(async () => {
  try {
    await ticketStore.fetchTickets();
  } catch (err: any) {
    message.error(err.message || 'Failed to load tickets');
  }
});
</script>
