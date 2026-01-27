/**
 * Statistics Types
 * Defines dashboard and analytics data structures
 */

export interface DashboardStats {
  month_income: number;
  month_register_total: number;
  ticket_pending_total: number;
  commission_pending_total: number;
  day_income: number;
  last_month_income: number;
  commission_month_payout: number;
  commission_last_month_payout: number;
}

export interface OrderStats {
  date: string;
  total: number;
  commission_total: number;
}

export interface ServerRank {
  server_id: number;
  server_name: string;
  u: number;
  d: number;
  total: number;
}

export interface UserStats {
  total_users: number;
  active_users: number;
  new_users_today: number;
  new_users_month: number;
}
