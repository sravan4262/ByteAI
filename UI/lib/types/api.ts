/**
 * API Response Types
 *
 * Note: ApiError, Comment, LoginEmailData, and SignupEmailData are intentionally not
 * re-exported here — they are owned by lib/api and lib/validation as the source of truth.
 * Re-defining them here previously caused TS2308 ambiguous-export errors at lib/index.ts.
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
