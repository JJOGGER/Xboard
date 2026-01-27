<template>
  <div class="skeleton-table">
    <el-skeleton :rows="rows" animated>
      <template #template>
        <div class="skeleton-table__header">
          <el-skeleton-item v-for="col in columns" :key="col" variant="text" style="width: 100%" />
        </div>
        <div v-for="row in rows" :key="row" class="skeleton-table__row">
          <el-skeleton-item v-for="col in columns" :key="col" variant="text" style="width: 100%" />
        </div>
      </template>
    </el-skeleton>
  </div>
</template>

<script setup lang="ts">
interface Props {
  rows?: number;
  columns?: number;
}

withDefaults(defineProps<Props>(), {
  rows: 5,
  columns: 4,
});
</script>

<style scoped lang="scss">
.skeleton-table {
  padding: 16px;
}

.skeleton-table__header {
  display: grid;
  grid-template-columns: repeat(var(--columns, 4), 1fr);
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color);
}

.skeleton-table__row {
  display: grid;
  grid-template-columns: repeat(var(--columns, 4), 1fr);
  gap: 16px;
  margin-bottom: 12px;
}
</style>
