/**
 * API Response Types
 */

export interface ApiResponse<T> {
  data: T
  error?: string
  status: number
}

export interface PagedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}
