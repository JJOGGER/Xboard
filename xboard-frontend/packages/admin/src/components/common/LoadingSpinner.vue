<template>
  <div :class="['loading-spinner', sizeClass]" role="status" :aria-label="label">
    <el-icon class="is-loading">
      <Loading />
    </el-icon>
    <span v-if="text" class="loading-spinner__text">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Loading } from '@element-plus/icons-vue';

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
</script>

<style scoped lang="scss">
.loading-spinner {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &--small {
    .el-icon {
      font-size: 16px;
    }
    
    .loading-spinner__text {
      font-size: 12px;
    }
  }
  
  &--medium {
    .el-icon {
      font-size: 24px;
    }
    
    .loading-spinner__text {
      font-size: 14px;
    }
  }
  
  &--large {
    .el-icon {
      font-size: 32px;
    }
    
    .loading-spinner__text {
      font-size: 16px;
    }
  }
}

.loading-spinner__text {
  color: var(--el-text-color-regular);
}

.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
