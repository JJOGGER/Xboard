/**
 * Gift Card Store
 * Manages gift card state and operations
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { giftCardApi } from '@xboard/shared/api';
import type { GiftCardTemplate, GiftCardCode } from '@xboard/shared/types';

export const useGiftCardStore = defineStore('giftCard', () => {
  // State
  const templates = ref<GiftCardTemplate[]>([]);
  const codes = ref<GiftCardCode[]>([]);
  const codesTotal = ref(0);
  const loading = ref(false);

  // Actions
  async function fetchTemplates() {
    loading.value = true;
    try {
      const response = await giftCardApi.getTemplates();
      templates.value = response.data;
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function createTemplate(data: {
    name: string;
    type: number;
    amount: number;
    validity_period?: number | null;
  }) {
    try {
      const response = await giftCardApi.createTemplate(data);
      templates.value.push(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to create template:', error);
      throw error;
    }
  }

  async function deleteTemplate(id: number) {
    try {
      await giftCardApi.deleteTemplate(id);
      const index = templates.value.findIndex(t => t.id === id);
      if (index !== -1) {
        templates.value.splice(index, 1);
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw error;
    }
  }

  async function fetchCodes(params: {
    page?: number;
    page_size?: number;
    template_id?: number;
    status?: number;
  }) {
    loading.value = true;
    try {
      const response = await giftCardApi.getCodes(params);
      codes.value = response.data.data;
      codesTotal.value = response.data.total;
    } catch (error) {
      console.error('Failed to fetch codes:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function generateCodes(data: { template_id: number; count: number }) {
    try {
      const response = await giftCardApi.generateCodes(data);
      return response.data;
    } catch (error) {
      console.error('Failed to generate codes:', error);
      throw error;
    }
  }

  async function toggleCodeStatus(id: number, status: number) {
    try {
      await giftCardApi.toggleCodeStatus(id, status);
      const index = codes.value.findIndex(c => c.id === id);
      if (index !== -1 && codes.value[index]) {
        codes.value[index].status = status;
      }
    } catch (error) {
      console.error('Failed to toggle code status:', error);
      throw error;
    }
  }

  return {
    templates,
    codes,
    codesTotal,
    loading,
    fetchTemplates,
    createTemplate,
    deleteTemplate,
    fetchCodes,
    generateCodes,
    toggleCodeStatus,
  };
});
