/**
 * Ticket Store (User Frontend)
 * Manages support ticket state for end users
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ticketApi } from '@xboard/shared';
import type { Ticket } from '@xboard/shared';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export const useTicketStore = defineStore('ticket', () => {
  // State
  const tickets = ref<Ticket[]>([]);
  const currentTicket = ref<Ticket | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Pagination
  const page = ref(1);
  const total = ref(0);
  const pageSize = ref(10);

  // Filters
  const statusFilter = ref<number | undefined>(undefined);

  // Getters
  const openTickets = computed(() => tickets.value.filter((t) => t.status === 0));
  const closedTickets = computed(() => tickets.value.filter((t) => t.status === 1));
  const unreadCount = computed(() => tickets.value.filter((t) => t.reply_status === 1 && t.status === 0).length);

  // Actions
  async function fetchTickets(pageNum = 1) {
    try {
      loading.value = true;
      error.value = null;
      page.value = pageNum;

      const filters: any = {};
      if (statusFilter.value !== undefined) {
        filters.status = statusFilter.value;
      }

      const response = await withTimeout(
        ticketApi.getUserTickets({
          page: pageNum,
          page_size: pageSize.value,
          filters,
        }),
        10_000
      );

      const payload: any = response.data;
      if (Array.isArray(payload)) {
        tickets.value = payload;
        total.value = payload.length;
      } else if (payload && Array.isArray(payload.data)) {
        tickets.value = payload.data;
        total.value = typeof payload.total === 'number' ? payload.total : payload.data.length;
      } else {
        tickets.value = [];
        total.value = 0;
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch tickets';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchTicketById(id: number) {
    try {
      loading.value = true;
      error.value = null;
      const response = await withTimeout(ticketApi.getUserTicketById(id), 10_000);
      currentTicket.value = response.data;
      return response.data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch ticket details';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createTicket(data: { subject: string; level: number; message: string }) {
    try {
      loading.value = true;
      error.value = null;
      const response = await withTimeout(ticketApi.createUserTicket(data), 10_000);
      await fetchTickets(1);
      return response.data;
    } catch (err: any) {
      error.value = err.message || 'Failed to create ticket';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function replyToTicket(ticketId: number, message: string) {
    try {
      loading.value = true;
      error.value = null;
      const response = await withTimeout(
        ticketApi.replyUserTicket({
          id: ticketId,
          message,
        }),
        10_000
      );

      // User reply endpoint returns boolean; refresh ticket details to get latest messages
      await fetchTicketById(ticketId);
      return response.data;
    } catch (err: any) {
      error.value = err.message || 'Failed to reply to ticket';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function closeTicket(id: number) {
    try {
      loading.value = true;
      error.value = null;
      await withTimeout(ticketApi.closeUserTicket(id), 10_000);

      // Update ticket status in list
      const ticket = tickets.value.find((t) => t.id === id);
      if (ticket) {
        ticket.status = 1;
      }

      // Update current ticket if it's the one being closed
      if (currentTicket.value && currentTicket.value.id === id) {
        currentTicket.value.status = 1;
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to close ticket';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function setStatusFilter(status: number | undefined) {
    statusFilter.value = status;
  }

  function clearError() {
    error.value = null;
  }

  function clearCurrentTicket() {
    currentTicket.value = null;
  }

  return {
    // State
    tickets,
    currentTicket,
    loading,
    error,
    page,
    total,
    pageSize,
    statusFilter,

    // Getters
    openTickets,
    closedTickets,
    unreadCount,

    // Actions
    fetchTickets,
    fetchTicketById,
    createTicket,
    replyToTicket,
    closeTicket,
    setStatusFilter,
    clearError,
    clearCurrentTicket,
  };
});
