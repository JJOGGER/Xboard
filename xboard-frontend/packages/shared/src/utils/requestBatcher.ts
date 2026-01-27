/**
 * Request Batcher
 * Utility for batching multiple API requests into a single request
 */

export interface BatchRequest<T = any> {
  id: string
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  resolve: (value: T) => void
  reject: (error: any) => void
}

export interface BatchOptions {
  maxBatchSize?: number // Maximum number of requests in a batch
  batchDelay?: number // Delay in ms before sending batch
  endpoint?: string // Batch endpoint URL
}

/**
 * Request batcher for combining multiple API calls
 */
export class RequestBatcher {
  private queue: BatchRequest[] = []
  private timer: ReturnType<typeof setTimeout> | null = null
  private options: Required<BatchOptions>

  constructor(options: BatchOptions = {}) {
    this.options = {
      maxBatchSize: options.maxBatchSize || 10,
      batchDelay: options.batchDelay || 50,
      endpoint: options.endpoint || '/api/batch'
    }
  }

  /**
   * Add a request to the batch queue
   */
  add<T>(request: Omit<BatchRequest<T>, 'resolve' | 'reject'>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        ...request,
        resolve,
        reject
      } as BatchRequest<T>)

      // Schedule batch execution
      this.scheduleBatch()
    })
  }

  /**
   * Schedule batch execution
   */
  private scheduleBatch(): void {
    // Clear existing timer
    if (this.timer) {
      clearTimeout(this.timer)
    }

    // Execute immediately if batch is full
    if (this.queue.length >= this.options.maxBatchSize) {
      this.executeBatch()
      return
    }

    // Schedule batch execution after delay
    this.timer = setTimeout(() => {
      this.executeBatch()
    }, this.options.batchDelay)
  }

  /**
   * Execute the batch request
   */
  private async executeBatch(): Promise<void> {
    if (this.queue.length === 0) return

    // Get requests to process
    const requests = this.queue.splice(0, this.options.maxBatchSize)

    try {
      // Send batch request
      const response = await fetch(this.options.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: requests.map(({ id, url, method, data }) => ({
            id,
            url,
            method: method || 'GET',
            data
          }))
        })
      })

      if (!response.ok) {
        throw new Error(`Batch request failed: ${response.statusText}`)
      }

      const results = await response.json()

      // Resolve individual requests
      requests.forEach((request) => {
        const result = results.find((r: any) => r.id === request.id)
        if (result) {
          if (result.error) {
            request.reject(result.error)
          } else {
            request.resolve(result.data)
          }
        } else {
          request.reject(new Error('No result for request'))
        }
      })
    } catch (error) {
      // Reject all requests in batch
      requests.forEach((request) => {
        request.reject(error)
      })
    }
  }

  /**
   * Flush all pending requests immediately
   */
  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.executeBatch()
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.queue = []
  }
}

/**
 * Create a singleton batcher instance
 */
export const defaultBatcher = new RequestBatcher()

/**
 * Helper function to batch a request
 */
export function batchRequest<T>(
  id: string,
  url: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    data?: any
    batcher?: RequestBatcher
  }
): Promise<T> {
  const batcher = options?.batcher || defaultBatcher
  return batcher.add<T>({
    id,
    url,
    method: options?.method,
    data: options?.data
  })
}
