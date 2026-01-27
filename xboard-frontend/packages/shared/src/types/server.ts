/**
 * Server Types
 * Defines server node and related data structures
 */

export type ServerType =
  | 'hysteria'
  | 'vless'
  | 'trojan'
  | 'vmess'
  | 'tuic'
  | 'shadowsocks'
  | 'anytls'
  | 'socks'
  | 'naive'
  | 'http'
  | 'mieru';

export interface ServerNode {
  id: number;
  name: string;
  type: ServerType;
  host: string;
  port: number;
  server_port: number | null;
  group_ids: number[];
  route_ids: number[];
  tags: string[];
  show: boolean;
  allow_insecure: string | null;
  network: string | null;
  parent_id: number | null;
  rate: number;
  rate_time_enable: boolean;
  rate_time_ranges: any[] | null;
  sort: number;
  protocol_settings: any;
  created_at: string;
  updated_at: string;
  // Additional fields from API
  groups?: ServerGroup[];
  parent?: ServerNode | null;
  // Runtime stats
  last_check_at?: number;
  last_push_at?: number;
  online?: number;
  is_online?: number;
  available_status?: string;
  u?: number;
  d?: number;
  total?: number;
}

export interface ServerGroup {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  users_count?: number;
  server_count?: number;
}

export interface ServerRoute {
  id: number;
  remarks: string;
  match: string[];
  action: string;
  action_value: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServerStat {
  server_id: number;
  server_name: string;
  u: number;
  d: number;
  total: number;
}

export interface ServerFormData {
  id?: number;
  name: string;
  type: ServerType;
  host: string;
  port: number;
  server_port?: number | null;
  group_ids: number[];
  route_ids: number[];
  tags: string[];
  show: boolean;
  parent_id: number | null;
  rate: number;
  rate_time_enable: boolean;
  rate_time_ranges: any[] | null;
  sort: number;
  protocol_settings: any;
}

