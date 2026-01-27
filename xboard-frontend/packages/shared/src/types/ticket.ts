/**
 * Ticket Types
 * Defines support ticket data structures
 */

import type { User } from './user';

export interface Ticket {
  id: number;
  user_id: number;
  subject: string;
  level: number;
  status: number; // 0: open, 1: closed
  reply_status: number; // 0: pending, 1: replied
  created_at: string;
  updated_at: string;
  user?: User;
  message?: TicketMessage[];
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  user_id: number;
  message: string;
  is_me: boolean;
  created_at: string;
  updated_at: string;
}

export enum TicketStatus {
  Open = 0,
  Closed = 1,
}

export enum TicketReplyStatus {
  Pending = 0,
  Replied = 1,
}
