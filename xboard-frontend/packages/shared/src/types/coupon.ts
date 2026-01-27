/**
 * Coupon Types
 * Defines coupon and discount data structures
 */

export interface Coupon {
  id: number;
  code: string;
  name: string;
  type: number; // 1: percentage, 2: fixed amount
  value: number;
  limit_use: number | null;
  limit_use_with_user: number | null;
  limit_plan_ids: number[] | null;
  started_at: number;
  ended_at: number;
  show: number;
  created_at: string;
  updated_at: string;
}

export enum CouponType {
  Percentage = 1,
  FixedAmount = 2,
}
