<template>
  <el-dropdown trigger="click" @command="handleLanguageChange">
    <el-button circle>
      <el-icon><Switch /></el-icon>
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="en" :class="{ 'is-active': currentLocale === 'en' }">
          English
        </el-dropdown-item>
        <el-dropdown-item command="zh" :class="{ 'is-active': currentLocale === 'zh' }">
          中文
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Switch } from '@element-plus/icons-vue'

const { locale } = useI18n()

const currentLocale = computed(() => locale.value)

const handleLanguageChange = (lang: string) => {
  locale.value = lang
  localStorage.setItem('locale', lang)
}
</script>

<style scoped>
.is-active {
  color: var(--el-color-primary);
  font-weight: bold;
}
</style>
