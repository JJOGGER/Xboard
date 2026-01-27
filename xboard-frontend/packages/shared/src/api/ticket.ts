/**
 * Ticket API Service
 * Handles all ticket-related API calls
 */

import type { ApiResponse, PaginatedResponse } from '../types';
import type { Ticket, TicketMessage } from '../types/ticket';
import apiClient from './client';

export interface TicketFilters {
  status?: number;
  search?: string;
  date_start?: string;
  date_end?: string;
}

export const ticketApi = {
  // ========== User Methods ==========
  /**
   * Fetch user tickets
   */
  async getUserTickets(params?: {
    page?: number;
    page_size?: number;
    filters?: TicketFilters;
  }): Promise<ApiResponse<PaginatedResponse<Ticket>>> {
    return apiClient.get('/v1/user/ticket/fetch', {
      params: {
        page: params?.page,
        page_size: params?.page_size,
        ...params?.filters,
      },
    });
  },

  /**
   * Fetch a single user ticket by id
   */
  async getUserTicketById(id: number): Promise<ApiResponse<Ticket>> {
    // backend expects query param id
    return apiClient.get('/v1/user/ticket/fetch', { params: { id } });
  },

  /**
   * Create new ticket (user)
   */
  async createUserTicket(data: {
    subject: string;
    level: number;
    message: string;
  }): Promise<ApiResponse<Ticket>> {
    return apiClient.post('/v1/user/ticket/save', data);
  },

  /**
   * Reply to ticket (user)
   */
  async replyUserTicket(data: {
    id: number;
    message: string;
  }): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v1/user/ticket/reply', data);
  },

  /**
   * Close ticket (user)
   */
  async closeUserTicket(id: number): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v1/user/ticket/close', { id });
  },

  /**
   * Withdraw ticket (user)
   */
  async withdrawUserTicket(id: number): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v1/user/ticket/withdraw', { id });
  },

  // ========== Admin Methods ==========
  /**
   * Fetch paginated tickets with filters (admin)
   */
  async getTickets(params: {
    page?: number;
    page_size?: number;
    filters?: TicketFilters;
  }): Promise<ApiResponse<PaginatedResponse<Ticket>>> {
    return apiClient.get('/v2/ticket/fetch', { 
      params: { ...params, ...params.filters } 
    });
  },

  /**
   * Reply to ticket (admin)
   */
  async replyToTicket(data: {
    id: number;
    message: string;
  }): Promise<ApiResponse<TicketMessage>> {
    return apiClient.post('/v2/ticket/reply', data);
  },

  /**
   * Close ticket (admin)
   */
  async closeTicket(id: number): Promise<ApiResponse<boolean>> {
    return apiClient.post('/v2/ticket/close', { id });
  },

  /**
   * Get unread ticket count (admin)
   */
  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    return apiClient.get('/v2/ticket/unread-count');
  },
};
