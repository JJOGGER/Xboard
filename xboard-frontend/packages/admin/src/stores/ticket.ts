/**
 * Ticket Store
 * Manages ticket state and operations
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ticketApi, type TicketFilters } from '@xboard/shared/api';
import type { Ticket } from '@xboard/shared/types';

export const useTicketStore = defineStore('ticket', () => {
  // State
  const tickets = ref<Ticket[]>([]);
  const currentTicket = ref<Ticket | null>(null);
  const total = ref(0);
  const loading = ref(false);
  const unreadCount = ref(0);
  const filters = ref<TicketFilters>({});

  // Getters
  const openTickets = ref<Ticket[]>([]);
  const closedTickets = ref<Ticket[]>([]);
  const pendingReplyTickets = ref<Ticket[]>([]);

  // Actions
  async function fetchTickets(params: {
    page?: number;
    page_size?: number;
    filters?: TicketFilters;
  }) {
    loading.value = true;
    try {
      const response = await ticketApi.getTickets(params);
      tickets.value = response.data.data;
      total.value = response.data.total;
      filters.value = params.filters || {};
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function fetchTicketById(id: number) {
    loading.value = true;
    try {
      const response = await ticketApi.getTicketById(id);
      currentTicket.value = response.data;
      return response.data;
    } catch (error) {
      console.error('Failed to fetch ticket:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function replyToTicket(data: { ticket_id: number; message: string }) {
    try {
      const response = await ticketApi.replyToTicket(data);
      
      // Update current ticket messages
      if (currentTicket.value && currentTicket.value.id === data.ticket_id) {
        if (!currentTicket.value.message) {
          currentTicket.value.message = [];
        }
        currentTicket.value.message.push(response.data);
        currentTicket.value.reply_status = 1; // Mark as replied
      }

      // Update ticket in list
      const ticketIndex = tickets.value.findIndex(t => t.id === data.ticket_id);
      if (ticketIndex !== -1 && tickets.value[ticketIndex]) {
        tickets.value[ticketIndex].reply_status = 1;
      }

      return response.data;
    } catch (error) {
      console.error('Failed to reply to ticket:', error);
      throw error;
    }
  }

  async function closeTicket(id: number) {
    try {
      await ticketApi.closeTicket(id);
      
      // Update current ticket
      if (currentTicket.value && currentTicket.value.id === id) {
        currentTicket.value.status = 1;
      }

      // Update ticket in list
      const ticketIndex = tickets.value.findIndex(t => t.id === id);
      if (ticketIndex !== -1 && tickets.value[ticketIndex]) {
        tickets.value[ticketIndex].status = 1;
      }
    } catch (error) {
      console.error('Failed to close ticket:', error);
      throw error;
    }
  }

  async function fetchUnreadCount() {
    try {
      const response = await ticketApi.getUnreadCount();
      unreadCount.value = response.data.count;
    } catch (error: any) {
      // 如果API未实现（404），静默失败，设置为0
      if (error.status === 404) {
        console.warn('Ticket unread count API not implemented yet');
        unreadCount.value = 0;
        return;
      }
      console.error('Failed to fetch unread count:', error);
    }
  }

  function clearCurrentTicket() {
    currentTicket.value = null;
  }

  return {
    // State
    tickets,
    currentTicket,
    total,
    loading,
    unreadCount,
    filters,

    // Getters
    openTickets,
    closedTickets,
    pendingReplyTickets,

    // Actions
    fetchTickets,
    fetchTicketById,
    replyToTicket,
    closeTicket,
    fetchUnreadCount,
    clearCurrentTicket,
  };
});
