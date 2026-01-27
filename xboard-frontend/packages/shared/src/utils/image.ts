/**
 * Image utility functions for optimization and format conversion
 */

/**
 * Check if browser supports WebP format
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image()
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2)
    }
    webP.src =
      'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'
  })
}

/**
 * Get optimized image URL with WebP fallback
 * @param url - Original image URL
 * @param options - Optimization options
 */
export function getOptimizedImageUrl(
  url: string,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'jpeg' | 'png'
  } = {}
): string {
  // If URL is already optimized or is a data URL, return as is
  if (!url || url.startsWith('data:') || url.includes('?')) {
    return url
  }

  const params = new URLSearchParams()

  if (options.width) {
    params.append('w', options.width.toString())
  }

  if (options.height) {
    params.append('h', options.height.toString())
  }

  if (options.quality) {
    params.append('q', options.quality.toString())
  }

  if (options.format) {
    params.append('f', options.format)
  }

  const queryString = params.toString()
  return queryString ? `${url}?${queryString}` : url
}

/**
 * Generate srcset for responsive images
 * @param url - Base image URL
 * @param sizes - Array of widths for srcset
 */
export function generateSrcSet(url: string, sizes: number[] = [320, 640, 960, 1280, 1920]): string {
  return sizes
    .map((size) => {
      const optimizedUrl = getOptimizedImageUrl(url, { width: size, format: 'webp' })
      return `${optimizedUrl} ${size}w`
    })
    .join(', ')
}

/**
 * Preload critical images
 * @param urls - Array of image URLs to preload
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve()
          img.onerror = reject
          img.src = url
        })
    )
  )
}

/**
 * Convert image to WebP format (client-side)
 * @param file - Image file to convert
 * @param quality - WebP quality (0-1)
 */
export async function convertToWebP(file: File, quality: number = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to convert image to WebP'))
            }
          },
          'image/webp',
          quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Compress image before upload
 * @param file - Image file to compress
 * @param maxWidth - Maximum width
 * @param maxHeight - Maximum height
 * @param quality - Compression quality (0-1)
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        let { width, height } = img

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.floor(width * ratio)
          height = Math.floor(height * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Use better image smoothing
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          file.type,
          quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Get image dimensions without loading the full image
 * @param url - Image URL
 */
export function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
    }
    img.onerror = reject
    img.src = url
  })
}

/**
 * Create a placeholder blur data URL for images
 * @param width - Placeholder width
 * @param height - Placeholder height
 * @param color - Placeholder color
 */
export function createPlaceholder(
  width: number = 10,
  height: number = 10,
  color: string = '#f0f0f0'
): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)

  return canvas.toDataURL('image/png')
}
