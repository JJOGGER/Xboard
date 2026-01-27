/**
 * Traffic Types
 * Defines traffic log and usage data structures
 */

export interface TrafficLog {
  id: number;
  user_id: number;
  u: number;
  d: number;
  server_rate: number;
  server_id: number;
  record_type: string;
  record_at: number;
  created_at: string;
  updated_at: string;
}

export interface TrafficUsage {
  upload: number;
  download: number;
  total: number;
  remaining: number;
  quota: number;
}

export interface TrafficResetLog {
  id: number;
  user_id: number;
  before_traffic: number;
  after_traffic: number;
  reset_at: string;
  created_at: string;
}

export interface TrafficStats {
  today: number;
  yesterday: number;
  month: number;
  last_month: number;
}
