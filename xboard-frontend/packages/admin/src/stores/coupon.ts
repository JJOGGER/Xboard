/**
 * Coupon Store
 * Manages coupon state and operations
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { couponApi, type CouponFilters, type CreateCouponData } from '@xboard/shared/api';
import type { Coupon } from '@xboard/shared/types';

export const useCouponStore = defineStore('coupon', () => {
  // State
  const coupons = ref<Coupon[]>([]);
  const currentCoupon = ref<Coupon | null>(null);
  const total = ref(0);
  const loading = ref(false);
  const filters = ref<CouponFilters>({});

  // Actions
  async function fetchCoupons(params: {
    page?: number;
    page_size?: number;
    filters?: CouponFilters;
  }) {
    loading.value = true;
    try {
      const response = await couponApi.getCoupons(params);
      coupons.value = response.data.data;
      total.value = response.data.total;
      filters.value = params.filters || {};
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCouponById(id: number) {
    loading.value = true;
    try {
      const response = await couponApi.getCouponById(id);
      currentCoupon.value = response.data;
      return response.data;
    } catch (error) {
      console.error('Failed to fetch coupon:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function createCoupon(data: CreateCouponData) {
    try {
      const response = await couponApi.createCoupon(data);
      return response.data;
    } catch (error) {
      console.error('Failed to create coupon:', error);
      throw error;
    }
  }

  async function updateCoupon(id: number, data: Partial<CreateCouponData>) {
    try {
      await couponApi.updateCoupon(id, data);
      
      // Update coupon in list
      const couponIndex = coupons.value.findIndex(c => c.id === id);
      if (couponIndex !== -1) {
        coupons.value[couponIndex] = { ...coupons.value[couponIndex], ...data };
      }
    } catch (error) {
      console.error('Failed to update coupon:', error);
      throw error;
    }
  }

  async function deleteCoupon(id: number) {
    try {
      await couponApi.deleteCoupon(id);
      
      // Remove coupon from list
      const couponIndex = coupons.value.findIndex(c => c.id === id);
      if (couponIndex !== -1) {
        coupons.value.splice(couponIndex, 1);
        total.value--;
      }
    } catch (error) {
      console.error('Failed to delete coupon:', error);
      throw error;
    }
  }

  async function toggleVisibility(id: number, show: number) {
    try {
      await couponApi.toggleVisibility(id, show);
      
      // Update coupon in list
      const couponIndex = coupons.value.findIndex(c => c.id === id);
      if (couponIndex !== -1 && coupons.value[couponIndex]) {
        coupons.value[couponIndex].show = show;
      }
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
      throw error;
    }
  }

  async function generateCoupons(data: {
    generate_count: number;
    name: string;
    type: number;
    value: number;
    limit_use?: number | null;
    limit_use_with_user?: number | null;
    limit_plan_ids?: number[] | null;
    started_at: number;
    ended_at: number;
  }) {
    try {
      const response = await couponApi.generateCoupons(data);
      return response.data;
    } catch (error) {
      console.error('Failed to generate coupons:', error);
      throw error;
    }
  }

  function clearCurrentCoupon() {
    currentCoupon.value = null;
  }

  return {
    // State
    coupons,
    currentCoupon,
    total,
    loading,
    filters,

    // Actions
    fetchCoupons,
    fetchCouponById,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    toggleVisibility,
    generateCoupons,
    clearCurrentCoupon,
  };
});
