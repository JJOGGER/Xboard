/**
 * Order Types
 * Defines order and payment data structures
 */

import type { User } from './user';
import type { Plan } from './plan';

export interface Order {
  id: number;
  user_id: number;
  plan_id: number;
  period: string;
  trade_no: string;
  callback_no: string | null;
  total_amount: number;
  discount_amount: number;
  balance_amount: number;
  surplus_amount: number;
  refund_amount: number;
  status: number; // 0: pending, 1: processing, 2: cancelled, 3: completed, 4: discounted
  commission_status: number;
  commission_balance: number;
  actual_commission_balance: number;
  surplus_order_ids: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
  plan?: Plan;
}

export enum OrderStatus {
  Pending = 0,
  Processing = 1,
  Cancelled = 2,
  Completed = 3,
  Discounted = 4,
}

export interface OrderFilters {
  search?: string;
  status?: number;
  date_start?: string;
  date_end?: string;
  user_id?: number;
  plan_id?: number;
}
