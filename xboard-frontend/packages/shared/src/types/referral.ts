/**
 * Referral Types
 * Defines referral and commission-related data structures
 */

export interface CommissionLog {
  id: number;
  user_id: number;
  invite_user_id: number;
  trade_no: string;
  commission_balance: number;
  commission_status: number; // 0: pending, 1: confirmed, 2: paid
  created_at: string;
  updated_at: string;
  invite_user?: {
    id: number;
    email: string;
  };
}

export interface ReferralStats {
  commission_balance: number;
  commission_pending: number;
  commission_paid: number;
  invite_count: number;
  commission_rate: number;
}

export interface InviteCode {
  id: number;
  user_id: number;
  code: string;
  status: number; // 0: unused, 1: used
  pv: number; // Page views
  created_at: string;
  updated_at: string;
}

export interface ReferredUser {
  id: number;
  email: string;
  created_at: string;
  commission_balance: number;
}
