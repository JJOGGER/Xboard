import { ref, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * Composable for lazy loading images using Intersection Observer
 * @param imageRef - Reference to the image element
 * @param src - Image source URL
 * @param options - Intersection Observer options
 */
export function useLazyImage(
  imageRef: Ref<HTMLImageElement | null>,
  src: string,
  options: IntersectionObserverInit = {}
) {
  const isLoaded = ref(false)
  const isInView = ref(false)
  const error = ref<Error | null>(null)

  let observer: IntersectionObserver | null = null

  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px', // Start loading 50px before image enters viewport
    threshold: 0.01,
    ...options
  }

  const loadImage = () => {
    if (!imageRef.value || isLoaded.value) return

    const img = imageRef.value
    const imageSrc = src

    // Create a temporary image to preload
    const tempImage = new Image()
    
    tempImage.onload = () => {
      img.src = imageSrc
      isLoaded.value = true
      error.value = null
    }

    tempImage.onerror = (e) => {
      error.value = new Error('Failed to load image')
      console.error('Image loading error:', e)
    }

    tempImage.src = imageSrc
  }

  const handleIntersection = (entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        isInView.value = true
        loadImage()
        // Stop observing once image is loaded
        if (observer && imageRef.value) {
          observer.unobserve(imageRef.value)
        }
      }
    })
  }

  onMounted(() => {
    if (!imageRef.value) return

    // Check if Intersection Observer is supported
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(handleIntersection, defaultOptions)
      observer.observe(imageRef.value)
    } else {
      // Fallback: load image immediately if Intersection Observer is not supported
      loadImage()
    }
  })

  onUnmounted(() => {
    if (observer && imageRef.value) {
      observer.unobserve(imageRef.value)
      observer.disconnect()
    }
  })

  return {
    isLoaded,
    isInView,
    error
  }
}

/**
 * Directive for lazy loading images
 * Usage: v-lazy-image="imageUrl"
 */
export const vLazyImage = {
  mounted(el: HTMLImageElement, binding: { value: string }) {
    const src = binding.value
    
    // Set a placeholder or loading state
    el.style.backgroundColor = '#f0f0f0'
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            const tempImage = new Image()
            
            tempImage.onload = () => {
              img.src = src
              img.style.backgroundColor = 'transparent'
            }
            
            tempImage.onerror = () => {
              console.error('Failed to load image:', src)
              img.alt = 'Failed to load image'
            }
            
            tempImage.src = src
            observer.unobserve(img)
          }
        })
      },
      {
        root: null,
        rootMargin: '50px',
        threshold: 0.01
      }
    )
    
    observer.observe(el)
    
    // Store observer on element for cleanup
    ;(el as any)._lazyImageObserver = observer
  },
  
  unmounted(el: HTMLImageElement) {
    const observer = (el as any)._lazyImageObserver
    if (observer) {
      observer.disconnect()
      delete (el as any)._lazyImageObserver
    }
  }
}
