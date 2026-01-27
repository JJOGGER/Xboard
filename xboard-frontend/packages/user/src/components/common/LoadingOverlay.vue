<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isVisible" class="loading-overlay" role="dialog" aria-modal="true" aria-label="Loading">
        <div class="loading-overlay__content">
          <LoadingSpinner size="large" :text="text" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import LoadingSpinner from './LoadingSpinner.vue';

interface Props {
  visible: boolean;
  text?: string;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  text: 'Loading...',
});

const isVisible = computed(() => props.visible);
</script>

<style scoped lang="scss">
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}

.loading-overlay__content {
  background: white;
  padding: 32px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (prefers-color-scheme: dark) {
  .loading-overlay__content {
    background: #18181c;
  }
}
</style>
