/**
 * Notice Store
 * Manages notice state and operations
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { noticeApi } from '@xboard/shared/api';
import type { Notice } from '@xboard/shared/types';

export const useNoticeStore = defineStore('notice', () => {
  // State
  const notices = ref<Notice[]>([]);
  const loading = ref(false);

  // Actions
  async function fetchNotices() {
    loading.value = true;
    try {
      const response = await noticeApi.getNotices();
      notices.value = response.data;
    } catch (error) {
      console.error('Failed to fetch notices:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function createNotice(data: {
    title: string;
    content: string;
    img_url?: string | null;
    show?: number;
    sort?: number;
  }) {
    try {
      const response = await noticeApi.createNotice(data);
      notices.value.push(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to create notice:', error);
      throw error;
    }
  }

  async function updateNotice(id: number, data: Partial<Notice>) {
    try {
      await noticeApi.updateNotice(id, data);
      const index = notices.value.findIndex(n => n.id === id);
      if (index !== -1 && notices.value[index]) {
        notices.value[index] = { ...notices.value[index]!, ...data } as Notice;
      }
    } catch (error) {
      console.error('Failed to update notice:', error);
      throw error;
    }
  }

  async function deleteNotice(id: number) {
    try {
      await noticeApi.deleteNotice(id);
      const index = notices.value.findIndex(n => n.id === id);
      if (index !== -1) {
        notices.value.splice(index, 1);
      }
    } catch (error) {
      console.error('Failed to delete notice:', error);
      throw error;
    }
  }

  async function toggleVisibility(id: number, show: number) {
    try {
      await noticeApi.toggleVisibility(id, show);
      const index = notices.value.findIndex(n => n.id === id);
      if (index !== -1 && notices.value[index]) {
        notices.value[index].show = show;
      }
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
      throw error;
    }
  }

  async function updateSort(items: { id: number; sort: number }[]) {
    try {
      await noticeApi.updateSort(items);
      // Update local state
      items.forEach(item => {
        const index = notices.value.findIndex(n => n.id === item.id);
        if (index !== -1 && notices.value[index]) {
          notices.value[index].sort = item.sort;
        }
      });
      // Re-sort the array
      notices.value.sort((a, b) => a.sort - b.sort);
    } catch (error) {
      console.error('Failed to update sort:', error);
      throw error;
    }
  }

  return {
    notices,
    loading,
    fetchNotices,
    createNotice,
    updateNotice,
    deleteNotice,
    toggleVisibility,
    updateSort,
  };
});
