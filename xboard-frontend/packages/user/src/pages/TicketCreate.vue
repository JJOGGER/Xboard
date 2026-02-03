<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-3xl mx-auto">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 dark:text-white">
            {{ t('tickets.create.title') }}
          </h1>
          <p class="text-slate-600 dark:text-slate-400 mt-2">
            {{ t('tickets.create.subtitle') }}
          </p>
        </div>
        <button
          @click="router.back()"
          class="px-4 py-2 rounded-xl font-semibold bg-white/70 hover:bg-white text-slate-700 border border-slate-200 shadow-sm transition-all dark:bg-slate-800/70 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
        >
          {{ t('common.back') }}
        </button>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
        <div class="space-y-5">
          <div>
            <div class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              {{ t('tickets.fields.subject') }}
            </div>
            <input
              v-model="form.subject"
              type="text"
              :placeholder="t('tickets.create.subjectPlaceholder')"
              class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <div class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              {{ t('tickets.fields.level') }}
            </div>
            <select
              v-model.number="form.level"
              class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option v-for="opt in levelOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div>
            <div class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              {{ t('tickets.fields.message') }}
            </div>
            <textarea
              v-model="form.message"
              :placeholder="t('tickets.create.messagePlaceholder')"
              rows="8"
              class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div class="flex justify-end gap-3">
            <button
              type="button"
              @click="router.back()"
              class="px-5 py-3 rounded-xl font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all dark:bg-slate-800 dark:hover:bg-slate-700/30 dark:text-slate-200 dark:border-slate-700"
              :disabled="loading"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="button"
              @click="submit"
              class="px-5 py-3 rounded-xl font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-all disabled:opacity-60"
              :disabled="loading"
            >
              {{ t('tickets.create.submit') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import { useTicketStore } from '../stores/ticket';

const { t } = useI18n();
const router = useRouter();
const message = useMessage();
const ticketStore = useTicketStore();

const loading = computed(() => ticketStore.loading);

const form = ref({
  subject: '',
  level: 1,
  message: '',
});

const levelOptions = [
  { label: String(t('tickets.level.low')), value: 0 },
  { label: String(t('tickets.level.normal')), value: 1 },
  { label: String(t('tickets.level.high')), value: 2 },
];

async function submit() {
  try {
    const subject = form.value.subject.trim();
    const msg = form.value.message.trim();
    if (!subject) {
      message.warning(String(t('tickets.validation.subjectRequired')));
      return;
    }
    if (!Number.isFinite(Number(form.value.level))) {
      message.warning(String(t('tickets.validation.levelRequired')));
      return;
    }
    if (!msg) {
      message.warning(String(t('tickets.validation.messageRequired')));
      return;
    }
    const created = await ticketStore.createTicket(form.value);
    message.success(String(t('tickets.create.success')));
    router.replace({ name: 'TicketDetail', params: { id: String(created?.id ?? '') } });
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (msg) message.error(msg);

    // Backend rule: only one open ticket allowed
    if (msg.includes('未关闭')) {
      try {
        ticketStore.setStatusFilter(0);
        await ticketStore.fetchTickets(1);
        const first = ticketStore.tickets?.[0];
        if (first?.id) {
          router.replace({ name: 'TicketDetail', params: { id: String(first.id) } });
        } else {
          router.replace({ name: 'Tickets' });
        }
      } catch {
        router.replace({ name: 'Tickets' });
      }
    }
  }
}
</script>
