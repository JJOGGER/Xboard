/**
 * Order Store (User Frontend)
 * Manages order state and checkout logic for end users
 * Supports both traditional plans and shared subscriptions
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Order } from '@xboard/shared/types';
import { orderApi } from '@xboard/shared/api/order';

interface CheckoutData {
  plan_id?: number;
  shared_plan_id?: number;
  plan_type?: 'traditional' | 'shared';
  period?: string;
  coupon_code?: string;
}

interface CheckoutResponse {
  trade_no: string;
  total_amount: number;
  status: number;
}

export const useOrderStore = defineStore('order', () => {
  // State
  const orders = ref<Order[]>([]);
  const currentOrder = ref<Order | null>(null);
  const checkoutData = ref<CheckoutResponse | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const pendingOrders = computed(() => 
    orders.value.filter(order => order.status === 0)
  );

  const completedOrders = computed(() => 
    orders.value.filter(order => order.status === 3)
  );

  const cancelledOrders = computed(() => 
    orders.value.filter(order => order.status === 2)
  );

  // Actions
  
  /**
   * Fetch user's orders
   */
  async function fetchOrders(params?: { page?: number; page_size?: number }): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const response = await orderApi.fetchOrders(params);
      const payload: any = (response as any).data;
      const maybeList = payload?.data?.data ?? payload?.data ?? payload;
      orders.value = Array.isArray(maybeList) ? maybeList : [];
    } catch (err) {
      error.value = 'Failed to fetch orders';
      console.error('Failed to fetch orders:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get order by ID
   */
  async function fetchOrderById(id: number): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const response = await orderApi.getOrderDetail(id);
      const payload: any = (response as any).data;
      currentOrder.value = (payload?.data ?? payload) as any;
    } catch (err) {
      error.value = 'Failed to fetch order';
      console.error('Failed to fetch order:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create order (unified for both traditional and shared plans)
   */
  async function createOrder(data: CheckoutData): Promise<CheckoutResponse> {
    loading.value = true;
    error.value = null;
    try {
      const response = await orderApi.createOrder(data);
      
      console.log('[OrderStore] Create order response:', response);
      
      // 后端返回的 data 字段可能是字符串（trade_no）或对象
      let tradeNo: string;
      let totalAmount: number = 0;
      let status: number = 0;
      
      if (typeof response.data === 'string') {
        // 共享套餐订单：data 直接是 trade_no 字符串
        tradeNo = response.data;
      } else if (response.data && typeof response.data === 'object') {
        // 传统套餐订单：data 是对象
        tradeNo = (response.data as any).trade_no;
        totalAmount = (response.data as any).total_amount || 0;
        status = (response.data as any).status || 0;
      } else {
        throw new Error('Invalid order response format');
      }
      
      checkoutData.value = {
        trade_no: tradeNo,
        total_amount: totalAmount,
        status: status,
      };
      
      console.log('[OrderStore] Checkout data:', checkoutData.value);
      
      return checkoutData.value;
    } catch (err) {
      error.value = 'Failed to create order';
      console.error('Failed to create order:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Cancel traditional order (user)
   * Use V1 legacy endpoint with trade_no to match purchase flow behavior.
   */
  async function cancelOrder(tradeNo: string, id?: number): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await orderApi.cancelUserOrder(tradeNo);
      
      // Update order in local state
      const order = orders.value.find(o => (id ? o.id === id : o.trade_no === tradeNo));
      if (order) {
        order.status = 2; // Cancelled
      }
      
      if (currentOrder.value && (id ? currentOrder.value.id === id : currentOrder.value.trade_no === tradeNo)) {
        currentOrder.value.status = 2;
      }
    } catch (err) {
      error.value = 'Failed to cancel order';
      console.error('Failed to cancel order:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Cancel shared plan order
   */
  async function cancelShareOrder(tradeNo: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      const response = await orderApi.cancelShareOrder(tradeNo);
      
      // Update order in local state
      const order = orders.value.find(o => o.trade_no === tradeNo);
      if (order) {
        order.status = 2; // Cancelled
      }
      
      if (currentOrder.value?.trade_no === tradeNo) {
        currentOrder.value.status = 2;
      }
      
      return response.data;
    } catch (err) {
      error.value = 'Failed to cancel shared order';
      console.error('Failed to cancel shared order:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get payment info
   */
  async function getPaymentInfo(tradeNo: string): Promise<any> {
    loading.value = true;
    error.value = null;
    try {
      const response = await orderApi.getPaymentInfo(tradeNo);
      return response.data;
    } catch (err) {
      error.value = 'Failed to get payment info';
      console.error('Failed to get payment info:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Checkout order (initiate payment)
   * 支持传统套餐和共享套餐
   */
  async function checkout(tradeNo: string, paymentMethodId: number, token?: string, orderType?: 'traditional' | 'shared'): Promise<any> {
    loading.value = true;
    error.value = null;
    try {
      const checkoutData = {
        trade_no: tradeNo,
        method: paymentMethodId,
        token,
      };
      
      // 如果明确指定了订单类型为共享套餐，使用专用接口
      if (orderType === 'shared') {
        const response = await orderApi.checkoutShareOrder(checkoutData);
        return response.data;
      }
      
      // 否则使用 V2 统一接口（支持所有类型）
      const response = await orderApi.checkout(checkoutData);
      return response.data;
    } catch (err) {
      error.value = 'Failed to checkout';
      console.error('Failed to checkout:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Check order status
   */
  async function checkOrderStatus(tradeNo: string): Promise<any> {
    loading.value = true;
    error.value = null;
    try {
      // Prefer V1 traditional order check endpoint
      try {
        const response = await orderApi.checkStatus(tradeNo);
        const status = response.data;
        return { trade_no: tradeNo, status };
      } catch (e) {
        // Fallback for shared plan orders
        const sharedResp = await orderApi.checkShareStatus(tradeNo);
        return sharedResp.data;
      }
    } catch (err) {
      error.value = 'Failed to check order status';
      console.error('Failed to check order status:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get payment methods
   */
  async function getPaymentMethods(): Promise<any[]> {
    loading.value = true;
    error.value = null;
    try {
      const response = await orderApi.getPaymentMethods();
      return response.data;
    } catch (err) {
      error.value = 'Failed to get payment methods';
      console.error('Failed to get payment methods:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Clear checkout data
   */
  function clearCheckout(): void {
    checkoutData.value = null;
  }

  /**
   * Clear current order
   */
  function clearCurrentOrder(): void {
    currentOrder.value = null;
  }

  /**
   * Clear error state
   */
  function clearError(): void {
    error.value = null;
  }

  return {
    // State
    orders,
    currentOrder,
    checkoutData,
    loading,
    error,
    
    // Getters
    pendingOrders,
    completedOrders,
    cancelledOrders,
    
    // Actions
    fetchOrders,
    fetchOrderById,
    createOrder,
    cancelOrder,
    cancelShareOrder,
    getPaymentInfo,
    checkout,
    checkOrderStatus,
    getPaymentMethods,
    clearCheckout,
    clearCurrentOrder,
    clearError,
  };
});
