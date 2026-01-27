<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Base</h1>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Find answers to common questions and learn how to use our service
      </p>
    </div>

    <!-- Search Bar -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <n-input
        v-model:value="searchQuery"
        size="large"
        placeholder="Search articles..."
        clearable
        @update:value="handleSearch"
      >
        <template #prefix>
          <n-icon :component="SearchOutline" />
        </template>
      </n-input>
    </div>

    <!-- Article View (when viewing a specific article) -->
    <div v-if="currentArticle" class="space-y-6">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
        <!-- Back Button -->
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
          <n-button text @click="handleBackToList">
            <template #icon>
              <n-icon :component="ArrowBackOutline" />
            </template>
            Back to Articles
          </n-button>
        </div>

        <!-- Article Content -->
        <div class="p-6">
          <div class="mb-4">
            <n-tag size="small" type="info">{{ currentArticle.category }}</n-tag>
          </div>
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {{ currentArticle.title }}
          </h2>
          <div class="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Last updated: {{ formatDate(currentArticle.updated_at) }}
          </div>
          <div
            class="prose dark:prose-invert max-w-none"
            v-html="currentArticle.body"
          ></div>
        </div>
      </div>

      <!-- Related Articles -->
      <div v-if="relatedArticles.length > 0" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Related Articles</h3>
        <div class="space-y-2">
          <div
            v-for="article in relatedArticles"
            :key="article.id"
            class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
            @click="handleViewArticle(article)"
          >
            <h4 class="font-medium text-gray-900 dark:text-white">{{ article.title }}</h4>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">{{ article.category }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Articles List (when not viewing a specific article) -->
    <div v-else>
      <!-- Search Results -->
      <div v-if="searchQuery" class="space-y-4">
        <div class="text-sm text-gray-600 dark:text-gray-400">
          Found {{ filteredArticles.length }} article(s)
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="article in filteredArticles"
            :key="article.id"
            class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
            @click="handleViewArticle(article)"
          >
            <div class="mb-2">
              <n-tag size="small" type="info">{{ article.category }}</n-tag>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {{ article.title }}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {{ stripHtml(article.body) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Categories View -->
      <div v-else class="space-y-6">
        <div v-for="category in categories" :key="category" class="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div class="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <n-icon :component="FolderOpenOutline" />
              {{ category }}
            </h2>
          </div>
          <div class="p-6">
            <div class="space-y-3">
              <div
                v-for="article in articlesByCategory[category]"
                :key="article.id"
                class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                @click="handleViewArticle(article)"
              >
                <div class="flex items-center gap-3 flex-1">
                  <n-icon :component="DocumentTextOutline" class="text-gray-400" />
                  <span class="font-medium text-gray-900 dark:text-white">{{ article.title }}</span>
                </div>
                <n-icon :component="ChevronForwardOutline" class="text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="!loading && visibleArticles.length === 0"
        class="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center"
      >
        <n-icon :component="DocumentTextOutline" size="64" class="text-gray-300 dark:text-gray-600 mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No Articles Found</h3>
        <p class="text-gray-600 dark:text-gray-400">
          There are no articles available at the moment.
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <n-spin size="large" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { NButton, NIcon, NInput, NTag, NSpin, useMessage } from 'naive-ui';
import {
  SearchOutline,
  ArrowBackOutline,
  FolderOpenOutline,
  DocumentTextOutline,
  ChevronForwardOutline,
} from '@vicons/ionicons5';
import { useKnowledgeStore } from '../stores/knowledge';
import { formatDate } from '@xboard/shared';
import type { Knowledge } from '@xboard/shared';

const message = useMessage();
const knowledgeStore = useKnowledgeStore();

// Computed properties from store
const articles = computed(() => knowledgeStore.articles);
const currentArticle = computed(() => knowledgeStore.currentArticle);
const loading = computed(() => knowledgeStore.loading);
const categories = computed(() => knowledgeStore.categories);
const articlesByCategory = computed(() => knowledgeStore.articlesByCategory);
const visibleArticles = computed(() => knowledgeStore.visibleArticles);
const filteredArticles = computed(() => knowledgeStore.filteredArticles);
const relatedArticles = computed(() => knowledgeStore.relatedArticles);

// Local state
const searchQuery = computed({
  get: () => knowledgeStore.searchQuery,
  set: (value) => knowledgeStore.setSearchQuery(value),
});

// Methods
function handleSearch(value: string) {
  knowledgeStore.setSearchQuery(value);
}

function handleViewArticle(article: Knowledge) {
  knowledgeStore.setCurrentArticle(article);
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleBackToList() {
  knowledgeStore.setCurrentArticle(null);
  knowledgeStore.clearSearch();
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// Lifecycle
onMounted(async () => {
  try {
    await knowledgeStore.fetchArticles();
  } catch (err: any) {
    message.error(err.message || 'Failed to load articles');
  }
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.prose {
  @apply text-gray-700 dark:text-gray-300;
}

.prose :deep(h1),
.prose :deep(h2),
.prose :deep(h3),
.prose :deep(h4),
.prose :deep(h5),
.prose :deep(h6) {
  @apply text-gray-900 dark:text-white font-bold mt-6 mb-4;
}

.prose :deep(p) {
  @apply mb-4;
}

.prose :deep(ul),
.prose :deep(ol) {
  @apply mb-4 pl-6;
}

.prose :deep(li) {
  @apply mb-2;
}

.prose :deep(code) {
  @apply bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm;
}

.prose :deep(pre) {
  @apply bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-x-auto mb-4;
}

.prose :deep(a) {
  @apply text-blue-600 dark:text-blue-400 hover:underline;
}

.prose :deep(img) {
  @apply rounded-lg my-4;
}
</style>
