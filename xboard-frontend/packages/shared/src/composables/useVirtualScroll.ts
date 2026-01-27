import { ref, computed, watch, onMounted, onUnmounted, type Ref } from 'vue'

export interface VirtualScrollOptions {
  itemHeight: number // Height of each item in pixels
  containerHeight?: number // Height of the scroll container (defaults to window height)
  buffer?: number // Number of items to render above and below visible area
  threshold?: number // Scroll threshold for loading more items
}

export interface VirtualScrollState<T> {
  visibleItems: Ref<T[]>
  startIndex: Ref<number>
  endIndex: Ref<number>
  totalHeight: Ref<number>
  offsetY: Ref<number>
  scrollToIndex: (index: number) => void
  scrollToTop: () => void
}

/**
 * Composable for implementing virtual scrolling
 * Renders only visible items for better performance with large lists
 * 
 * @param items - Array of items to render
 * @param containerRef - Reference to the scroll container element
 * @param options - Virtual scroll configuration options
 */
export function useVirtualScroll<T>(
  items: Ref<T[]>,
  containerRef: Ref<HTMLElement | null>,
  options: VirtualScrollOptions
): VirtualScrollState<T> {
  const {
    itemHeight,
    containerHeight: defaultContainerHeight,
    buffer = 5,
    threshold = 0.8
  } = options

  const scrollTop = ref(0)
  const containerHeight = ref(defaultContainerHeight || 600)

  // Calculate visible range
  const startIndex = computed(() => {
    const index = Math.floor(scrollTop.value / itemHeight) - buffer
    return Math.max(0, index)
  })

  const visibleCount = computed(() => {
    return Math.ceil(containerHeight.value / itemHeight) + buffer * 2
  })

  const endIndex = computed(() => {
    return Math.min(startIndex.value + visibleCount.value, items.value.length)
  })

  // Get visible items
  const visibleItems = computed(() => {
    return items.value.slice(startIndex.value, endIndex.value)
  })

  // Calculate total height for the scroll container
  const totalHeight = computed(() => {
    return items.value.length * itemHeight
  })

  // Calculate offset for positioning visible items
  const offsetY = computed(() => {
    return startIndex.value * itemHeight
  })

  // Handle scroll event
  const handleScroll = (event: Event) => {
    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop

    // Check if we're near the bottom (for infinite scroll)
    const scrollPercentage = (target.scrollTop + target.clientHeight) / target.scrollHeight
    if (scrollPercentage >= threshold) {
      // Emit event or trigger callback for loading more items
      // This can be handled by the parent component
    }
  }

  // Scroll to specific index
  const scrollToIndex = (index: number) => {
    if (!containerRef.value) return
    const targetScrollTop = index * itemHeight
    containerRef.value.scrollTop = targetScrollTop
    scrollTop.value = targetScrollTop
  }

  // Scroll to top
  const scrollToTop = () => {
    scrollToIndex(0)
  }

  // Update container height on mount and resize
  const updateContainerHeight = () => {
    if (containerRef.value) {
      containerHeight.value = containerRef.value.clientHeight
    } else if (!defaultContainerHeight) {
      containerHeight.value = window.innerHeight
    }
  }

  // Setup scroll listener
  onMounted(() => {
    updateContainerHeight()
    
    if (containerRef.value) {
      containerRef.value.addEventListener('scroll', handleScroll, { passive: true })
    }

    window.addEventListener('resize', updateContainerHeight)
  })

  // Cleanup
  onUnmounted(() => {
    if (containerRef.value) {
      containerRef.value.removeEventListener('scroll', handleScroll)
    }
    window.removeEventListener('resize', updateContainerHeight)
  })

  // Reset scroll position when items change significantly
  watch(
    () => items.value.length,
    (newLength, oldLength) => {
      // If items were cleared or significantly reduced, scroll to top
      if (newLength === 0 || (oldLength && newLength < oldLength / 2)) {
        scrollToTop()
      }
    }
  )

  return {
    visibleItems,
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    scrollToIndex,
    scrollToTop
  }
}

/**
 * Simplified virtual scroll for tables
 * Optimized for table rows with fixed height
 */
export function useVirtualTable<T>(
  items: Ref<T[]>,
  containerRef: Ref<HTMLElement | null>,
  rowHeight: number = 50
) {
  return useVirtualScroll(items, containerRef, {
    itemHeight: rowHeight,
    buffer: 3,
    threshold: 0.9
  })
}

/**
 * Virtual scroll with dynamic item heights
 * More complex but supports variable height items
 */
export function useVirtualScrollDynamic<T>(
  items: Ref<T[]>,
  containerRef: Ref<HTMLElement | null>,
  getItemHeight: (item: T, index: number) => number,
  options: Omit<VirtualScrollOptions, 'itemHeight'> = {}
) {
  const { buffer = 5, threshold = 0.8 } = options

  const scrollTop = ref(0)
  const containerHeight = ref(options.containerHeight || 600)
  const itemHeights = ref<number[]>([])
  const itemOffsets = ref<number[]>([])

  // Calculate cumulative offsets for each item
  const updateOffsets = () => {
    let offset = 0
    itemOffsets.value = []
    itemHeights.value = []

    items.value.forEach((item, index) => {
      itemOffsets.value.push(offset)
      const height = getItemHeight(item, index)
      itemHeights.value.push(height)
      offset += height
    })
  }

  // Find start index based on scroll position
  const startIndex = computed(() => {
    let index = 0
    for (let i = 0; i < itemOffsets.value.length; i++) {
      if (itemOffsets.value[i] > scrollTop.value) {
        index = Math.max(0, i - buffer)
        break
      }
    }
    return index
  })

  // Find end index based on visible area
  const endIndex = computed(() => {
    const visibleBottom = scrollTop.value + containerHeight.value
    let index = items.value.length

    for (let i = startIndex.value; i < itemOffsets.value.length; i++) {
      if (itemOffsets.value[i] > visibleBottom) {
        index = Math.min(i + buffer, items.value.length)
        break
      }
    }

    return index
  })

  const visibleItems = computed(() => {
    return items.value.slice(startIndex.value, endIndex.value)
  })

  const totalHeight = computed(() => {
    return itemOffsets.value[itemOffsets.value.length - 1] || 0
  })

  const offsetY = computed(() => {
    return itemOffsets.value[startIndex.value] || 0
  })

  const handleScroll = (event: Event) => {
    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop
  }

  const scrollToIndex = (index: number) => {
    if (!containerRef.value || !itemOffsets.value[index]) return
    containerRef.value.scrollTop = itemOffsets.value[index]
    scrollTop.value = itemOffsets.value[index]
  }

  const scrollToTop = () => {
    scrollToIndex(0)
  }

  // Update offsets when items change
  watch(
    () => items.value,
    () => {
      updateOffsets()
    },
    { deep: true, immediate: true }
  )

  onMounted(() => {
    if (containerRef.value) {
      containerHeight.value = containerRef.value.clientHeight
      containerRef.value.addEventListener('scroll', handleScroll, { passive: true })
    }
  })

  onUnmounted(() => {
    if (containerRef.value) {
      containerRef.value.removeEventListener('scroll', handleScroll)
    }
  })

  return {
    visibleItems,
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    scrollToIndex,
    scrollToTop
  }
}
