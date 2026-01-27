/**
 * Order Store
 * Manages order state and operations
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { orderApi } from '@xboard/shared/api/order';
import type { Order, OrderFilters } from '@xboard/shared';

interface OrderStats {
  total_revenue: number;
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
}

export const useOrderStore = defineStore('order', () => {
  // State
  const orders = ref<Order[]>([]);
  const currentOrder = ref<Order | null>(null);
  const total = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(20);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filters = ref<OrderFilters>({});
  const stats = ref<OrderStats | null>(null);

  // Getters
  const hasOrders = computed(() => orders.value.length > 0);
  const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

  /**
   * Fetch orders with pagination and filters
   * Requirements: 6.1, 6.2
   */
  async function fetchOrders(params?: {
    page?: number;
    page_size?: number;
    filters?: OrderFilters;
  }): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const response = await orderApi.getOrders({
        page: params?.page || currentPage.value,
        page_size: params?.page_size || pageSize.value,
        filters: params?.filters || filters.value,
      });

      // apiClient 返回的数据在不同后端实现下可能有两种结构：
      // 1) { status, message, data: { data: [...], total, current_page, per_page } }
      // 2) { total, current_page, per_page, data: [...] }
      // 注意：当结构为 (2) 时，response.data 是“订单数组”，不能当成 wrapper
      const raw: any = response as any;
      const pageData: any =
        (raw && typeof raw.total !== 'undefined' && Array.isArray(raw.data))
          ? raw
          : (raw?.data && typeof raw.data.total !== 'undefined' && Array.isArray(raw.data.data))
            ? raw.data
            : raw;

      const list = Array.isArray(pageData?.data) ? pageData.data : (Array.isArray(pageData?.data?.data) ? pageData.data.data : []);
      orders.value = list;
      total.value = Number(pageData?.total ?? 0);
      currentPage.value = Number(pageData?.current_page ?? params?.page ?? 1);
      pageSize.value = Number(pageData?.per_page ?? params?.page_size ?? pageSize.value);
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch orders';
      console.error('Failed to fetch orders:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch order by ID
   * Requirements: 6.3
   */
  async function fetchOrderById(id: number): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const response = await orderApi.getOrderById(id);
      currentOrder.value = response.data as any;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch order details';
      console.error('Failed to fetch order details:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Manually confirm payment for an order
   * Requirements: 6.4
   */
  async function confirmPayment(id: number): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      await orderApi.confirmPayment(id);
      
      // Update local state
      const order = orders.value.find((o) => o.id === id);
      if (order) {
        order.status = 3; // Completed
      }
      
      if (currentOrder.value?.id === id) {
        currentOrder.value.status = 3;
      }

      // Refresh orders to get updated data
      await fetchOrders();
    } catch (err: any) {
      error.value = err.message || 'Failed to confirm payment';
      console.error('Failed to confirm payment:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Cancel an order
   * Requirements: 6.5
   */
  async function cancelOrder(tradeNo: string, id?: number): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      await orderApi.cancelAdminOrder(tradeNo);
      
      // Update local state
      const order = orders.value.find((o) => (id ? o.id === id : o.trade_no === tradeNo));
      if (order) {
        order.status = 2; // Cancelled
      }
      
      if (currentOrder.value && (id ? currentOrder.value.id === id : currentOrder.value.trade_no === tradeNo)) {
        currentOrder.value.status = 2;
      }

      // Refresh orders to get updated data
      await fetchOrders();
    } catch (err: any) {
      error.value = err.message || 'Failed to cancel order';
      console.error('Failed to cancel order:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Assign order to a user
   * Requirements: 6.6
   */
  async function assignOrder(orderId: number, userId: number): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      await orderApi.assignOrder({ order_id: orderId, user_id: userId });
      
      // Update local state
      const order = orders.value.find((o) => o.id === orderId);
      if (order) {
        order.user_id = userId;
      }
      
      if (currentOrder.value?.id === orderId) {
        currentOrder.value.user_id = userId;
      }

      // Refresh orders to get updated data
      await fetchOrders();
    } catch (err: any) {
      error.value = err.message || 'Failed to assign order';
      console.error('Failed to assign order:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update order details
   * Requirements: 6.7
   */
  async function updateOrder(id: number, data: Partial<Order>): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      await orderApi.updateOrder(id, data);
      
      // Update local state
      const order = orders.value.find((o) => o.id === id);
      if (order) {
        Object.assign(order, data);
      }
      
      if (currentOrder.value?.id === id) {
        Object.assign(currentOrder.value, data);
      }

      // Refresh orders to get updated data
      await fetchOrders();
    } catch (err: any) {
      error.value = err.message || 'Failed to update order';
      console.error('Failed to update order:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch order statistics
   * Requirements: 6.8
   */
  async function fetchOrderStats(orderFilters?: OrderFilters): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const response = await orderApi.getOrderStats(orderFilters);
      stats.value = response.data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch order statistics';
      console.error('Failed to fetch order statistics:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Set filters
   */
  function setFilters(newFilters: OrderFilters): void {
    filters.value = newFilters;
  }

  /**
   * Clear filters
   */
  function clearFilters(): void {
    filters.value = {};
  }

  /**
   * Set page
   */
  function setPage(page: number): void {
    currentPage.value = page;
  }

  /**
   * Reset store state
   */
  function $reset(): void {
    orders.value = [];
    currentOrder.value = null;
    total.value = 0;
    currentPage.value = 1;
    pageSize.value = 20;
    loading.value = false;
    error.value = null;
    filters.value = {};
    stats.value = null;
  }

  return {
    // State
    orders,
    currentOrder,
    total,
    currentPage,
    pageSize,
    loading,
    error,
    filters,
    stats,

    // Getters
    hasOrders,
    totalPages,

    // Actions
    fetchOrders,
    fetchOrderById,
    confirmPayment,
    cancelOrder,
    assignOrder,
    updateOrder,
    fetchOrderStats,
    setFilters,
    clearFilters,
    setPage,
    $reset,
  };
});
