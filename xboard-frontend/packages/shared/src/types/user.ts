/**
 * User Types
 * Defines user-related data structures
 */

export interface User {
  id: number;
  email: string;
  balance: number;
  commission_balance: number;
  plan_id: number | null;
  expired_at: number | null;
  u: number; // Upload traffic
  d: number; // Download traffic
  transfer_enable: number; // Total traffic quota
  banned: number;
  is_admin: boolean;
  is_staff: boolean;
  invite_user_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface AuthUser extends User {
  // Additional fields specific to authenticated user
}

export interface UserFilters {
  search?: string;
  plan_id?: number;
  banned?: number;
  date_start?: string;
  date_end?: string;
}

export interface GenerateUserData {
  email_prefix: string;
  email_suffix: string;
  plan_id: number;
  expired_at: number;
  transfer_enable: number;
  count: number;
}
