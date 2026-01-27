/**
 * Common/Config API Service
 * Handles public configuration and system settings
 */

import type { ApiResponse } from '../types';
import apiClient from './client';

export interface PublicConfig {
  is_email_verify?: boolean;
  is_invite_force?: boolean;
  email_whitelist_suffix?: string[];
  is_recaptcha?: boolean;
  recaptcha_site_key?: string;
  app_name?: string;
  app_description?: string;
  app_url?: string;
  subscribe_url?: string;
  try_out_plan_id?: number;
  try_out_hour?: number;
  email_gmail_limit_enable?: boolean;
  stop_register?: boolean;
  currency?: string;
  currency_symbol?: string;
  commission_distribution_enable?: boolean;
  commission_distribution_l1?: number;
  commission_distribution_l2?: number;
  commission_distribution_l3?: number;
  commission_withdraw_limit?: number;
  commission_withdraw_method?: string[];
  withdraw_close?: boolean;
  currency_exchange_rate?: number;
  plan_change_enable?: boolean;
  reset_traffic_method?: number;
  surplus_enable?: boolean;
  new_order_event_id?: number;
  renew_order_event_id?: number;
  change_order_event_id?: number;
  stripe_pk?: string;
  frontend_theme?: string;
  frontend_theme_sidebar?: string;
  frontend_theme_header?: string;
  frontend_theme_color?: string;
  frontend_background_url?: string;
  frontend_admin_path?: string;
  secure_path?: string;
  [key: string]: any;
}

export const commApi = {
  /**
   * Get public configuration (guest)
   * Returns system-wide public settings
   */
  async getGuestConfig(): Promise<ApiResponse<PublicConfig>> {
    return apiClient.get('/v1/guest/comm/config');
  },

  /**
   * Get public configuration (user)
   * Returns system-wide public settings for authenticated users
   */
  async getUserConfig(): Promise<ApiResponse<PublicConfig>> {
    return apiClient.get('/v1/user/comm/config');
  },

  /**
   * Get Stripe public key (user)
   */
  async getStripePublicKey(): Promise<ApiResponse<{ stripe_pk: string }>> {
    return apiClient.post('/v1/user/comm/getStripePublicKey');
  },
};

export default commApi;
