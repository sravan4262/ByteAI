import { toast } from 'sonner'
import { ApiError } from './http'

/**
 * Handles API errors from mutations (create/update/delete).
 * Shows a user-facing toast, then re-throws so the caller's catch
 * chain can clean up local state if needed.
 */
export function handleMutationError(err: unknown, fallbackMessage = "This couldn't be saved. Please try again."): never {
  const message = err instanceof ApiError ? err.reason : fallbackMessage
  toast.error(message)
  throw err
}

/**
 * Handles API errors from read/fetch operations.
 * Shows a non-blocking inline error message via toast.
 * Does NOT re-throw — callers should render empty state instead.
 */
export function handleFetchError(err: unknown, context = 'Loading failed'): void {
  const message = err instanceof ApiError ? err.reason : `${context}. Please refresh.`
  toast.error(message, { duration: 4000 })
}
