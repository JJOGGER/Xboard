/**
 * Configuration Type Definitions
 */

export interface SystemConfig {
  // Site settings
  site_name?: string;
  site_url?: string;
  site_description?: string;
  logo_url?: string;
  
  // Email settings
  email_host?: string;
  email_port?: number;
  email_username?: string;
  email_password?: string;
  email_encryption?: 'tls' | 'ssl' | null;
  email_from_address?: string;
  email_from_name?: string;
  
  // Telegram settings
  telegram_bot_token?: string;
  telegram_webhook_url?: string;
  telegram_chat_id?: string;
  telegram_discuss_link?: string;
  
  // Subscription settings
  subscribe_url?: string;
  subscribe_domain?: string;
  plan_change_enable?: boolean;
  reset_traffic_method?: number;
  surplus_enable?: boolean;
  new_order_event_id?: number;
  renew_order_event_id?: number;
  change_order_event_id?: number;
  
  // Commission settings
  invite_force?: boolean;
  invite_commission_first_time_enable?: boolean;
  invite_commission_cycle_enable?: boolean;
  invite_commission_cycle_limit?: number;
  invite_commission_first_time_rate?: number;
  invite_commission_cycle_rate?: number;
  invite_gen_num?: number;
  invite_never_expire?: boolean;
  commission_first_time_enable?: boolean;
  commission_auto_check_enable?: boolean;
  commission_withdraw_limit?: number;
  commission_withdraw_method?: string[];
  
  // Security settings
  register_limit_by_ip_enable?: boolean;
  register_limit_count?: number;
  register_limit_expire?: number;
  email_verify_enable?: boolean;
  email_gmail_limit_enable?: boolean;
  recaptcha_enable?: boolean;
  recaptcha_key?: string;
  recaptcha_site_key?: string;
  password_limit_enable?: boolean;
  password_limit_count?: number;
  password_limit_expire?: number;
  
  // Frontend settings
  frontend_theme?: string;
  frontend_theme_sidebar?: string;
  frontend_theme_header?: string;
  frontend_theme_color?: string;
  frontend_background_url?: string;
  
  // Other settings
  app_name?: string;
  app_url?: string;
  subscribe_url_prefix?: string;
  try_out_plan_id?: number;
  try_out_hour?: number;
  stop_proxy_with_traffic_limit?: boolean;
  device_limit_mode?: string;
  
  [key: string]: any;
}

export interface ConfigCategory {
  key: string;
  label: string;
  icon: string;
  fields: ConfigField[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'password' | 'email' | 'url' | 'textarea' | 'select' | 'switch' | 'multiselect';
  placeholder?: string;
  description?: string;
  required?: boolean;
  options?: { label: string; value: any }[];
  validation?: any;
  defaultValue?: any;
}

export interface TestEmailData {
  email: string;
}

export interface TestEmailResponse {
  success: boolean;
  message: string;
}
