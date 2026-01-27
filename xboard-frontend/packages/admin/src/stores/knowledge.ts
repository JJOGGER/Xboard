/**
 * Knowledge Store
 * Manages knowledge base state and operations
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { knowledgeApi } from '@xboard/shared/api';
import type { Knowledge } from '@xboard/shared/types';

export const useKnowledgeStore = defineStore('knowledge', () => {
  // State
  const articles = ref<Knowledge[]>([]);
  const loading = ref(false);

  // Getters
  const categories = computed(() => {
    const cats = new Set(articles.value.map(a => a.category));
    return Array.from(cats);
  });

  const articlesByCategory = computed(() => {
    const grouped: Record<string, Knowledge[]> = {};
    articles.value.forEach(article => {
      if (!grouped[article.category]) {
        grouped[article.category] = [];
      }
      grouped[article.category]!.push(article);
    });
    return grouped;
  });

  // Actions
  async function fetchArticles() {
    loading.value = true;
    try {
      const response = await knowledgeApi.getArticles();
      articles.value = response.data;
    } catch (error) {
      console.error('Failed to fetch articles:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function createArticle(data: {
    category: string;
    title: string;
    body: string;
    sort?: number;
    show?: number;
  }) {
    try {
      const response = await knowledgeApi.createArticle(data);
      articles.value.push(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to create article:', error);
      throw error;
    }
  }

  async function updateArticle(id: number, data: Partial<Knowledge>) {
    try {
      await knowledgeApi.updateArticle(id, data);
      const index = articles.value.findIndex(a => a.id === id);
      if (index !== -1 && articles.value[index]) {
        articles.value[index] = { ...articles.value[index]!, ...data } as Knowledge;
      }
    } catch (error) {
      console.error('Failed to update article:', error);
      throw error;
    }
  }

  async function deleteArticle(id: number) {
    try {
      await knowledgeApi.deleteArticle(id);
      const index = articles.value.findIndex(a => a.id === id);
      if (index !== -1) {
        articles.value.splice(index, 1);
      }
    } catch (error) {
      console.error('Failed to delete article:', error);
      throw error;
    }
  }

  async function toggleVisibility(id: number, show: number) {
    try {
      await knowledgeApi.toggleVisibility(id, show);
      const index = articles.value.findIndex(a => a.id === id);
      if (index !== -1 && articles.value[index]) {
        articles.value[index].show = show;
      }
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
      throw error;
    }
  }

  return {
    articles,
    loading,
    categories,
    articlesByCategory,
    fetchArticles,
    createArticle,
    updateArticle,
    deleteArticle,
    toggleVisibility,
  };
});
