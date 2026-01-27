<template>
  <div ref="containerRef" class="virtual-table-container" :style="{ height: containerHeight }">
    <div class="virtual-table-spacer" :style="{ height: `${totalHeight}px` }">
      <div class="virtual-table-content" :style="{ transform: `translateY(${offsetY}px)` }">
        <slot name="default" :items="visibleItems" :start-index="startIndex" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { ref, toRef } from 'vue'
import { useVirtualTable } from '../composables/useVirtualScroll'

interface Props {
  items: T[]
  rowHeight?: number
  containerHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  rowHeight: 50,
  containerHeight: '600px'
})

const containerRef = ref<HTMLElement | null>(null)
const itemsRef = toRef(props, 'items')

const { visibleItems, startIndex, totalHeight, offsetY } = useVirtualTable(
  itemsRef,
  containerRef,
  props.rowHeight
)

// Expose methods for parent component
defineExpose({
  scrollToTop: () => {
    if (containerRef.value) {
      containerRef.value.scrollTop = 0
    }
  },
  scrollToIndex: (index: number) => {
    if (containerRef.value) {
      containerRef.value.scrollTop = index * props.rowHeight
    }
  }
})
</script>

<style scoped>
.virtual-table-container {
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.virtual-table-spacer {
  position: relative;
  width: 100%;
}

.virtual-table-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  will-change: transform;
}
</style>
