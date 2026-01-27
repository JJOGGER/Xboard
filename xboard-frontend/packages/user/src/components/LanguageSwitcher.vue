<template>
  <n-dropdown
    :options="languageOptions"
    @select="handleLanguageChange"
    trigger="click"
  >
    <n-button circle quaternary>
      <template #icon>
        <n-icon>
          <LanguageIcon />
        </n-icon>
      </template>
    </n-button>
  </n-dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NButton, NDropdown, NIcon } from 'naive-ui'
import { LanguageOutline as LanguageIcon } from '@vicons/ionicons5'

const { locale } = useI18n()

const languageOptions = computed(() => [
  {
    label: 'English',
    key: 'en',
    props: {
      class: locale.value === 'en' ? 'active-language' : ''
    }
  },
  {
    label: '中文',
    key: 'zh',
    props: {
      class: locale.value === 'zh' ? 'active-language' : ''
    }
  }
])

const handleLanguageChange = (key: string) => {
  locale.value = key
  localStorage.setItem('language', key)
}
</script>

<style scoped>
:deep(.active-language) {
  color: var(--n-item-text-color-active);
  font-weight: 600;
}
</style>
