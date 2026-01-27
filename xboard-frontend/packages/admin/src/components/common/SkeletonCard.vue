<template>
  <el-card class="skeleton-card">
    <el-skeleton :rows="rows" animated>
      <template #template>
        <el-skeleton-item variant="h3" style="width: 50%; margin-bottom: 16px" />
        <el-skeleton-item v-for="row in rows" :key="row" variant="text" style="width: 100%; margin-bottom: 8px" />
      </template>
    </el-skeleton>
  </el-card>
</template>

<script setup lang="ts">
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
