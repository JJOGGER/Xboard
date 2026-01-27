/**
 * Plan Types
 * Defines subscription plan data structures
 */

export interface Plan {
  id: number;
  name: string;
  content: string;
  month_price: number;
  quarter_price: number;
  half_year_price: number;
  year_price: number;
  two_year_price: number;
  three_year_price: number;
  onetime_price: number;
  reset_price: number;
  transfer_enable: number;
  speed_limit: number | null;
  device_limit: number | null;
  group_id: number[];
  show: number;
  sort: number;
  created_at: string;
  updated_at: string;
}

export interface PlanPricing {
  month?: number;
  quarter?: number;
  half_year?: number;
  year?: number;
  two_year?: number;
  three_year?: number;
  onetime?: number;
  reset?: number;
}
