<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto">
      <div class="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 dark:text-white">
            {{ t('tickets.detail.title') }}
          </h1>
          <p class="text-slate-600 dark:text-slate-400 mt-2">
            #{{ ticketId }} - {{ ticket?.subject || '' }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="router.back()"
            class="px-4 py-2 rounded-xl font-semibold bg-white/70 hover:bg-white text-slate-700 border border-slate-200 shadow-sm transition-all dark:bg-slate-800/70 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
          >
            {{ t('common.back') }}
          </button>

          <button
            v-if="ticket && ticket.status === 0"
            @click="close"
            class="px-4 py-2 rounded-xl font-semibold bg-white/70 hover:bg-white text-slate-700 border border-slate-200 shadow-sm transition-all dark:bg-slate-800/70 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
            :disabled="loading"
          >
            {{ t('tickets.actions.close') }}
          </button>
        </div>
      </div>

      <div v-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-4">
        <div class="text-red-700 dark:text-red-300 text-sm">{{ error }}</div>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="text-lg font-semibold text-slate-900 dark:text-white truncate">
              {{ ticket?.subject || '-' }}
            </div>
            <div class="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {{ t('tickets.fields.createdAt') }}：{{ formatDateSafe(ticket?.created_at) }}
            </div>
            <div class="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {{ t('tickets.fields.updatedAt') }}：{{ formatDateSafe(ticket?.updated_at) }}
            </div>
          </div>

          <span
            v-if="ticket"
            :class="[
              'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0',
              ticket.status === 0
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200',
            ]"
          >
            {{ ticket.status === 0 ? t('tickets.status.open') : t('tickets.status.closed') }}
          </span>
        </div>
      </div>

      <div class="mt-6 space-y-4">
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="[
            'rounded-2xl border p-4',
            msg.is_me
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/40 ml-10 shadow-sm'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 mr-10 shadow-sm',
          ]"
        >
          <div class="flex items-center justify-between">
            <div class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ msg.is_me ? t('tickets.detail.me') : t('tickets.detail.support') }}
            </div>
            <div class="text-xs text-slate-500 dark:text-slate-400">
              {{ formatDateSafe(msg.created_at) }}
            </div>
          </div>
          <div class="mt-2 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
            {{ msg.message }}
          </div>
        </div>
      </div>

      <div v-if="ticket?.status === 0" class="mt-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
        <div class="text-base font-semibold text-slate-900 dark:text-white mb-3">
          {{ t('tickets.detail.replyTitle') }}
        </div>

        <div v-if="!canReply" class="mb-4">
          <div class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
            {{ t('tickets.detail.waitSupportReply') }}
          </div>
        </div>

        <textarea
          v-model="replyText"
          :rows="5"
          :placeholder="t('tickets.detail.replyPlaceholder')"
          :disabled="!canReply || loading"
          class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
        />
        <div class="flex justify-end mt-4">
          <button
            type="button"
            class="px-5 py-3 rounded-xl font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-all disabled:opacity-60"
            :disabled="loading || !canReply"
            @click="reply"
          >
            {{ t('tickets.actions.reply') }}
          </button>
        </div>
      </div>

      <div v-else class="mt-6 text-center">
        <div class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200">
          {{ t('tickets.detail.closedNotice') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import dayjs from 'dayjs';
import { useTicketStore } from '../stores/ticket';
import type { TicketMessage } from '@xboard/shared';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const message = useMessage();
const ticketStore = useTicketStore();

const ticketId = computed(() => Number(route.params.id));
const loading = computed(() => ticketStore.loading);
const error = computed(() => ticketStore.error);
const ticket = computed(() => ticketStore.currentTicket);

const canReply = computed(() => {
  // Backend behavior: user may be blocked until support replies.
  // reply_status: 0 pending, 1 replied
  return ticket.value?.status === 0 && ticket.value?.reply_status === 1;
});

const messages = computed(() => (ticket.value?.message || []) as TicketMessage[]);

const replyText = ref('');
let pollTimer: any = null;

function formatDateSafe(val: any): string {
  if (!val) return '-';
  if (typeof val === 'number') return dayjs.unix(val).format('YYYY-MM-DD HH:mm');
  const n = Number(val);
  if (Number.isFinite(n) && String(val).trim() !== '') {
    return n < 2_000_000_000 ? dayjs.unix(n).format('YYYY-MM-DD HH:mm') : dayjs(n).format('YYYY-MM-DD HH:mm');
  }
  return dayjs(val).format('YYYY-MM-DD HH:mm');
}

async function load() {
  if (!Number.isFinite(ticketId.value)) return;
  await ticketStore.fetchTicketById(ticketId.value);
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(async () => {
    if (!ticket.value) return;
    if (ticket.value.status !== 0) {
      stopPolling();
      return;
    }
    try {
      await load();
    } catch {
      // ignore polling errors
    }
  }, 10_000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function reply() {
  const text = replyText.value.trim();
  if (!text) {
    message.warning(String(t('tickets.validation.replyRequired')));
    return;
  }
  if (!canReply.value) {
    message.warning(String(t('tickets.detail.waitSupportReply')));
    return;
  }
  try {
    await ticketStore.replyToTicket(ticketId.value, text);
    replyText.value = '';
    message.success(String(t('tickets.reply.success')));
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (msg.includes('请等待')) {
      message.warning(msg);
      return;
    }
    message.error(msg || String(t('tickets.reply.error')));
  }
}

async function close() {
  try {
    await ticketStore.closeTicket(ticketId.value);
    message.success(String(t('tickets.close.success')));
    stopPolling();
    await load();
  } catch (err: any) {
    message.error(err?.message || String(t('tickets.close.error')));
  }
}

onMounted(async () => {
  try {
    await load();
    if (ticket.value?.status === 0) startPolling();
  } catch (err: any) {
    message.error(err?.message || String(t('tickets.detail.loadError')));
  }
});

onBeforeUnmount(() => {
  stopPolling();
  ticketStore.clearCurrentTicket();
});
</script>
