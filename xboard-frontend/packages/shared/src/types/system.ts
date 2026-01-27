/**
 * System Monitoring Type Definitions
 */

export interface SystemStatus {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  uptime: number;
  php_version: string;
  laravel_version: string;
}

export interface QueueStats {
  pending: number;
  processing: number;
  failed: number;
  completed_today: number;
}

export interface QueueWorkload {
  queue_name: string;
  jobs_count: number;
  avg_processing_time: number;
}

export interface SystemLog {
  id: number;
  level: 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';
  message: string;
  context?: Record<string, any>;
  created_at: string;
}

export interface LogFilters {
  level?: string;
  date_start?: string;
  date_end?: string;
  search?: string;
}

export interface FailedJob {
  id: number;
  uuid: string;
  connection: string;
  queue: string;
  payload: any;
  exception: string;
  failed_at: string;
}

export interface TrafficResetLog {
  id: number;
  user_id: number;
  reset_traffic: number;
  reset_method: string;
  created_at: string;
  user?: {
    id: number;
    email: string;
  };
}

export interface TrafficResetStats {
  total_resets: number;
  total_traffic_reset: number;
  resets_this_month: number;
  traffic_reset_this_month: number;
}

export interface TrafficResetFilters {
  user_id?: number;
  date_start?: string;
  date_end?: string;
}

export interface ManualResetData {
  user_id: number;
  reset_traffic?: number;
}
