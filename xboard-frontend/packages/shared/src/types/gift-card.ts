/**
 * Gift Card Types
 * Defines gift card template and code data structures
 */

export interface GiftCardTemplate {
  id: number;
  name: string;
  type: number; // 1: balance, 2: traffic
  amount: number;
  validity_period: number | null;
  created_at: string;
  updated_at: string;
}

export interface GiftCardCode {
  id: number;
  template_id: number;
  code: string;
  status: number; // 0: unused, 1: used
  user_id: number | null;
  used_at: string | null;
  created_at: string;
  updated_at: string;
  template?: GiftCardTemplate;
}

export enum GiftCardType {
  Balance = 1,
  Traffic = 2,
}

export enum GiftCardStatus {
  Unused = 0,
  Used = 1,
}
