/**
 * Order API
 * User order management endpoints
 */

import apiClient from './client';
import type { ApiResponse } from '../types';

export interface CreateOrderRequest {
  plan_id?: number;
  shared_plan_id?: number;
  plan_type?: 'traditional' | 'shared';
  period?: string;
  coupon_code?: string;
}

export interface Order {
  id: number;
  trade_no: string;
  plan_type: 'traditional' | 'shared';
  plan_name?: string;
  period?: string;
  total_amount: number;
  status: number;
  created_at: string;
  updated_at: string;
  plan?: {
    id: number;
    name: string;
    transfer_enable: number;
  };
  shared_plan?: {
    id: number;
    name: string;
    source: string;
    price: number;
  };
}

export interface OrderListResponse {
  data: Order[];
  total: number;
  current_page: number;
  last_page: number;
}

export interface PaymentInfo {
  trade_no: string;
  total_amount: number;
  status: number;
  payment_url?: string;
}

export interface CheckoutRequest {
  trade_no: string;
  method: number;
  token?: string;
}

export interface CheckoutResponse {
  type: number;
  data: string | object;
}

export interface OrderStatusResponse {
  trade_no: string;
  status: number;
  total_amount?: number;
}

export interface PaymentMethod {
  id: number;
  name: string;
  payment: string;
  icon: string;
  handling_fee_fixed: number;
  handling_fee_percent: number;
}

export interface OrderStats {
  total_revenue: number;
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
}

export const orderApi = {
  /**
   * Create order (user endpoint)
   */
  async createOrder(data: CreateOrderRequest): Promise<ApiResponse<Order>> {
    // 如果是共享套餐，使用专用接口
    if (data.shared_plan_id) {
      return apiClient.post<Order>('/v1/user/share-order/save', data);
    }
    // 传统套餐使用原接口
    return apiClient.post<Order>('/v1/user/order/save', data);
  },

  /**
   * Fetch user orders
   */
  async fetchOrders(params?: { page?: number; page_size?: number }): Promise<ApiResponse<OrderListResponse>> {
    return apiClient.get<OrderListResponse>('/v1/user/order/fetch', { params });
  },
  
  /**
   * Get user orders (alias for fetchOrders for compatibility)
   */
  async getUserOrders(params?: { page?: number; page_size?: number }): Promise<ApiResponse<OrderListResponse>> {
    return apiClient.get<OrderListResponse>('/v1/user/order/fetch', { params });
  },

  /**
   * Get order detail
   */
  async getOrderDetail(id: number): Promise<ApiResponse<Order>> {
    return apiClient.get<Order>(`/v2/order/detail/${id}`);
  },

  /**
   * Cancel order
   */
  async cancelOrder(id: number | string): Promise<ApiResponse<boolean>> {
    // Some legacy callers may pass trade_no here.
    // If a string is provided, treat it as trade_no and use the V1 user cancel endpoint.
    if (typeof id === 'string') {
      return apiClient.post<boolean>('/v1/user/order/cancel', { trade_no: id });
    }

    return apiClient.post<boolean>(`/v2/order/cancel/${id}`);
  },

  /**
   * Cancel user traditional order (V1 legacy endpoint)
   * This is the same endpoint used in the purchase flow when cancelling pending orders.
   */
  async cancelUserOrder(tradeNo: string): Promise<ApiResponse<boolean>> {
    return apiClient.post<boolean>('/v1/user/order/cancel', { trade_no: tradeNo });
  },

  /**
   * Cancel order (admin endpoint)
   * Admin uses trade_no and POST /v2/order/cancel
   */
  async cancelAdminOrder(tradeNo: string): Promise<ApiResponse<boolean>> {
    return apiClient.post<boolean>('/v2/order/cancel', { trade_no: tradeNo });
  },

  /**
   * Cancel shared plan order
   */
  async cancelShareOrder(tradeNo: string): Promise<ApiResponse<boolean>> {
    return apiClient.post<boolean>('/v1/user/share-order/cancel', { trade_no: tradeNo });
  },

  /**
   * Get payment info
   */
  async getPaymentInfo(tradeNo: string): Promise<ApiResponse<PaymentInfo>> {
    return apiClient.get<PaymentInfo>(`/v2/order/payment/${tradeNo}`);
  },

  /**
   * Checkout order (initiate payment)
   * 根据订单类型自动选择正确的接口
   */
  async checkout(data: CheckoutRequest): Promise<ApiResponse<CheckoutResponse>> {
    // User frontend should use V1 user checkout endpoint (no secure_path).
    return apiClient.post<CheckoutResponse>('/v1/user/order/checkout', data);
  },

  /**
   * Checkout shared plan order (使用专用接口)
   */
  async checkoutShareOrder(data: CheckoutRequest): Promise<ApiResponse<CheckoutResponse>> {
    return apiClient.post<CheckoutResponse>('/v1/user/share-order/checkout', data);
  },

  /**
   * Check order status
   */
  async checkStatus(tradeNo: string): Promise<ApiResponse<number>> {
    return apiClient.get<number>('/v1/user/order/check', {
      params: { trade_no: tradeNo, t: Date.now() },
    });
  },

  /**
   * Check shared plan order status
   */
  async checkShareStatus(tradeNo: string): Promise<ApiResponse<OrderStatusResponse>> {
    return apiClient.get<OrderStatusResponse>('/v1/user/share-order/check', {
      params: { trade_no: tradeNo, t: Date.now() },
    });
  },

  /**
   * Get payment methods
   */
  async getPaymentMethods(): Promise<ApiResponse<PaymentMethod[]>> {
    // User frontend uses legacy V1 endpoint.
    return apiClient.get<PaymentMethod[]>('/v1/user/order/getPaymentMethod');
  },

  /**
   * Get order statistics (admin endpoint)
   */
  async getOrderStats(filters?: any): Promise<ApiResponse<OrderStats>> {
    return apiClient.get<OrderStats>('/v2/order/stats', { params: filters });
  },

  /**
   * Get orders (admin endpoint)
   */
  async getOrders(params?: { page?: number; page_size?: number; filters?: any }): Promise<ApiResponse<OrderListResponse>> {
    return apiClient.get<OrderListResponse>('/v2/order/fetch', { params });
  },

  /**
   * Get order by ID (admin endpoint)
   */
  async getOrderById(id: number): Promise<ApiResponse<Order>> {
    return apiClient.get<Order>(`/v2/order/detail/${id}`);
  },

  /**
   * Confirm payment (admin endpoint)
   */
  async confirmPayment(id: number): Promise<ApiResponse<boolean>> {
    return apiClient.post<boolean>(`/v2/order/paid`, { order_id: id });
  },

  /**
   * Assign order to user (admin endpoint)
   */
  async assignOrder(data: { order_id: number; user_id: number }): Promise<ApiResponse<boolean>> {
    return apiClient.post<boolean>('/v2/order/assign', data);
  },

  /**
   * Update order (admin endpoint)
   */
  async updateOrder(id: number, data: Partial<Order>): Promise<ApiResponse<Order>> {
    return apiClient.post<Order>('/v2/order/update', { ...data, id });
  },
};
