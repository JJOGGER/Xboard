<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('tickets.conversation.title')"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="ticketStore.loading" class="conversation-container">
      <!-- Ticket Info -->
      <div v-if="ticketStore.currentTicket" class="ticket-info">
        <div class="info-row">
          <span class="label">{{ t('tickets.conversation.subject') }}:</span>
          <span class="value">{{ ticketStore.currentTicket.subject }}</span>
        </div>
        <div class="info-row">
          <span class="label">{{ t('tickets.conversation.user') }}:</span>
          <span class="value">{{ ticketStore.currentTicket.user?.email || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="label">{{ t('tickets.conversation.status') }}:</span>
          <el-tag :type="ticketStore.currentTicket.status === 0 ? 'success' : 'info'">
            {{ ticketStore.currentTicket.status === 0 ? t('tickets.status.open') : t('tickets.status.closed') }}
          </el-tag>
        </div>
        <div class="info-row">
          <span class="label">{{ t('tickets.conversation.createdAt') }}:</span>
          <span class="value">{{ formatDate(ticketStore.currentTicket.created_at) }}</span>
        </div>
      </div>

      <el-divider />

      <!-- Messages -->
      <div class="messages-container">
        <div
          v-for="message in ticketStore.currentTicket?.message || []"
          :key="message.id"
          :class="['message-item', message.is_me ? 'message-admin' : 'message-user']"
        >
          <div class="message-header">
            <span class="message-author">
              {{ message.is_me ? t('tickets.conversation.admin') : t('tickets.conversation.user') }}
            </span>
            <span class="message-time">{{ formatDate(message.created_at) }}</span>
          </div>
          <div class="message-content" v-html="sanitizeHtml(message.message)"></div>
        </div>

        <el-empty
          v-if="!ticketStore.currentTicket?.message?.length"
          :description="t('tickets.conversation.noMessages')"
        />
      </div>

      <!-- Reply Form -->
      <div v-if="ticketStore.currentTicket?.status === 0" class="reply-form">
        <el-divider />
        <el-form :model="replyForm" @submit.prevent="handleReply">
          <el-form-item :label="t('tickets.conversation.reply')">
            <quill-editor
              v-model:content="replyForm.message"
              content-type="html"
              :placeholder="t('tickets.conversation.replyPlaceholder')"
              :toolbar="editorToolbar"
              style="height: 200px"
            />
          </el-form-item>
        </el-form>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
        <el-button
          v-if="ticketStore.currentTicket?.status === 0"
          type="danger"
          @click="handleCloseTicket"
        >
          {{ t('tickets.actions.close') }}
        </el-button>
        <el-button
          v-if="ticketStore.currentTicket?.status === 0"
          type="primary"
          :loading="submitting"
          @click="handleReply"
        >
          {{ t('tickets.conversation.send') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import DOMPurify from 'dompurify';
import { useTicketStore } from '@/stores/ticket';
import { formatDate } from '@xboard/shared/utils';

interface Props {
  visible: boolean;
  ticketId: number | null;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'closed'): void;
  (e: 'replied'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useI18n();
const ticketStore = useTicketStore();

// Dialog visibility
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

// Reply form
const replyForm = reactive({
  message: '',
});

const submitting = ref(false);

// Quill editor toolbar
const editorToolbar = [
  ['bold', 'italic', 'underline', 'strike'],
  ['blockquote', 'code-block'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ color: [] }, { background: [] }],
  ['link'],
  ['clean'],
];

// Sanitize HTML to prevent XSS
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}

// Handle reply
async function handleReply() {
  if (!replyForm.message.trim()) {
    ElMessage.warning(t('tickets.conversation.emptyMessage'));
    return;
  }

  if (!props.ticketId) return;

  submitting.value = true;
  try {
    await ticketStore.replyToTicket({
      ticket_id: props.ticketId,
      message: replyForm.message,
    });

    ElMessage.success(t('tickets.messages.replySuccess'));
    replyForm.message = '';
    emit('replied');
  } catch (error) {
    ElMessage.error(t('tickets.messages.replyError'));
  } finally {
    submitting.value = false;
  }
}

// Handle close ticket
async function handleCloseTicket() {
  if (!props.ticketId) return;

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

    await ticketStore.closeTicket(props.ticketId);
    ElMessage.success(t('tickets.messages.closeSuccess'));
    emit('closed');
    handleClose();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(t('tickets.messages.closeError'));
    }
  }
}

// Handle close dialog
function handleClose() {
  dialogVisible.value = false;
  replyForm.message = '';
  ticketStore.clearCurrentTicket();
}

// Watch ticket ID changes
watch(
  () => props.ticketId,
  async (newId) => {
    if (newId && props.visible) {
      try {
        await ticketStore.fetchTicketById(newId);
      } catch (error) {
        ElMessage.error(t('tickets.messages.fetchError'));
      }
    }
  },
  { immediate: true }
);
</script>

<style scoped lang="scss">
.conversation-container {
  max-height: 600px;
  overflow-y: auto;
}

.ticket-info {
  background-color: var(--el-fill-color-light);
  padding: 16px;
  border-radius: 4px;

  .info-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }

    .label {
      font-weight: 600;
      margin-right: 8px;
      min-width: 100px;
      color: var(--el-text-color-secondary);
    }

    .value {
      color: var(--el-text-color-primary);
    }
  }
}

.messages-container {
  min-height: 300px;
  max-height: 400px;
  overflow-y: auto;
  padding: 16px 0;
}

.message-item {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;

  &.message-user {
    background-color: var(--el-fill-color-light);
    margin-right: 60px;
  }

  &.message-admin {
    background-color: var(--el-color-primary-light-9);
    margin-left: 60px;
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;

    .message-author {
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .message-time {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  .message-content {
    color: var(--el-text-color-regular);
    line-height: 1.6;
    word-wrap: break-word;

    :deep(p) {
      margin: 0 0 8px 0;

      &:last-child {
        margin-bottom: 0;
      }
    }

    :deep(pre) {
      background-color: var(--el-fill-color-darker);
      padding: 8px;
      border-radius: 4px;
      overflow-x: auto;
    }

    :deep(code) {
      background-color: var(--el-fill-color-darker);
      padding: 2px 4px;
      border-radius: 2px;
      font-family: monospace;
    }
  }
}

.reply-form {
  margin-top: 16px;

  :deep(.ql-container) {
    min-height: 200px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
