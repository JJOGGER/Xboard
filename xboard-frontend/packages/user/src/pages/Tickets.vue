<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 dark:text-white">
            {{ t('tickets.title') }}
          </h1>
          <p class="text-slate-600 dark:text-slate-400 mt-2">
            {{ t('tickets.subtitle') }}
          </p>
        </div>

        <button
          @click="router.push({ name: 'TicketCreate' })"
          class="px-6 py-3 rounded-xl font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-all"
        >
          {{ t('tickets.actions.new') }}
        </button>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 mb-4">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <button
              class="px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
              :class="statusFilter === undefined
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700/30'"
              @click="setFilter(undefined)"
            >
              {{ t('tickets.filters.all') }}
            </button>
            <button
              class="px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
              :class="statusFilter === 0
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700/30'"
              @click="setFilter(0)"
            >
              {{ t('tickets.filters.open') }}
            </button>
            <button
              class="px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
              :class="statusFilter === 1
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700/30'"
              @click="setFilter(1)"
            >
              {{ t('tickets.filters.closed') }}
            </button>
          </div>

          <div v-if="unreadCount > 0" class="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {{ t('tickets.unread') }}：{{ unreadCount }}
          </div>
        </div>
      </div>

      <div v-if="loading" class="text-center py-20">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
          <svg class="w-8 h-8 text-slate-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v2m0 12v2m8-8h-2M6 12H4m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414m0-11.314L7.05 7.05m9.9 9.9l1.414 1.414" />
          </svg>
        </div>
        <p class="text-slate-600 dark:text-slate-400">{{ t('tickets.loading') }}</p>
      </div>

      <div v-else-if="error" class="text-center py-20">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
          <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-slate-600 dark:text-slate-400">{{ t('tickets.error') }}</p>
      </div>

      <div v-else-if="tickets.length > 0" class="space-y-4">
        <div
          v-for="ticket in tickets"
          :key="ticket.id"
          class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 cursor-pointer transition-transform hover:scale-[1.01]"
          @click="goToDetail(ticket.id)"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="text-lg font-semibold text-slate-900 dark:text-white truncate">
                {{ ticket.subject }}
              </div>
              <div class="mt-2 text-sm text-slate-600 dark:text-slate-400">
                #{{ ticket.id }}
              </div>
            </div>

            <div class="flex flex-col items-end gap-2 flex-shrink-0">
              <span
                :class="[
                  'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
                  ticket.status === 0
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200',
                ]"
              >
                {{ ticket.status === 0 ? t('tickets.status.open') : t('tickets.status.closed') }}
              </span>
              <span
                v-if="ticket.status === 0"
                :class="[
                  'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
                  ticket.reply_status === 1
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
                ]"
              >
                {{ ticket.reply_status === 1 ? t('tickets.replyStatus.replied') : t('tickets.replyStatus.pending') }}
              </span>
            </div>
          </div>

          <div class="mt-4 text-sm text-slate-600 dark:text-slate-400">
            {{ t('tickets.fields.createdAt') }}：{{ formatDateSafe(ticket.created_at) }}
          </div>
        </div>
      </div>

      <div v-else class="text-center py-20">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
          <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h6m-6 4h10M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p class="text-slate-600 dark:text-slate-400 mb-4">{{ t('tickets.noTickets') }}</p>
        <button
          @click="router.push({ name: 'TicketCreate' })"
          class="px-6 py-3 rounded-xl font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-all"
        >
          {{ t('tickets.actions.new') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useTicketStore } from '../stores/ticket';
import dayjs from 'dayjs';

const { t } = useI18n();
const router = useRouter();
const ticketStore = useTicketStore();

// Computed properties from store
const tickets = computed(() => ticketStore.tickets);
const loading = computed(() => ticketStore.loading);
const error = computed(() => ticketStore.error);
const unreadCount = computed(() => ticketStore.unreadCount);

// Local state
const statusFilter = ref<number | undefined>(undefined);
function setFilter(val: number | undefined) {
  statusFilter.value = val;
  ticketStore.setStatusFilter(val);
  ticketStore.fetchTickets(1);
}

function goToDetail(id: number) {
  router.push({ name: 'TicketDetail', params: { id: String(id) } });
}

function formatDateSafe(val: any): string {
  if (!val) return '-';
  if (typeof val === 'number') return dayjs.unix(val).format('YYYY-MM-DD HH:mm');
  const n = Number(val);
  if (Number.isFinite(n) && String(val).trim() !== '') {
    return n < 2_000_000_000 ? dayjs.unix(n).format('YYYY-MM-DD HH:mm') : dayjs(n).format('YYYY-MM-DD HH:mm');
  }
  return dayjs(val).format('YYYY-MM-DD HH:mm');
}

// Lifecycle
onMounted(async () => {
  try {
    await ticketStore.fetchTickets();
  } catch (err: any) {
    // error stored in store
  }
});
</script>
