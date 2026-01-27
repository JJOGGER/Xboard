<template>
  <n-card class="skeleton-card">
    <n-skeleton :text="{ rows }" :sharp="false" />
  </n-card>
</template>

<script setup lang="ts">
import { NCard, NSkeleton } from 'naive-ui';

interface Props {
  rows?: number;
}

withDefaults(defineProps<Props>(), {
  rows: 3,
});
</script>

<style scoped lang="scss">
.skeleton-card {
  margin-bottom: 16px;
}
</style>
