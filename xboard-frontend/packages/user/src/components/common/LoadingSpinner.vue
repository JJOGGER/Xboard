<template>
  <div :class="['loading-spinner', sizeClass]" role="status" :aria-label="label">
    <n-spin :size="spinSize" />
    <span v-if="text" class="loading-spinner__text">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NSpin } from 'naive-ui';

interface Props {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  text: '',
  label: 'Loading',
});

const sizeClass = computed(() => `loading-spinner--${props.size}`);

const spinSize = computed(() => {
  switch (props.size) {
    case 'small':
      return 'small';
    case 'large':
      return 'large';
    default:
      return 'medium';
  }
});
</script>

<style scoped lang="scss">
.loading-spinner {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &--small {
    .loading-spinner__text {
      font-size: 12px;
    }
  }
  
  &--medium {
    .loading-spinner__text {
      font-size: 14px;
    }
  }
  
  &--large {
    .loading-spinner__text {
      font-size: 16px;
    }
  }
}

.loading-spinner__text {
  color: #666;
}

@media (prefers-color-scheme: dark) {
  .loading-spinner__text {
    color: #ccc;
  }
}
</style>
