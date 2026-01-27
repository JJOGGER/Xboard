/**
 * Payment Types
 * Defines payment method data structures
 */

export interface PaymentMethod {
  id: number;
  name: string;
  payment: string;
  icon: string | null;
  config: any;
  notify_domain: string | null;
  handling_fee_fixed: number | null;
  handling_fee_percent: number | null;
  show: number;
  sort: number;
  created_at: string;
  updated_at: string;
}
