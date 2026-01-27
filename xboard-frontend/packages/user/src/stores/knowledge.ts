/**
 * Knowledge Store (User Frontend)
 * Manages knowledge base state for end users
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { knowledgeApi } from '@xboard/shared';
import type { Knowledge } from '@xboard/shared';

export const useKnowledgeStore = defineStore('knowledge', () => {
  // State
  const articles = ref<Knowledge[]>([]);
  const currentArticle = ref<Knowledge | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const searchQuery = ref('');

  // Getters
  const categories = computed(() => {
    const cats = new Set<string>();
    articles.value.forEach((article) => {
      if (article.show === 1) {
        cats.add(article.category);
      }
    });
    return Array.from(cats).sort();
  });

  const visibleArticles = computed(() => {
    return articles.value.filter((article) => article.show === 1);
  });

  const articlesByCategory = computed(() => {
    const grouped: Record<string, Knowledge[]> = {};
    visibleArticles.value.forEach((article) => {
      if (!grouped[article.category]) {
        grouped[article.category] = [];
      }
      grouped[article.category].push(article);
    });

    // Sort articles within each category by sort order
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => (a.sort || 0) - (b.sort || 0));
    });

    return grouped;
  });

  const filteredArticles = computed(() => {
    if (!searchQuery.value) {
      return visibleArticles.value;
    }

    const query = searchQuery.value.toLowerCase();
    return visibleArticles.value.filter(
      (article) =>
        article.title.toLowerCase().includes(query) ||
        article.body.toLowerCase().includes(query) ||
        article.category.toLowerCase().includes(query)
    );
  });

  const relatedArticles = computed(() => {
    if (!currentArticle.value) return [];

    return visibleArticles.value
      .filter(
        (article) =>
          article.id !== currentArticle.value!.id &&
          article.category === currentArticle.value!.category
      )
      .slice(0, 5);
  });

  // Actions
  async function fetchArticles() {
    try {
      loading.value = true;
      error.value = null;
      const response = await knowledgeApi.getArticles();
      articles.value = response.data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch articles';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function getArticleById(id: number): Knowledge | undefined {
    return articles.value.find((article) => article.id === id && article.show === 1);
  }

  function setCurrentArticle(article: Knowledge | null) {
    currentArticle.value = article;
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query;
  }

  function clearSearch() {
    searchQuery.value = '';
  }

  function clearError() {
    error.value = null;
  }

  return {
    // State
    articles,
    currentArticle,
    loading,
    error,
    searchQuery,

    // Getters
    categories,
    visibleArticles,
    articlesByCategory,
    filteredArticles,
    relatedArticles,

    // Actions
    fetchArticles,
    getArticleById,
    setCurrentArticle,
    setSearchQuery,
    clearSearch,
    clearError,
  };
});
