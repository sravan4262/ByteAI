const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5239'

type TokenProvider = () => Promise<string | null>

let tokenProvider: TokenProvider | null = null

/** Called once from AuthGuard to wire in Clerk's getToken() */
export function setTokenProvider(fn: TokenProvider) {
  tokenProvider = fn
}

/** Structured error thrown by apiFetch for non-2xx responses. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode: string,
    public readonly reason: string,
  ) {
    super(`${errorCode}: ${reason}`)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = tokenProvider ? await tokenProvider() : null

  const isFormData = options?.body instanceof FormData
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (res.status === 503) {
      throw new ApiError(503, 'AI_QUOTA_EXHAUSTED', 'AI services are temporarily overloaded. Please try again in a few minutes.')
    }
    try {
      const body = JSON.parse(text)
      throw new ApiError(res.status, body.error ?? 'API_ERROR', body.reason ?? text)
    } catch (e) {
      if (e instanceof ApiError) throw e
      throw new ApiError(res.status, 'API_ERROR', text || 'An unexpected error occurred.')
    }
  }

  if (res.status === 204) return undefined as T
  return res.json()
}
